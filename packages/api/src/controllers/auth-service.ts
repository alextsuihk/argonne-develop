/**
 * Controller: Auth-Service
 *  ! provide oAuth2-like service
 *
 */

import { createCipheriv, randomBytes, scrypt } from 'node:crypto';

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';

import Tenant from '../models/tenant';
import User, { userBaseSelect } from '../models/user';
import tokenUtil from '../utils/token';
import common from './common';

type Authorize = { clientId: string; token: string; tokenExpireAt: Date; redirectUri: string };

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { auth, hubModeOnly } = common;
const { clientSchema, tokenSchema } = yupSchema;
const { signStrings, verifyStrings } = tokenUtil;

export const ALGORITHM = 'aes-192-cbc';
const AUTHORIZATION_TOKEN_PREFIX = 'AUTHORIZATION';

/**
 * Generate Authorization Token
 */
const authorize = async (req: Request, args: unknown): Promise<Authorize> => {
  hubModeOnly();
  const { userId, userTenants } = auth(req);
  const { client } = await clientSchema.validate(args);

  const [tenantId, clientId] = client.split('#');

  const tenant = tenantId && clientId ? await Tenant.findByTenantId(tenantId) : null;
  if (!tenantId || !clientId || !tenant || !tenant.school || !tenant.services.includes(TENANT.SERVICE.AUTH_SERVICE))
    throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

  const authService = tenant.authServices.find(service => service.startsWith(clientId));
  if (userTenants[0]?.toString() !== tenantId || !authService)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [cid, clientSecret, redirectUri, select] = authService.split('#');
  if (!cid || !clientSecret || !redirectUri || !tenantId) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const expiresIn = 10; // expires in 10 seconds
  const authToken = await signStrings([AUTHORIZATION_TOKEN_PREFIX, userId, select ?? 'BARE'], expiresIn);

  const key = await new Promise<Buffer>(resolve => scrypt(clientSecret, 'salt', 24, (_, key) => resolve(key)));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const token = `${iv.toString('hex')}#${cipher.update(authToken, 'utf8', 'hex') + cipher.final('hex')}`; // cipher the authToken
  return { clientId, token, tokenExpireAt: addSeconds(Date.now(), expiresIn), redirectUri };
};

const getAuthorize: RequestHandler<{ client: string }> = async (req, res, next) => {
  const { client } = req.params;
  const { clientId, token, redirectUri } = await authorize(req, { client });
  res.redirect(200, `${redirectUri}?clientId=${clientId}&token=${token}`);
};

/**
 * Return user info
 * ! note: restful API only
 */
const userInfo: RequestHandler = async (req, res, next) => {
  try {
    hubModeOnly();
    const { token } = await tokenSchema.validate(req.body);
    const [prefix, userId, select] = await verifyStrings(token);

    const user = await User.findOneActive({ _id: userId }, select === 'BARE' ? userBaseSelect : select);
    if (prefix !== AUTHORIZATION_TOKEN_PREFIX || !user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    res
      .status(200)
      .json({ data: { ...user, ...(user.schoolHistories[0] && { schoolHistories: [user.schoolHistories[0]] }) } });
  } catch (error) {
    next(error);
  }
};

export default {
  authorize,
  getAuthorize,
  userInfo,
};
