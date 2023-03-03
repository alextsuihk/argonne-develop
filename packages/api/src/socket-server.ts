/**
 * Socket.IO Server
 */

import type { DocumentSync } from '@argonne/common';
import { LOCALE, NOTIFY_EVENTS } from '@argonne/common';
import { createAdapter } from '@socket.io/redis-adapter'; //! NOTE: need to use version 7.1.0
import type { Server as HttpServer } from 'http';
import Redis from 'ioredis';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

import configLoader from './config/config-loader';
import User from './models/user';
import { isDevMode } from './utils/environment';
import log from './utils/log';
import token from './utils/token';

type NotifyEvent = (typeof NOTIFY_EVENTS)[number];

const { USER } = LOCALE.DB_ENUM;
const { config } = configLoader;

let io: Server | null; // Socket.IO server instance
const pubClient = new Redis(config.server.redis.url);
const subClient = pubClient.duplicate();

/**
 * Emit Message to all socket clients of a SINGLE User
 */
const emit = (userIds: string[], event: NotifyEvent, payload?: DocumentSync): void =>
  userIds.forEach(userId => io?.to(`user:${userId}`).emit<NotifyEvent>(event, payload)); // socket-server is not available in test-mode

const listSockets = async (userId: string) => (io ? Array.from(await io.in(`user:${userId}`).allSockets()) : []); // socket-server is not available in test-mode

/**
 * Start Socket.io Server
 */
const start = async (httpServer: HttpServer): Promise<void> => {
  // when client is joining
  const clientJoining = async (socket: Socket, msgToken: string): Promise<void> => {
    // join Socket.IO Client to (`user:${userId}`) room, notify friends
    try {
      const { userId } = await token.verify<{ userId?: string }>(msgToken);

      console.log('socketServer:join() >>>> welcome ', userId, socket.id);

      const user = await User.findOneAndUpdate({ _id: userId, status: USER.STATUS.ACTIVE }, { isOnline: true }).lean();
      if (!userId || !user) throw 'Invalid ID';

      await socket.join(`user:${userId}`); // join room
      socket.emit('JOIN', { socket: socket.id, token: msgToken, msg: 'Welcome !' }); // send Welcome message back to socket

      if (user.contacts.length && !user.networkStatus) {
        emit(
          user.contacts.map(c => c.user.toString()),
          'CONTACT_STATUS',
          { userIds: [userId], userNetworkStatus: user.networkStatus ?? USER.NETWORK_STATUS.ONLINE },
        ); // notify friends
      }
    } catch (error) {
      socket.emit('JOIN', { token: msgToken, error }); // send error message back
    }
  };

  // client (starts) disconnecting
  const clientLeaving = async (socket: Socket): Promise<void> => {
    const userId = Array.from(socket.rooms)
      .find(room => room.startsWith('user:'))
      ?.split(':')[1]; // get roomId starting with 'user:'. userId is undefined for improper joining

    console.log('socketServer:leave() >>>> GoodBye ', userId, socket.rooms);

    if (!userId) return;
    const userSocketIds = await listSockets(userId);
    if (userSocketIds.length > 1) return; // safety check: skip if other user socket connections exist

    try {
      const [user] = await Promise.all([
        User.findOneAndUpdate({ _id: userId, status: USER.STATUS.ACTIVE }, { isOnline: false }),
        socket.leave(`user:${userId}`), // leave room
      ]);
      if (!user) throw 'Invalid ID';

      if (user.contacts.length && !user.networkStatus)
        emit(
          user.contacts.map(c => c.user.toString()),
          'CONTACT_STATUS',
          { userIds: [userId], userNetworkStatus: USER.NETWORK_STATUS.OFFLINE },
        ); // notify friends
    } catch (error) {
      log('warn', 'clientLeaving fails', { userId });
    }
  };

  io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: isDevMode ? { origin: 'http://localhost:3000', methods: ['GET', 'POST'] } : {},
  });

  io.on('connection', (socket: Socket) => {
    console.log('socketServer: io.on("connection")', socket.id); // TODO
    socket.on('disconnecting', () => clientLeaving(socket)); // listening to 'disconnecting'
    socket.on('timeout', () => clientLeaving(socket)); // listening to 'timeout'

    socket.on('JOIN', (msg: { token: string; status: string }) => clientJoining(socket, msg.token));
    socket.on('LOOPBACK', (msg: unknown) => socket.emit('LOOPBACK', msg)); // primarily for JEST
  });
};

/**
 * Shut down Socket.io Server
 */
const stop = async (): Promise<void> => {
  await new Promise<void>(resolve => (io ? io.close(_ => resolve()) : resolve()));
  pubClient.disconnect();
  subClient.disconnect();
};

export default { emit, listSockets, start, stop };
