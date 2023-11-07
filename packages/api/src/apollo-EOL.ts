/**
 * Apollo Server & TestServer
 *
 */

import { ApolloServer } from '@apollo/server';

import app from './app';
import configLoader from './config/config-loader';
import type { UserDocument } from './models/user';
import resolvers from './resolvers';
import typeDefs from './typeDefs';
import { isDevMode } from './utils/environment';
import { latestSchoolHistory } from './utils/helper';
// export type { ExpressContext } from 'apollo-server-express';
// export { ApolloServer } from 'apollo-server-express';

// const { DEFAULTS } = configLoader;

// export const apolloServer = new ApolloServer({
//   typeDefs,
//   resolvers,
//   context: ({ req, res }) => ({ req: { ...req, isApollo: true }, res }), // inject isApollo for controllers
//   csrfPrevention: true,

//   // TODO: re-enable later
//   // apollo: {
//   //   key: process.env.APOLLO_KEY,
//   //   graphVariant: nodeEnv,
//   // },

//   debug: isDevMode,
// });

// /**
//  * Start Apollo Server
//  */
// const start = async (): Promise<void> => {
//   await apolloServer.start();
//   apolloServer.applyMiddleware({ app, cors: true });
// };

// /**
//  * Stop Apollo Server
//  * by default, "stopOnTerminationSignals", stop() is called at SIGINT or SIGTERM, and drainHttpServer
//  */
// const stop = async (): Promise<void> => apolloServer.stop();

/**
 * Apollo Test Server for jest
 */
// export const testServer = (emulatedUser?: UserDocument | null): ApolloServer =>
//   new ApolloServer({
//     typeDefs,
//     resolvers,
//     context: () => ({
//       req: {
//         isApollo: true,
//         ip: '127.0.0.1',
//         ua: 'Apollo-Jest-User-Agent',
//         userFlags: emulatedUser?.flags,
//         userId: emulatedUser?._id,
//         userLocale: emulatedUser?.locale,
//         userName: emulatedUser?.name,
//         userRoles: emulatedUser?.roles,
//         userTenants: emulatedUser?.tenants.map(t => t.toString()) ?? [],
//         ...(emulatedUser?.schoolHistories[0] && { userExtra: latestSchoolHistory(emulatedUser.schoolHistories) }),
//       },
//       // setCookie() & clearCookie() are needed for authController's compatibility with Express cookie usage
//       res: {
//         cookie: (_name: string, _value: string, _opt: unknown) => {
//           console.log(`apollo.js: setCooke() ${_name} ${_value} ${_opt}`);
//         },
//         clearCookie: (_name: string) => {
//           console.log(`apollo.js: clearCookie()  ${_name}`);
//         },
//       },
//     }),
//   });

import type { Request, Response } from 'express';
import http from 'http';
import mongoose from 'mongoose';
import type { BaseContext } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
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

export interface ApolloContext extends BaseContext {
  req: Request;
  res: Response;
}

const apolloServer = new ApolloServer<ApolloContext>({
  typeDefs,
  resolvers,

  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginCacheControl({ defaultMaxAge: 3600, calculateHttpHeaders: false }), // Don't send the `cache-control` response header.
  ],
  csrfPrevention: true,
});

export default { start, stop };
