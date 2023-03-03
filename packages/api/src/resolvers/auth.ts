/**
 * Resolver: Auth
 *
 */

import type { Ctx } from '../apollo';
import authController from '../controllers/auth';
import { tryCatch } from './root';

type unk = unknown;

const {
  deregister,
  impersonateStart,
  impersonateStop,
  listSockets,
  listTokens,
  login,
  loginToken,
  loginWithStudentId,
  loginWithToken,
  logout,
  logoutOther,
  oAuth2,
  oAuth2Connect,
  oAuth2Disconnect,
  register,
  renewToken,
} = authController;

export default {
  Query: {
    listSockets: async (_: unk, args: unk, { req }: Ctx) => listSockets(req),
    listTokens: async (_: unk, __: unk, { req }: Ctx) => tryCatch(() => listTokens(req), true),
  },

  Mutation: {
    deregister: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => deregister(req, res, args), true),
    impersonateStart: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => impersonateStart(req, args), true),
    impersonateStop: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => impersonateStop(req, args), true),
    login: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => login(req, res, args), true),
    loginToken: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => loginToken(req, res, args), true),
    loginWithStudentId: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => loginWithStudentId(req, res, args), true),
    loginWithToken: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => loginWithToken(req, res, args), true),
    logout: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => logout(req, res, args), true),
    logoutOther: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => logoutOther(req, args), true),
    oAuth2: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => oAuth2(req, args), true),
    oAuth2Connect: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => oAuth2Connect(req, args), true),
    oAuth2Disconnect: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => oAuth2Disconnect(req, args), true),
    register: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => register(req, res, args), true),
    renewToken: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => renewToken(req, res, args), true),
  },
};
