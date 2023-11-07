/**
 * Server Startup
 *
 * in order to support supertest (Jest). HTTP-server & app are separated.
 *
 * Modes: (manageable by PM2, refer to PM2.config.js)
 *  1) combined mode: single instance running API server & job-runner (in DevMode)
 *  2) separated mode:
 *      - API server(s) run on external accessible port
 *      - SINGLE job-runner runs on NON-accessible port, dedicates to dispatch & execute (by internal & external runners)
 */

import type { BaseContext } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type { Request, Response } from 'express';
import http from 'http';
import mongoose from 'mongoose';

import app from './app';
import configLoader from './config/config-loader';
import jobRunner from './job-runner';
import { redisClient } from './redis';
import resolvers from './resolvers';
import socketServer from './socket-server';
import typeDefs from './typeDefs';
import { isDevMode } from './utils/environment';
import log from './utils/log';
import scheduler from './utils/scheduler';

export type ApolloContext = { req: Request; res: Response };

const { config } = configLoader;
const { NODE_APP_INSTANCE = 'X', JOB_RUNNER } = process.env;
const port = JOB_RUNNER === 'dedicated' ? config.port + 1001 : config.port;
const enableJobRunner = NODE_APP_INSTANCE === 'X' || (JOB_RUNNER === 'dedicated' && NODE_APP_INSTANCE === '0');

const httpServer = http.createServer(app); // create express HTTP server;

const apolloServer = new ApolloServer<ApolloContext>({
  typeDefs,
  resolvers,

  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginCacheControl({ defaultMaxAge: 3600, calculateHttpHeaders: false }), // Don't send the `cache-control` response header.
  ],
  csrfPrevention: true,
});

// start up server & listen on ipv4 only
(async () => {
  try {
    log(
      'info',
      `App Server (${NODE_APP_INSTANCE}) starting on ${port} (${enableJobRunner ? 'WITH' : 'WITHOUT'} jobRunner)`,
    );

    // connect to MongoDB
    const mongoDbUrl = config.server.mongo.url;
    await mongoose.connect(mongoDbUrl, { minPoolSize: 1, maxPoolSize: 20 });
    if (isDevMode) mongoose.set('debug', true);
    log('info', 'mongoose connected successfully');

    mongoose.connection.on('disconnected', () => log('warn', 'mongoose is disconnected'));
    mongoose.connection.on('reconnected', () => log('warn', 'mongoose is reconnected'));
    mongoose.connection.on('reconnectFailed', () => log('error', 'mongoose reconnectFailed'));
    mongoose.connection.on('all', () => log('error', 'mongoose encounters unknown error'));

    await Promise.all([
      apolloServer.start(),
      socketServer.start(httpServer),
      enableJobRunner && Promise.all([jobRunner.start(), scheduler.start()]),
    ]);

    // app.use('/graphql', cors<cors.CorsRequest>(), express.json(), expressMiddleware(apolloServer)); // TODO: WIP: app.ts handle cors & json() alread
    app.use('/graphql', expressMiddleware(apolloServer, { context: async ({ req, res }) => ({ req, res }) }));

    await Promise.all([
      new Promise<void>(resolve => httpServer.listen({ port, host: '0.0.0.0' }, resolve)),
      log('info', `App Server (${NODE_APP_INSTANCE}) started on ${port} @ ${new Date()}`), // POST a message to logger
    ]);

    process.send && process.send('ready'); // send message to PM2
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    log('error', `App Server (${NODE_APP_INSTANCE}) fails to start up on ${port} @ ${new Date()}`); // POST a message to logger
  }
})();

/**
 *    Graceful shutdown
 */
const gracefulShutdown = async () => {
  const now = new Date();
  try {
    redisClient.disconnect();
    jobRunner.stop();
    await Promise.race([
      new Promise<void>(resolve => setTimeout(resolve, 1000)),
      Promise.all([
        apolloServer.stop(),
        socketServer.stop(),
        new Promise<void>(resolve => httpServer.close(() => resolve())),
        mongoose.connection.close(false),
        log('info', `App Server (${NODE_APP_INSTANCE}) shutting down @ ${now}`),
      ]),
    ]);

    await log('info', `App Server (${NODE_APP_INSTANCE}) shuted down successfully @ ${now}`);
    process.exit(0);
  } catch (error) {
    await log('warn', `App Server (${NODE_APP_INSTANCE}) shuts down ERROR @ ${now}`);
    process.exit(1);
  }
};

/**
 * Process End Event
 * gracefully shutdown, closing database(s) connection pools
 */
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown); // PM2 stop signal
process.on('uncaughtException', gracefulShutdown); // prevent dirty exit on code-fault crashes:
