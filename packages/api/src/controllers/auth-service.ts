/**
 * Controller: Auth-Service
 *  ! provide oAuth2-like service
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request } from 'express';
import mongoose from 'mongoose';

import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User, { activeCond, userAuthServiceBaseSelect } from '../models/user';
import { dataCipher } from '../utils/cipher';
import tokenUtil from '../utils/token';
import common from './common';

export type GetAuthServiceAction = 'authServiceToken' | 'authServiceUserInfo';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { auth, hubModeOnly } = common;
const { clientSchema, tokenSchema } = yupSchema;
const { signStrings, verifyStrings } = tokenUtil;

export const ALGORITHM = 'aes-192-cbc';
const AUTHORIZATION_TOKEN_PREFIX = 'AUTHORIZATION';

/**
 * Generate Authorization Token (by user)
 * only support userPrimaryTenant (school)
 */
export const authServiceToken = async (
  req: Request,
  args: unknown,
): Promise<{ clientId: string; token: string; tokenExpireAt: Date; redirectUri: string }> => {
  hubModeOnly();
  const { userId, userTenants } = auth(req);
  const { client } = await clientSchema.validate(args);

  const [tenantId, clientId] = client.split('#');

  const tenant = tenantId && clientId ? await Tenant.findByTenantId(tenantId) : null;
  const schoolId = tenant?.school?.toString();
  if (!tenantId || !clientId || !tenant || !schoolId || !tenant.services.includes(TENANT.SERVICE.AUTH_SERVICE))
    throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

  const authService = tenant.authServices.find(service => service.startsWith(clientId));
  if (userTenants[0] !== tenantId || !authService) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // only support userPrimaryTenant

  const [cid, clientSecret, redirectUri, select] = authService.split('#');
  if (!cid || !clientSecret || !redirectUri || !tenantId) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const expiresIn = 10; // expires in 10 seconds
  const authToken = await signStrings(
    [AUTHORIZATION_TOKEN_PREFIX, tenantId, schoolId, userId, select ?? 'BARE'],
    expiresIn,
  );
  const token = await dataCipher(authToken, clientSecret); // cipher the authToken

  return { clientId, token, tokenExpireAt: addSeconds(Date.now(), expiresIn), redirectUri };
};

/**
 * Return user info
 */
export const authServiceUserInfo = async (req: Request, args: unknown): Promise<UserDocument> => {
  hubModeOnly();
  const { token } = await tokenSchema.validate(args);
  const [prefix, tenantId, schoolId, userId, select] = await verifyStrings(token);

  const user = await User.findOne(
    { _id: userId, ...activeCond },
    select === 'BARE' ? userAuthServiceBaseSelect : select,
  ).lean();
  if (
    prefix !== AUTHORIZATION_TOKEN_PREFIX ||
    !tenantId ||
    !schoolId ||
    !mongoose.isObjectIdOrHexString(schoolId) ||
    !user
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return {
    ...user,
    schoolHistories: user.schoolHistories[0]?.school.equals(schoolId) ? [user.schoolHistories[0]] : [],
  };
};
