import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { io } from 'socket.io-client';

import app from './app';
import configLoader from './config/config-loader';
import { apolloExpect, apolloContext, apolloTestServer, FAKE, FAKE_LOCALE, jestSetup, jestTeardown } from './jest';
import type { TenantDocument } from './models/tenant';
import Tenant from './models/tenant';
import type { UserDocument } from './models/user';
import { LIST_SOCKETS } from './queries/auth';
import socketServer from './socket-server';
import { mongoId, sleep } from './utils/helper';
import token from './utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

const generateAccessToken = async (user: UserDocument) => {
  const { accessToken } = await token.createTokens(user, { ip: '127.0.0.1', ua: 'Jest-User-Agent', expiresIn: 5 });
  return accessToken;
};

// const refreshToken = async (userId: string) => token.signStrings([REFRESH_TOKEN_PREFIX, userId, randomString()], 5);

describe('Basic Test on Socket client connectivity', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;
  let serverUrl: string;

  // setup WS & HTTP servers, and socket-client connection
  beforeAll(async () => {
    const httpServer = createServer(app).listen();
    [jest] = await Promise.all([jestSetup(), socketServer.start(httpServer)]);
    const serverAddr = httpServer.address() as AddressInfo;
    serverUrl = `http://[${serverAddr.address}]:${serverAddr.port}`;
  });

  afterAll(async () => Promise.all([jestTeardown(), socketServer.stop()]));

  test('should receive a loopback message when emitting to server', async () => {
    expect.assertions(1);

    const socket = io(serverUrl);

    let timer: NodeJS.Timeout;
    await Promise.race([
      new Promise(resolve => {
        timer = setTimeout(resolve, 200);
      }), // timeout
      new Promise<void>(resolve => {
        socket.once('LOOPBACK', (receivedMsg: string) => {
          expect(receivedMsg).toBe(FAKE);
          clearTimeout(timer);
          resolve();
        });
        socket.emit('LOOPBACK', FAKE);
      }),
    ]);
    socket.close();
  });

  test('should receive a "Welcome" when joining Socket server', async () => {
    expect.assertions(1);
    const socket = io(serverUrl);

    const accessToken = await generateAccessToken(jest.normalUser!);
    let timer: NodeJS.Timeout;
    await Promise.race([
      new Promise(resolve => {
        timer = setTimeout(resolve, 200);
      }), // timeout
      new Promise<void>(resolve => {
        socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
          expect(receivedMsg).toEqual({ socket: expect.any(String), token: accessToken, msg: 'Welcome !' });
          clearTimeout(timer);
          resolve();
        });
        socket.emit('JOIN', { token: accessToken });
      }),
    ]);
    socket.close();
  });

  test('should report error when trying to join Socket server WITH invalid JWT', async () => {
    expect.assertions(1);
    const socket = io(serverUrl);

    const accessToken = 'An-Invalid-JWT-Token';

    let timer: NodeJS.Timeout;
    await Promise.race([
      new Promise(resolve => {
        timer = setTimeout(resolve, 200);
      }), // timeout
      new Promise<void>(resolve => {
        socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
          expect(receivedMsg).toEqual({
            token: accessToken,
            error: { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR },
          });
          clearTimeout(timer);
          resolve();
        });
        socket.emit('JOIN', { token: accessToken });
      }),
    ]);
    socket.close();
  });

  test('should report error when try to join Socket server wrong userId', async () => {
    expect.assertions(1);
    const socket = io(serverUrl);

    const accessToken = await generateAccessToken({ ...jest.normalUser!, _id: mongoId() });

    let timer: NodeJS.Timeout;
    await Promise.race([
      new Promise(resolve => {
        timer = setTimeout(resolve, 200);
      }), // timeout
      new Promise<void>(resolve => {
        socket.once('JOIN', (receivedMsg: { error?: string; msg?: string; token?: string }) => {
          expect(receivedMsg).toEqual({ error: 'Invalid ID', token: accessToken });
          clearTimeout(timer);
          resolve();
        });
        socket.emit('JOIN', { token: accessToken });
      }),
    ]);
    socket.close();
  });

  test.only('should list two socket clients if two clients has joined', async () => {
    expect.assertions(3 + 1);

    const socket1 = io(serverUrl);
    const token1 = await generateAccessToken(jest.normalUser!);
    socket1.emit('JOIN', { token: token1 });

    const socket2 = io(serverUrl);
    const token2 = await generateAccessToken(jest.normalUser!);
    socket2.emit('JOIN', { token: token2 });

    await sleep(200);

    // REST-ful API
    const res = await axios.get(`${serverUrl}/api/auth/listSockets`, {
      headers: { 'Jest-User': jest.normalUser._id.toString() },
      timeout: DEFAULTS.AXIOS_TIMEOUT,
    });
    expect(res.data).toEqual({ data: [expect.any(String), expect.any(String)] });
    expect(res.status).toBe(200);

    // Apollo
    const res2 = await apolloTestServer.executeOperation<{ listSockets: string[] }>(
      { query: LIST_SOCKETS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'data', { listSockets: [expect.any(String), expect.any(String)] });

    // mak sure if 100% intersected
    const intersectedSocketIds =
      res2.body.kind === 'single'
        ? res2.body.singleResult.data!.listSockets.filter(x => res.data.data.includes(x))
        : null;

    // both responses (from RESTful & apollo) should match
    expect(intersectedSocketIds!.length).toBe(2);

    socket1.close();
    socket2.close();
  });

  test('should pass when satellite joining hub', async () => {
    expect.assertions(1);

    const socket = io(serverUrl);

    const tenant = await Tenant.create<Partial<TenantDocument>>({
      code: FAKE,
      name: FAKE_LOCALE,
      school: mongoId(),
      apiKey: FAKE,
      satelliteUrl: 'https://satellite.com',
    });
    const tenantId = tenant._id.toString();

    let timer: NodeJS.Timeout;
    await Promise.race([
      new Promise(resolve => {
        timer = setTimeout(resolve, 200);
      }), // timeout
      new Promise<void>(resolve => {
        socket.once('JOIN_SATELLITE', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
          expect(receivedMsg).toEqual({ socket: expect.any(String), tenant: tenantId, msg: 'Welcome !' });
          clearTimeout(timer);
          resolve();
        });
        socket.emit('JOIN_SATELLITE', { tenant: tenantId, apiKey: tenant.apiKey });
      }),
    ]);

    // clean up
    socket.close();
    await Tenant.deleteOne({ _id: tenant._id });
  });
});
