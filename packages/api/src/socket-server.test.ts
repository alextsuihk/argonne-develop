import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { io } from 'socket.io-client';

import app from './app';
import { apolloExpect, ApolloServer, FAKE, jestSetup, jestTeardown } from './jest';
import { LIST_SOCKETS } from './queries/auth';
import socketServer from './socket-server';
import token from './utils/token';

const { MSG_ENUM } = LOCALE;

describe('Basic Test on Socket client connectivity', () => {
  let userId: string;
  let userServer: ApolloServer | null;
  let serverUrl: string;

  // setup WS & HTTP servers, and socket-client connection
  beforeAll(async () => {
    const httpServer = createServer(app).listen();
    const [{ normalUser, normalServer }] = await Promise.all([
      jestSetup(['normal'], { apollo: true }),
      socketServer.start(httpServer),
    ]);
    const serverAddr = httpServer.address() as AddressInfo;
    serverUrl = `http://[${serverAddr.address}]:${serverAddr.port}`;
    userServer = normalServer;
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

    const accessToken = await token.sign({ userId }, '5s');

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
          expect(receivedMsg).toEqual({ token: accessToken, error: { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR } });
          clearTimeout(timer);
          resolve();
        });
        socket.emit('JOIN', { token: accessToken });
      }),
    ]);
    socket.close();
  });

  test('should report error when try to join Socket server WITHOUT userId', async () => {
    expect.assertions(1);
    const socket = io(serverUrl);

    const accessToken = await token.sign({ id: 'invalid info' }, '5s');

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
    expect.assertions(3);

    const socket1 = io(serverUrl);
    const token1 = await token.sign({ userId }, '5s');
    socket1.emit('JOIN', { token: token1 });

    const socket2 = io(serverUrl);
    const token2 = await token.sign({ userId }, '5s');
    socket2.emit('JOIN', { token: token2 });

    await new Promise(resolve => setTimeout(resolve, 200));

    // REST-ful API
    const res = await axios.get(`${serverUrl}/api/auth/listSockets`, {
      headers: { 'Jest-User': userId },
      timeout: 1000,
    });
    expect(res.data).toEqual({ data: [expect.any(String), expect.any(String)] });
    expect(res.status).toBe(200);

    // Apollo
    const res2 = await userServer!.executeOperation({ query: LIST_SOCKETS });
    apolloExpect(res2, 'data', { listSockets: [expect.any(String), expect.any(String)] });

    socket1.close();
    socket2.close();
  });
});
