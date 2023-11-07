/**
 * Resolver: Auth
 *
 */

import type { ApolloContext } from '../server';
import authController from '../controllers/auth';
import { authServiceToken } from '../controllers/auth-service';
import { tryCatch } from './root';

type unk = unknown;

const {
  deregister,
  isEmailAvailable,
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
  register,
  renewToken,
  sendEmailVerification,
  sendMessengerVerification,
  update,
  verifyEmail,
  addApiKey,
  removeApiKey,
  listApiKeys,
} = authController;

export default {
  Query: {
    authServiceToken: (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => authServiceToken(req, args)),
    isEmailAvailable: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => isEmailAvailable(req, args)),
    listApiKeys: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => listApiKeys(req)),
    listSockets: async (_: unk, __: unk, { req }: ApolloContext) => listSockets(req),
    listTokens: async (_: unk, __: unk, { req }: ApolloContext) => tryCatch(() => listTokens(req)),
    loginToken: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => loginToken(req, args)),
  },

  Mutation: {
    // login, logout, register, etc
    deregister: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => deregister(req, res, args), true),
    login: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => login(req, res, args), true),
    loginWithStudentId: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => loginWithStudentId(req, res, args), true),
    loginWithToken: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => loginWithToken(req, res, args), true),
    logout: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => logout(req, res, args), true),
    logoutOther: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => logoutOther(req, args), true),
    oAuth2: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => oAuth2(req, res, args), true),
    register: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => register(req, res, args), true),
    renewToken: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => renewToken(req, res, args), true),

    // impersonate
    impersonateStart: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => impersonateStart(req, res, args), true),
    impersonateStop: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => impersonateStop(req, res, args), true),

    // send verification
    sendEmailVerification: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => sendEmailVerification(req, args)),
    sendMessengerVerification: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => sendMessengerVerification(req, args)),

    // update
    addApiKey: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => addApiKey(req, args)),
    removeApiKey: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => removeApiKey(req, args)),

    addEmail: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => update(req, args, 'addEmail')),
    addMessenger: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'addMessenger')),
    addPaymentMethod: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'addPaymentMethod')),
    addPushSubscription: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'addPushSubscription')),
    addStash: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => update(req, args, 'addStash')),
    oAuth2Link: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'oAuth2Link')),
    oAuth2Unlink: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'oAuth2Unlink')),
    removeEmail: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'removeEmail')),
    removeMessenger: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'removeMessenger')),
    removePaymentMethod: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'removePaymentMethod')),
    removePushSubscriptions: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'removePushSubscriptions')),
    removeStash: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'removeStash')),
    updateAvailability: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'updateAvailability')),
    updateAvatar: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'updateAvatar')),
    updateLocale: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'updateLocale')),
    updateProfile: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'updateProfile')),
    verifyEmail: async (_: unk, args: unk, { req, res }: ApolloContext) => tryCatch(() => verifyEmail(req, args)),
    verifyMessenger: async (_: unk, args: unk, { req, res }: ApolloContext) =>
      tryCatch(() => update(req, args, 'verifyMessenger')),
  },
};
