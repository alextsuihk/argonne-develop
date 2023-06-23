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
  oAuth2Link,
  oAuth2Unlink,
  register,
  renewToken,
  update,
} = authController;

export default {
  Query: {
    listSockets: async (_: unk, args: unk, { req }: Ctx) => listSockets(req),
    listTokens: async (_: unk, __: unk, { req }: Ctx) => tryCatch(() => listTokens(req), true),
  },

  Mutation: {
    addApiKey: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => update(req, args, 'addApiKey')),
    // TODO
    // addPaymentMethod: async (_: unk, args: unk, { req, res }: Ctx) =>
    //   tryCatch(() => update(req, args, 'addPaymentMethod')),
    deregister: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => deregister(req, res, args), true),
    impersonateStart: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => impersonateStart(req, res, args), true),
    impersonateStop: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => impersonateStop(req, res, args), true),
    login: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => login(req, res, args), true),
    loginToken: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => loginToken(req, res, args), true),
    loginWithStudentId: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => loginWithStudentId(req, res, args), true),
    loginWithToken: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => loginWithToken(req, res, args), true),
    logout: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => logout(req, res, args), true),
    logoutOther: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => logoutOther(req, args), true),
    oAuth2: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => oAuth2(req, res, args), true),
    oAuth2Link: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => oAuth2Link(req, args)),
    oAuth2Unlink: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => oAuth2Unlink(req, args)),
    register: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => register(req, res, args), true),
    removeApiKey: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => update(req, args, 'removeApiKey')),
    removePaymentMethod: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => update(req, args, 'removePaymentMethod')),
    renewToken: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => renewToken(req, res, args), true),
    updateLocale: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => update(req, args, 'updateLocale')),
    updateNetworkStatus: async (_: unk, args: unk, { req, res }: Ctx) =>
      tryCatch(() => update(req, args, 'updateNetworkStatus')),
    updateUserProfile: async (_: unk, args: unk, { req, res }: Ctx) => tryCatch(() => update(req, args)),
  },
};
