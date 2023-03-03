/**
 * Apollo Server & TestServer
 *
 */

import { ApolloServer } from 'apollo-server-express';
import type { LeanDocument } from 'mongoose';

import app from './app';
import configLoader from './config/config-loader';
import type { UserDocument } from './models/user';
import resolvers from './resolvers';
import typeDefs from './typeDefs';
import { isDevMode } from './utils/environment';
import { idsToString } from './utils/helper';
export type { ExpressContext as Ctx } from 'apollo-server-express';
// export type { ExpressContext } from 'apollo-server-express';
export { ApolloServer } from 'apollo-server-express';

const { DEFAULTS } = configLoader;

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => ({ req: { ...req, isApollo: true }, res }), // inject isApollo for controllers
  csrfPrevention: true,

  // TODO: re-enable later
  // apollo: {
  //   key: process.env.APOLLO_KEY,
  //   graphVariant: nodeEnv,
  // },

  debug: isDevMode,
});

/**
 * Start Apollo Server
 */
const start = async (): Promise<void> => {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });
};

/**
 * Stop Apollo Server
 * by default, "stopOnTerminationSignals", stop() is called at SIGINT or SIGTERM, and drainHttpServer
 */
const stop = async (): Promise<void> => apolloServer.stop();

/**
 * Apollo Test Server for jest
 */
export const testServer = (emulatedUser?: LeanDocument<UserDocument> | null): ApolloServer =>
  new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({
      req: {
        isApollo: true,
        ip: '127.0.0.1',
        ua: 'Apollo-Jest-User-Agent',
        userFlags: emulatedUser?.flags,
        userId: emulatedUser?._id.toString(),
        userLocale: emulatedUser?.locale,
        userName: emulatedUser?.name,
        userRoles: emulatedUser?.roles,
        userScopes: emulatedUser?.scopes,
        userTenants: idsToString(emulatedUser?.tenants ?? []),
        ...(emulatedUser?.histories[0] && {
          userExtra: {
            year: emulatedUser?.histories[0].year,
            school: emulatedUser?.histories[0].school.toString(),
            level: emulatedUser?.histories[0].level.toString(),
            ...(emulatedUser?.histories[0].schoolClass && { schoolClass: emulatedUser?.histories[0].schoolClass }),
          },
        }),
      },
      // setCookie() & clearCookie() are needed for authController's compatibility with Express cookie usage
      res: {
        cookie: (_name: string, _value: string, _opt: unknown) => {
          console.log(`apollo.js: setCooke() ${_name} ${_value} ${_opt}`);
        },
        clearCookie: (_name: string) => {
          console.log(`apollo.js: clearCookie()  ${_name}`);
        },
      },
    }),
  });

export default { start, stop };
