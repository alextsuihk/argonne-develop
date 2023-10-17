/**
 * Socket.IO Server
 */

import { LOCALE } from '@argonne/common';
import { createAdapter } from '@socket.io/redis-adapter'; //! NOTE: need to use version 7.1.0
import type { Server as HttpServer } from 'http';
import Redis from 'ioredis';
import type { Types } from 'mongoose';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

import type { SyncJobDocument } from './models/sync-job';
import { SYNC_JOB_CHANNEL } from './models/sync-job';
import { findSatelliteTenantById } from './models/tenant';
import User from './models/user';
import { redisClient } from './redis';
import { isDevMode } from './utils/environment';
import log from './utils/log';
import token from './utils/token';

const { USER } = LOCALE.DB_ENUM;

let io: Server | null; // Socket.IO server instance
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Emit Message to all socket clients of a SINGLE User
 */
const emit = ({ userIds, event, msg }: NonNullable<SyncJobDocument['notify']>): void =>
  Array.from(new Set(userIds.map(u => u.toString()))).forEach(
    userId => io?.to(`user:${userId}`).emit<typeof event>(event, msg),
  ); // socket-server is not available in test-mode (io is null for test-mode)

/**
 * List SocketIds of a users
 */
const listSockets = async (userId: string | Types.ObjectId) =>
  io ? (await io.in(`user:${userId}`).fetchSockets()).map(socket => socket.id) : []; // socket-server is not available in test-mode

/**
 * Start Socket.io Server
 */
const start = async (httpServer: HttpServer): Promise<void> => {
  pubClient = redisClient.duplicate();
  subClient = pubClient.duplicate();

  // when client is joining
  const clientJoining = async (socket: Socket, accessToken: string): Promise<void> => {
    // join Socket.IO Client to (`user:${userId}`) room, notify friends
    try {
      const { userId } = await token.verifyAuth(accessToken);

      console.log('DEBUG>> socketServer:join() >>>> welcome ', userId, socket.id);

      const user = await User.findOneAndUpdate({ _id: userId, status: USER.STATUS.ACTIVE }, { isOnline: true }).lean();
      if (!userId || !user) throw 'Invalid ID';

      await socket.join(`user:${userId}`); // join room
      socket.emit('JOIN', { socket: socket.id, token: accessToken, msg: 'Welcome !' }); // send Welcome message back to socket

      if (user.contacts.length && !user.availability) {
        emit({
          userIds: user.contacts.map(c => c.user),
          event: 'CONTACT-STATUS',
          msg: `${userId}#${user.availability ?? USER.AVAILABILITY.ONLINE}`,
        }); // notify friends
      }
    } catch (error) {
      socket.emit('JOIN', { token: accessToken, error }); // send error message back
    }
  };

  const satelliteJoining = async (socket: Socket, tenantId: string, apiKey: string): Promise<void> => {
    const tenant = await findSatelliteTenantById(tenantId);

    if (tenant?.apiKey === apiKey) {
      redisClient.publish(SYNC_JOB_CHANNEL, tenantId); // satellite has (re)joined, initiate sync-jobs
      socket.emit('JOIN_SATELLITE', { socket: socket.id, tenant: tenantId, msg: 'Welcome !' }); // send Welcome message back to socket
    }
  };

  // client (starts) disconnecting
  const clientLeaving = async (socket: Socket): Promise<void> => {
    const userId = Array.from(socket.rooms)
      .find(room => room.startsWith('user:'))
      ?.split(':')[1]; // get roomId starting with 'user:'. userId is undefined for improper joining

    console.log('DEBUG>> socketServer:leave() >>>> GoodBye ', userId, socket.rooms);

    if (!userId) return; // for case of satellite-leaving

    const userSocketIds = await listSockets(userId);
    if (userSocketIds.length > 1) return; // safety check: skip if other user socket connections exist

    try {
      const [user] = await Promise.all([
        User.findOneAndUpdate({ _id: userId, status: USER.STATUS.ACTIVE }, { isOnline: false }),
        socket.leave(`user:${userId}`), // leave room
      ]);
      if (!user) throw 'Invalid ID';

      if (user.contacts.length && !user.availability)
        emit({
          userIds: user.contacts.map(c => c.user),
          event: 'CONTACT-STATUS',
          msg: `${userId}#${USER.AVAILABILITY.OFFLINE}`,
        }); // notify friends
    } catch (error) {
      log('warn', 'clientLeaving fails', { userId });
    }
  };

  io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient),
    cors: isDevMode ? { origin: 'http://localhost:3000', methods: ['GET', 'POST'] } : {},
  });

  io.on('connection', (socket: Socket) => {
    console.log('DEBUG>> socketServer: io.on("connection")', socket.id);
    socket.on('disconnecting', () => clientLeaving(socket)); // listening to 'disconnecting'
    socket.on('timeout', () => clientLeaving(socket)); // listening to 'timeout'

    socket.on('JOIN', (msg: { token: string; status: string }) => clientJoining(socket, msg.token));
    socket.on('JOIN_SATELLITE', (msg: { tenant: string; apiKey: string }) =>
      satelliteJoining(socket, msg.tenant, msg.apiKey),
    );
    socket.on('LOOPBACK', (msg: unknown) => socket.emit('LOOPBACK', msg)); // primarily for JEST
  });
};

/**
 * Shut down Socket.io Server
 */
const stop = async (): Promise<void> => {
  await new Promise<void>(resolve => (io ? io.close(() => resolve()) : resolve()));
  pubClient?.disconnect();
  subClient?.disconnect();
};

export default { emit, listSockets, start, stop };
