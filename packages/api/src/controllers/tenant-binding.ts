/**
 * Controller: TenantBinding
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request } from 'express';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User, { userNormalSelect } from '../models/user';
import { startChatGroup } from '../utils/chat';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

const { auth, isRoot } = common;
const { optionalExpiresInSchema, tenantIdSchema, tokenSchema, userIdSchema } = yupSchema;

export const TENANT_BINDING_TOKEN_PREFIX = 'TENANT_BINDING';

export const select = (userRoles?: string[]) => `${common.select(userRoles)} -apiKey -meta`;

/**
 * An User binds himself to a tenant
 *  note: user (while at old tenant domain), binds to another tenant
 */
const bind = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  const { userId, userLocale, userName, userTenants } = auth(req);
  const { token: tok } = await tokenSchema.validate(args);
  const [prefix, tenantId, studentId] = await token.verifyStrings(tok);
  if (prefix !== TENANT_BINDING_TOKEN_PREFIX || !tenantId) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const [tenant, userFirstTenant] = await Promise.all([
    Tenant.findByTenantId(tenantId),
    userTenants[0] ? Tenant.findByTenantId(userTenants[0]) : null,
  ]);

  // NOT allow when current primary userTenants (first tenant) is school, and binding tenanting, previous (current) school needs to unbind first
  if (userTenants.includes(tenantId) || (tenant.school && userFirstTenant?.school))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `${userName} (userId: ${userId}), welcome to join us ${tenant.name.enUS}.`,
    zhCN: `${userName} (userId: ${userId})，欢迎你加入我们 ${tenant.name.zhCN}。`,
    zhHK: `${userName} (userId: ${userId})，歡迎你加入我們 ${tenant.name.zhHK}。`,
  };
  const [user] = await Promise.all([
    User.findByIdAndUpdate(
      userId,
      {
        $push: { tenants: tenant.school ? { $each: [tenantId], $position: 0 } : tenantId }, // if tenant is a school, it becomes the primary tenant (tenants[0])
        ...(tenant.school &&
          studentId && { $addToSet: { studentIds: { $each: [`${tenantId}#${studentId}`], $position: 0 } } }), // prepend studentIds for login purposes
      },
      { fields: userNormalSelect, new: true },
    ).lean(),
    startChatGroup(tenantId, msg, [userId, ...tenant.admins], userLocale, `TENANT#${tenantId}-USER#${userId}`),
    DatabaseEvent.log(userId, `/tenant-binding/${userId}`, 'BIND', { tenantId }),
    notifySync('RENEW-TOKEN', { tenantId, userIds: [userId] }, { userIds: [userId] }),
  ]);
  if (user) return user;
  log('error', `tenantBindingController:update()`, { tenantId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * TenantAdmin Generate a token (for user to bind)
 */
const createToken = async (req: Request, args: unknown): Promise<{ token: string; expireAt: Date }> => {
  const { userId } = auth(req);
  const { tenantId, expiresIn = DEFAULTS.TENANT.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema
    .concat(tenantIdSchema)
    .validate(args);

  const [bindingToken] = await Promise.all([
    token.signStrings([TENANT_BINDING_TOKEN_PREFIX, tenantId], expiresIn),
    Tenant.findByTenantId(tenantId, userId), // only tenant.admins could generate token
  ]);

  return { token: bindingToken, expireAt: addSeconds(new Date(), expiresIn) };
};

/**
 * Tenant admin unbinding an user
 * ! ONLY tenantAdmins (or ROOT) could unbind an user (remove user from tenant)
 */
const unbind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userLocale: adminLocale, userRoles: adminUserRoles } = auth(req);
  const { tenantId, userId } = await tenantIdSchema.concat(userIdSchema).validate(args);
  const tenant = await Tenant.findByTenantId(tenantId, adminId, isRoot(adminUserRoles));

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
    startChatGroup(null, msg, [adminId, ...tenant.admins], adminLocale, `TENANT#${tenantId}-USER#${userId}`),
    DatabaseEvent.log(adminId, `/tenant-binding/${userId}`, 'UNBIND', { tenantId, adminId }),
    notifySync('RENEW-TOKEN', { tenantId, userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

export default {
  bind,
  createToken,
  unbind,
};
