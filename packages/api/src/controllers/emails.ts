/**
 * Controller: Emails
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';

import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User, { userNormalSelect } from '../models/user';
import { notifySync } from '../utils/notify-sync';
import mail, { EMAIL_TOKEN_PREFIX } from '../utils/sendmail';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type PostAction = 'add' | 'isAvailable' | 'remove' | 'sendTest' | 'sendVerification' | 'verify';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, isAdmin } = common;
const { emailSchema, tokenSchema } = yupSchema;

/**
 * Is Email Available
 */
const isAvailable = async (req: Request, args: unknown): Promise<boolean> => {
  const { email } = await emailSchema.validate(args);
  const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, '-id');
  return !user;
};

/**
 * Send Test Email
 * only tenantAdmins or admin could test email
 */
const sendTest = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userName, userRoles } = auth(req);
  const { email } = await emailSchema.validate(args);

  const [user, isTenantAdmin] = await Promise.all([
    User.findOneActive({ _id: userId, emails: { $in: [email, email.toUpperCase()] } }),
    isAdmin(userRoles) || Tenant.exists({ admins: userId }),
  ]);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!isTenantAdmin) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (await mail.testEmail(userName, userLocale, email)) return { code: MSG_ENUM.COMPLETED };

  throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };
};

/**
 * Send Verify Link
 */
const sendVerification = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userLocale, userName } = auth(req);
  const { email } = await emailSchema.validate(args);

  if (await mail.confirmEmail(userName, userLocale, email)) return { code: MSG_ENUM.COMPLETED };

  throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };
};

/**
 * Update Email (add, remove, verify)
 */
const update = async (
  req: Request,
  args: unknown,
  action: Extract<PostAction, 'add' | 'remove'>,
): Promise<UserDocument & Id> => {
  const { userId, userName, userLocale } = auth(req);
  const { email } = await emailSchema.validate(args);

  const user =
    action === 'add'
      ? await User.findOneAndUpdate(
          { _id: userId, emails: { $nin: [email, email.toUpperCase()] } },
          { $push: { emails: email.toUpperCase() } }, // uppercase for unverified email
          { fields: userNormalSelect, new: true },
        ).lean()
      : await User.findOneAndUpdate(
          { _id: userId, emails: { $in: [email, email.toUpperCase()] } },
          { $pull: { emails: { $in: [email, email.toUpperCase()] } } },
          { fields: userNormalSelect, new: true },
        ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    DatabaseEvent.log(userId, `/email/${userId}`, action, { email }),
    notifySync('RENEW-TOKEN', { userIds: [userId] }, { userIds: [userId] }),
    action === 'add' && mail.confirmEmail(userName, userLocale, email),
  ]);

  return user;
};

/**
 * Confirm email is valid
 * note: user might NOT have logged in yet, so only return StatusResponse
 */
const verify = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { token: tok } = await tokenSchema.validate(args);
  const [prefix, email] = await token.verifyStrings(tok);
  if (prefix !== EMAIL_TOKEN_PREFIX || !email) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const user = await User.findOneAndUpdate(
    { emails: { $in: [email, email.toUpperCase()] } },
    { $set: { 'emails.$': email } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.TOKEN_ERROR };

  const userId = user._id.toString();
  await Promise.all([
    DatabaseEvent.log(userId, `/email/${userId}`, 'verify', { email }),
    notifySync('RENEW-TOKEN', { userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Post Handler (RESTful)
 */
const postHandler: RequestHandler<{ action: PostAction }> = async (req, res, next) => {
  const { action } = req.params;

  try {
    switch (action) {
      case 'add':
      case 'remove':
        return res.status(200).json({ data: await update(req, req.body, action) });
      case 'isAvailable':
        return res.status(200).json({ data: await isAvailable(req, req.body) });
      case 'sendTest':
        return res.status(200).json(await sendTest(req, req.body));
      case 'sendVerification':
        return res.status(200).json(await sendVerification(req, req.body));
      case 'verify':
        return res.status(200).json(await verify(req, req.body));
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  isAvailable,
  postHandler,
  sendTest,
  sendVerification,
  update,
  verify,
};
