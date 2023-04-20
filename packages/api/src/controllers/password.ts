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
import mail from '../utils/sendmail';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type PostAction = 'change' | 'reset-confirm' | 'reset-request';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, guest } = common;
const { DEFAULTS } = configLoader;
const { emailSchema, passwordChangeSchema, passwordConfirmResetSchema } = yupSchema;

/**
 * Change password
 */
const change = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const user = await authGetUser(req);
  const { currPassword, newPassword, refreshToken, coordinates } = await passwordChangeSchema.validate(args);

  // newPassword must be different from current
  if (currPassword === newPassword) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // check if currPassword is correct
  if (!(await bcrypt.compare(currPassword, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  await Promise.all([
    User.findByIdAndUpdate(user, { password: newPassword, $pull: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } }), // encrypting password in model
    token.revokeOthers(user._id, refreshToken), // revoke others JWT
    AuthEvent.log(user._id, 'passwordChange', req.ua, req.ip, coordinates),
    syncSatellite({ userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Confirm password-reset
 */
const resetConfirm = async (req: Request, args: unknown): Promise<StatusResponse> => {
  guest(req);
  const { token: resetToken, password, coordinates } = await passwordConfirmResetSchema.validate(args);
  const { id } = await token.verifyEvent(resetToken, 'password'); // decode password-token

  const user = await User.findByIdAndUpdate(id, { password }); // encryption is achieved in model
  if (!user) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const userId = user._id.toString();
  await Promise.all([
    token.revokeAll(userId), // logout all
    AuthEvent.log(userId, 'passwordConfirmReset', req.ua, req.ip, coordinates),
    syncSatellite({ userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Request password reset token to email
 */
const resetRequest = async (req: Request, args: unknown): Promise<StatusResponse> => {
  guest(req);
  const { email } = await emailSchema.validate(args);

  // accept verified (lower-cased) & unverified email (upper-cased)
  const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } });

  if (user) {
    const resetToken = await token.signEvent(user._id, 'password', DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN);

    await Promise.all([
      mail.resetPassword(user.name, user.locale, email, resetToken),
      AuthEvent.log(user._id, 'passwordResetRequest', req.ua, req.ip, null),
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
