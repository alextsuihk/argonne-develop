import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { io } from 'socket.io-client';

import app from './app';
import configLoader from './config/config-loader';
import { apolloExpect, ApolloServer, FAKE, FAKE_LOCALE, jestSetup, jestTeardown } from './jest';
import type { TenantDocument } from './models/tenant';
import Tenant from './models/tenant';
import type { Id, UserDocument } from './models/user';
import { LIST_SOCKETS } from './queries/auth';
import socketServer from './socket-server';
import { mongoId } from './utils/helper';
import token from './utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

const generateAccessToken = async (user: UserDocument & Id) => {
  const { accessToken } = await token.createTokens(user, { ip: '127.0.0.1', ua: 'Jest-User-Agent', expiresIn: 5 });
  return accessToken;
};

// const refreshToken = async (userId: string) => token.signStrings([REFRESH_TOKEN, userId, randomString()], 5);

describe('Basic Test on Socket client connectivity', () => {
  let normalUser: (UserDocument & Id) | null;
  let userId: string;
  let normalServer: ApolloServer | null;
  let serverUrl: string;

  // setup WS & HTTP servers, and socket-client connection
  beforeAll(async () => {
    const httpServer = createServer(app).listen();
    [{ normalUser, normalServer }] = await Promise.all([
      jestSetup(['normal'], { apollo: true }),
      socketServer.start(httpServer),
    ]);
    const serverAddr = httpServer.address() as AddressInfo;
    serverUrl = `http://[${serverAddr.address}]:${serverAddr.port}`;
    userId = normalUser!._id.toString();
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

    const accessToken = await generateAccessToken(normalUser!);
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

    const accessToken = await generateAccessToken({ ...normalUser!, _id: mongoId() });

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

  test('should list two socket clients if two clients has joined', async () => {
    expect.assertions(3 + 1);

    const socket1 = io(serverUrl);
    const token1 = await generateAccessToken(normalUser!);
    socket1.emit('JOIN', { token: token1 });

    const socket2 = io(serverUrl);
    const token2 = await generateAccessToken(normalUser!);
    socket2.emit('JOIN', { token: token2 });

    await new Promise(resolve => setTimeout(resolve, 200));

    // REST-ful API
    const res = await axios.get(`${serverUrl}/api/auth/listSockets`, {
      headers: { 'Jest-User': userId },
      timeout: DEFAULTS.AXIOS_TIMEOUT,
    });
    expect(res.data).toEqual({ data: [expect.any(String), expect.any(String)] });
    expect(res.status).toBe(200);

    // Apollo
    const res2 = await normalServer!.executeOperation({ query: LIST_SOCKETS });
    apolloExpect(res2, 'data', { listSockets: [expect.any(String), expect.any(String)] });

    const intersectedSocketIds = res2.data!.listSockets.filter(x => res.data.data.includes(x));

    // both responses (from RESTful & apollo) should match
    expect(intersectedSocketIds.length).toBe(2);

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
