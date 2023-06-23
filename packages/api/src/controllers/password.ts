/**
 * Controller: Password
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { Request, RequestHandler } from 'express';

import configLoader from '../config/config-loader';
import AuthEvent from '../models/event/auth';
import User from '../models/user';
import authenticateClient from '../utils/authenticate-client';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type PostAction = 'change' | 'reset-confirm' | 'reset-request';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, guest } = common;
const { DEFAULTS } = configLoader;
const { passwordChangeSchema, passwordConfirmResetSchema, passwordResetRequestSchema } = yupSchema;

export const PASSWORD_TOKEN_PREFIX = 'PASSWORD';

/**
 * Change password
 */
const change = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { currPassword, newPassword, refreshToken, coordinates, clientHash } = await passwordChangeSchema.validate(
    args,
  );
  const [{ password: hashedPassword }] = await Promise.all([authGetUser(req), authenticateClient(clientHash)]);

  // newPassword must be different from current
  if (currPassword === newPassword) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // check if currPassword is correct
  if (!(await bcrypt.compare(currPassword, hashedPassword)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  await Promise.all([
    User.updateOne({ _id: userId }, { password: newPassword, $pull: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } }), // encrypting password in model
    token.revokeOthers(userId, refreshToken), // revoke others JWT
    AuthEvent.log(userId, 'passwordChange', req.ua, req.ip, coordinates),
    notifySync('_SYNC-ONLY', { userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Confirm password-reset
 */
const resetConfirm = async (req: Request, args: unknown): Promise<StatusResponse> => {
  guest(req);
  const { token: resetToken, password, coordinates, clientHash } = await passwordConfirmResetSchema.validate(args);
  const [[prefix, id]] = await Promise.all([token.verifyStrings(resetToken), authenticateClient(clientHash)]);

  if (prefix !== PASSWORD_TOKEN_PREFIX || !id) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const user = await User.findByIdAndUpdate(id, { password }); // encryption is achieved in model
  if (!user) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  await Promise.all([
    token.revokeAll(user._id), // logout all
    AuthEvent.log(user._id, 'passwordConfirmReset', req.ua, req.ip, coordinates),
    notifySync('_SYNC-ONLY', { userIds: [user] }, { userIds: [user] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Request password reset token to email
 */
const resetRequest = async (req: Request, args: unknown): Promise<StatusResponse> => {
  guest(req);
  const { email, coordinates, clientHash } = await passwordResetRequestSchema.validate(args);

  // accept verified (lower-cased) & unverified email (upper-cased)
  const [user] = await Promise.all([
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }),
    authenticateClient(clientHash),
  ]);

  if (user) {
    const resetToken = await token.signStrings(
      [PASSWORD_TOKEN_PREFIX, user._id.toString()],
      DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
    );

    await Promise.all([
      mail.resetPassword(user.name, user.locale, email, resetToken),
      AuthEvent.log(user._id, 'passwordResetRequest', req.ua, req.ip, coordinates),
    ]);
  }

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Post Actions (RESTful)
 */
const postAction: RequestHandler<{ action: PostAction }> = async (req, res, next) => {
  const { action } = req.params;

  try {
    switch (action) {
      case 'change':
        return res.status(200).json(await change(req, req.body));
      case 'reset-confirm':
        return res.status(200).json(await resetConfirm(req, req.body));
      case 'reset-request':
        return res.status(200).json(await resetRequest(req, req.body));
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  change,
  postAction,
  resetConfirm,
  resetRequest,
};
