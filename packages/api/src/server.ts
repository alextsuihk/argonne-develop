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

import { createServer } from 'http';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';

import apollo from './apollo';
import app from './app';
import configLoader from './config/config-loader';
import jobRunner from './job-runner';
import Tenant from './models/tenant';
import { redisClient } from './redis';
import socketServer from './socket-server';
import { isDevMode } from './utils/environment';
import log from './utils/log';
import scheduler from './utils/scheduler';

const { config, DEFAULTS } = configLoader;
const { NODE_APP_INSTANCE = 'X', JOB_RUNNER } = process.env;
const port = JOB_RUNNER === 'dedicated' ? config.port + 1001 : config.port;
const enableJobRunner = NODE_APP_INSTANCE === 'X' || (JOB_RUNNER === 'dedicated' && NODE_APP_INSTANCE === '0');

const httpServer = createServer(app); // create express HTTP server;
const satelliteSocket = config.mode === 'SATELLITE' ? io(DEFAULTS.ARGONNE_URL) : null;

const satelliteConnectToHub = async () => {
  if (satelliteSocket) {
    let connected = false;
    while (!connected) {
      const tenant = await Tenant.findPrimary();
      if (tenant && tenant.apiKey) {
        satelliteSocket.emit('JOIN_SATELLITE', { tenant: tenant._id.toString(), apiKey: tenant.apiKey });
        connected = true;
      }

      await new Promise(resolve => setTimeout(resolve, DEFAULTS.JOB_RUNNER.INTERVAL)); // wait for tenant update (with valid apiKey)
    }
  }
};

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
      apollo.start(),
      socketServer.start(httpServer),
      enableJobRunner && Promise.all([jobRunner.start(), scheduler.start()]),
    ]);

    await Promise.all([
      new Promise<void>(resolve => httpServer.listen({ port, host: '0.0.0.0' }, resolve)),
      log('info', `App Server (${NODE_APP_INSTANCE}) started on ${port} @ ${new Date()}`), // POST a message to logger
    ]);

    process.send && process.send('ready'); // send message to PM2

    if (config.mode === 'SATELLITE') satelliteConnectToHub(); // no need to await
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
    satelliteSocket?.close();
    await Promise.race([
      new Promise<void>(resolve => setTimeout(resolve, 1000)),
      Promise.all([
        jobRunner.stop(),
        socketServer.stop(),
        new Promise<void>(resolve => httpServer.close(() => resolve())),
        mongoose.connection.close(false),
        apollo.stop(), // just for safety, this.stop() is called at SIGINT or SIGTERM (stopOnTerminationSignals)
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
