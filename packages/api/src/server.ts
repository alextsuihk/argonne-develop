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

import './config/config-loader';

import axios from 'axios';
import { createServer } from 'http';
import mongoose from 'mongoose';

import apollo from './apollo';
import app from './app';
import configLoader from './config/config-loader';
import jobRunner from './job-runner';
import DatabaseEvent from './models/event/database';
import type { TenantDocument } from './models/tenant';
import Tenant from './models/tenant';
import { redisClient } from './redis';
import socketServer from './socket-server';
import { isDevMode, isProdMode } from './utils/environment';
import log from './utils/log';
import scheduler from './utils/scheduler';

type AxiosResponse = { tenant: TenantDocument };

const { config, DEFAULTS } = configLoader;
const { NODE_APP_INSTANCE = 'X', JOB_RUNNER } = process.env;
const port = JOB_RUNNER === 'dedicated' ? config.port + 1001 : config.port;
const enableJobRunner = NODE_APP_INSTANCE === 'X' || (JOB_RUNNER === 'dedicated' && NODE_APP_INSTANCE === '0');

const httpServer = createServer(app); // create express HTTP server;

//! TODO: move to controller
// initialize satellite
const initializeSatellite = async () => {
  const tenantCount = await Tenant.countDocuments();
  if (tenantCount > 0) return; // either ready (2 tenants) or initializing (1 tenant)

  const { status, data } = await axios.post<AxiosResponse>(`${DEFAULTS.ARGONNE_URL}/api/api/sync`, {
    apiKey: config.satelliteApiKey,
    timestamp: Date.now(),
    version: config.buildInfo,
  });

  // TODO: receive URL with JSON file, read & save documents

  if (status !== 200) {
    log('error', `fail to initialize satellite (apiKey: ${config.satelliteApiKey})`);
  } else {
    await Promise.all([
      Tenant.create(data.tenant), // save the primary tenant
      DatabaseEvent.log(null, `/tenants/${data.tenant._id}`, 'start satellite initialization'),
    ]);
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
    // if (isDevMode) mongoose.set('debug', true); // TODO: re-enable
    log('info', 'mongoose connected successfully');

    mongoose.connection.on('disconnected', () => log('warn', 'mongoose is disconnected'));
    mongoose.connection.on('reconnected', () => log('warn', 'mongoose is reconnected'));
    mongoose.connection.on('reconnectFailed', () => log('error', 'mongoose reconnectFailed'));
    mongoose.connection.on('all', () => log('error', 'mongoose encounters unknown error'));

    if (
      isProdMode &&
      (config.mode === 'SATELLITE' || JOB_RUNNER !== 'dedicated') &&
      (NODE_APP_INSTANCE === 'X' || NODE_APP_INSTANCE === '0')
    )
      await initializeSatellite();

    await Promise.all([
      apollo.start(),
      socketServer.start(httpServer),
      enableJobRunner && jobRunner.start(),
      enableJobRunner && scheduler.start(),
    ]);

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
    await Promise.race([
      new Promise<void>(resolve => setTimeout(resolve, 1000)),
      Promise.all([
        jobRunner.stop(),
        socketServer.stop(),
        new Promise<void>(resolve => httpServer.close(_ => resolve())),
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
