/**
 * Controller: Password
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';

import AuthEvent from '../models/event/auth';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import authenticateClient from '../utils/authenticate-client';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import mail, { PASSWORD_TOKEN_PREFIX } from '../utils/sendmail';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type PostAction = 'change' | 'reset-confirm' | 'reset-request';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, guest } = common;
const { passwordChangeSchema, passwordConfirmResetSchema, passwordResetRequestSchema } = yupSchema;

/**
 * Change password
 */
const change = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { currPassword, newPassword, refreshToken, coordinates, clientHash } = await passwordChangeSchema.validate(
    args,
  );
  const [user] = await Promise.all([authGetUser(req), authenticateClient(clientHash)]);

  // newPassword must be different from current
  if (currPassword === newPassword) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // check if currPassword is correct
  if (!(await bcrypt.compare(currPassword, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const update: UpdateQuery<UserDocument> = {
    password: newPassword,
    $pull: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE },
  };
  await Promise.all([
    User.updateOne({ _id: userId }, update), // encrypting password in model
    token.revokeOthers(userId, refreshToken), // revoke others JWT
    AuthEvent.log(userId, 'passwordChange', req.ua, req.ip, coordinates),
    notifySync(
      user.tenants[0] || null,
      { userIds: [userId], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: { users: [{ updateOne: { filter: { _id: user._id }, update } }] satisfies BulkWrite<UserDocument> },
        extra: { revokeAllTokensByUserId: userId },
      },
    ), // force other clients (including satellites) to enter new password
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

  const user = await User.findByIdAndUpdate(id, { password }); // password is hashed in models/user.ts
  if (!user) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const userId = user._id.toString();
  await Promise.all([
    token.revokeAll(userId), // logout all
    AuthEvent.log(userId, 'passwordConfirmReset', req.ua, req.ip, coordinates),
    notifySync(
      user.tenants[0] || null,
      { userIds: [userId], event: 'AUTH-RELOAD' },
      { extra: { revokeAllTokensByUserId: userId } },
    ),
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
    await AuthEvent.log(user._id, 'passwordResetRequest', req.ua, req.ip, coordinates);
    mail.resetPassword(user._id, user.name, user.locale, email); // no need to wait, sending email takes time
  }

  return { code: MSG_ENUM.COMPLETED }; // for invalid, we pretend everything is okay
};

/**
 * Post Actions (RESTful)
 */
const postHandler: RequestHandler<{ action: PostAction }> = async (req, res, next) => {
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
  postHandler,
  resetConfirm,
  resetRequest,
};
