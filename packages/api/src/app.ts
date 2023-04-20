/**
 * Main App
 *
 * Note: Express App & Server Listener are separated into two files (app.js & server.js) to support JEST mock test
 *   app.js: Express JS app
 *   server.js: listen to port
 *
 * ! Please read the README.md for details
 */

import { LOCALE } from '@argonne/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';

import type { ControllerError } from './error';
import { formatError } from './error';
import { decodeHeader } from './middleware/auth';
import redisCache from './redis';
import routes from './routes';
import { isDevMode, isProdMode } from './utils/environment';

const { MSG_ENUM } = LOCALE;

// instantiate Express
const app = express();

// ! Helmet should be the first middleware (wrapping around everything)
app.use(helmet({ crossOriginEmbedderPolicy: !isDevMode, contentSecurityPolicy: !isDevMode })); // to support Apollo Studio in devMode

app.use(express.json());
app.use(cors({ credentials: true, origin: ['http://localhost:3000'] })); // for development mode
app.use(compression());
app.set('trust proxy', isProdMode); // to populate req.ip & req.ips (even behind nginx reverse proxy)

// send statusCode 500 if Mongoose or Redis is not ready (prevent further operations); for Jest, wait a while for DB connections
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) throw next({ statusCode: 500, code: MSG_ENUM.MONGOOSE_NOT_READY });
  if (redisCache.getStatus() !== 'ready') throw next({ statusCode: 500, code: MSG_ENUM.REDIS_NOT_READY });
  next();
});

// decode authentication or apiKey header (jwt)
app.use(cookieParser());
app.use(decodeHeader);

if (isDevMode) app.use(morgan('dev')); // enable Morgan logger

// configure express rate limit
if (isProdMode) {
  app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 60 })); // limit each IP to 50 requests per 1min
  app.use('/api/logs', rateLimit({ windowMs: 1 * 60 * 1000, max: 5 })); // limit each IP to 5 requests per 1min
}

routes(app); // register REST API routes

// special condition for allowing Apollo Studio redirect
if (isProdMode)
  app.use(() => {
    throw { statusCode: 404 };
  });

/**
 * Error Handling
 *
 * encapsulate error message, match the format of Express-Validator, { errors: [{code: number}] }
 */
app.use(async (err: ControllerError, req: Request, res: Response, _next: NextFunction) => {
  const error = await formatError(req, err);
  res.status(error.statusCode).json(error);
});

export default app;
