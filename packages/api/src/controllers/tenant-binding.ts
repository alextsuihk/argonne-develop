/**
 * Controller: TenantBinding
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request } from 'express';
import type { LeanDocument } from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import User, { UserDocument, userNormalSelect } from '../models/user';
import { startChatGroup } from '../utils/chat';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

const { auth } = common;
const { optionalExpiresInSchema, tenantIdSchema, tokenSchema, userIdSchema } = yupSchema;

export const select = (userRoles?: string[]) => `${common.select(userRoles)} -apiKey -meta`;

/**
 * An User binds himself to a tenant
 *  note: user (while at old tenant domain), binds to another tenant
 */
const bind = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId, userLocale, userName, userTenants } = auth(req);
  const { token: tok } = await tokenSchema.validate(args);
  const { id } = await token.verifyEvent(tok, 'tenant');

  const [tenantId, studentId] = id.split('#');
  if (!tenantId || userTenants.includes(tenantId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const tenant = await Tenant.findByTenantId(tenantId);

  const msg = {
    enUS: `${userName} (userId: ${userId}), welcome to join us ${tenant.name.enUS}.`,
    zhCN: `${userName} (userId: ${userId})，欢迎你加入我们 ${tenant.name.zhCN}。`,
    zhHK: `${userName} (userId: ${userId})，歡迎你加入我們 ${tenant.name.zhHK}。`,
  };
  const [user] = await Promise.all([
    User.findByIdAndUpdate(
      userId,
      {
        $push: {
          tenants: tenant.school ? { $each: [tenantId], $position: 0 } : tenantId, // if tenant is a school, it becomes the primary tenant (tenants[0])
          ...(tenant.school && studentId && { studentIds: { $each: [`${tenantId}#${studentId}`], $position: 0 } }),
        },
      },
      { fields: userNormalSelect, new: true },
    ).lean(),
    startChatGroup(tenant._id, msg, [userId, ...tenant.admins], userLocale, `TENANT#${studentId}-USER#${userId}`),
    DatabaseEvent.log(userId, `/users/${userId}`, 'BIND', { tenant: tenantId }),
    notify([userId], 'RE-AUTH'),
    syncSatellite({ tenantId: tenant._id, userIds: [userId] }, { userIds: [userId] }),
  ]);
  return user!;
};

/**
 * TenantAdmin Generate a token (for user to bind)
 */
const createToken = async (req: Request, args: unknown): Promise<{ token: string; expireAt: Date }> => {
  const { userId } = auth(req);
  const { tenantId, expiresIn = DEFAULTS.TENANT.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema
    .concat(tenantIdSchema)
    .validate(args);

  await Tenant.findByTenantId(tenantId, userId); // only tenant.admins could generate token

  return { token: await token.signEvent(tenantId, 'tenant', expiresIn), expireAt: addSeconds(new Date(), expiresIn) };
};

/**
 * Tenant admin unbinding an user
 * ! ONLY tenantAdmins could unbind an user (remove user from tenant)
 */
const unbind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userLocale: adminLocale } = auth(req);
  const { tenantId, userId } = await tenantIdSchema.concat(userIdSchema).validate(args);
  const tenant = await Tenant.findByTenantId(tenantId, adminId);

  const user = await User.findOneAndUpdate(
    { _id: userId, tenants: tenantId },
    { $pull: { tenants: tenantId } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `${user.name}, you have been unbound ${tenant.name.enUS}.`,
    zhCN: `${user.name}，你已被解除绑定 ${tenant.name.zhCN}。`,
    zhHK: `${user.name}，你已被解除綁定 ${tenant.name.zhHK}。`,
  };
  await Promise.all([
    startChatGroup(tenantId, msg, [adminId, userId, ...tenant.admins], adminLocale, `TENANT#${tenantId}`),
    startChatGroup(null, msg, [userId], user.locale, `USER#${user._id}`),
    DatabaseEvent.log(adminId, `/users/${userId}`, 'UNBIND', { tenant: tenantId, admin: adminId, user: userId }),
    notify([userId], 'RE-AUTH'),
    syncSatellite({ tenantId, userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

export default {
  bind,
  createToken,
  unbind,
};
