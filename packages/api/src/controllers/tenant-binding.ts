/**
 * Controller: TenantBinding
 *
 * binding procedure
 *  1) tenantAdmin generate a bindingToken (with TenantId)
 *  2) user gets the bindingToken (via QR code)
 *  3) user generates a QR code with `${bindToken}#${refreshToken}#${userId}#${studentId}#${JSON.stringify(formalName)}#${avatarUrl}`
 *  4) any client (even guest) send (bindingToken, refreshToken, studentId) to API server: bind()
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request } from 'express';
import type { UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import Tutor from '../models/tutor';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import token, { REFRESH_TOKEN_PREFIX, TENANT_BINDING_TOKEN_PREFIX } from '../utils/token';
import type { StatusResponse, TokenWithExpireAtResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const { auth, isRoot } = common;
const { optionalExpiresInSchema, tenantBindingSchema, tenantIdSchema, userIdSchema } = yupSchema;

export const select = (userRoles?: string[]) => `${common.select(userRoles)} -apiKey -meta`;

/**
 * Bind user to tenant
 * (with intact bindingToken & refreshToken, even guest is ok)
 *
 * ! note: the current procedure fails to handle the following, will need manual unbind (by root)
 *   student initially binds to school-A, and binds to school-B, he/she will fail to re-bind to school-A as primary tenant, root will need to unbind school-A first
 */
const bind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { bindingToken, refreshToken, studentId } = await tenantBindingSchema.validate(args);

  const [[bindingPrefix, tenantId, studId], [refreshPrefix, userId]] = await Promise.all([
    token.verifyStrings(bindingToken),
    token.verifyStrings(refreshToken),
  ]);

  if (bindingPrefix !== TENANT_BINDING_TOKEN_PREFIX || !tenantId || refreshPrefix !== REFRESH_TOKEN_PREFIX || !userId)
    throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const tenant = await Tenant.findByTenantId(tenantId);

  const tenantIdStudentId = tenant.school && (studId || studentId) && `${tenant._id}#${studId || studentId}`;
  const update: UpdateQuery<UserDocument> = {
    ...((tenant.school || tenant.flags.includes(TENANT.FLAG.REPUTABLE)) && { identifiedAt: new Date() }),
    $push: {
      tenants: tenant.school ? { $each: [tenant._id], $position: 0 } : tenant._id, // if tenant is a school, it becomes the primary tenant (tenants[0])
      ...(tenantIdStudentId && { studentIds: { $each: [tenantIdStudentId], $position: 0 } }), // prepend studentIds for login purposes
    },
  };

  const user = await User.findOneAndUpdate({ _id: userId, tenants: { $ne: tenant._id } }, update, { new: true }).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    DatabaseEvent.log(user._id, `/tenant-binding/${user._id}`, 'BIND', { tenantId, studentId }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: {
          users: [
            { updateOne: { filter: { _id: user._id, tenants: { $ne: tenant._id } }, update } },
          ] satisfies BulkWrite<UserDocument>,
        },
      },
    ),
  ]);
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * TenantAdmin Generate a token (for user to bind)
 */
const createToken = async (req: Request, args: unknown): Promise<TokenWithExpireAtResponse> => {
  const { userId } = auth(req);
  const { tenantId, expiresIn = DEFAULTS.TENANT_BINDING.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema
    .concat(tenantIdSchema)
    .validate(args);

  const expIn = Math.min(expiresIn, DEFAULTS.TENANT_BINDING.TOKEN_EXPIRES_IN); // set limit
  const [bindingToken] = await Promise.all([
    token.signStrings([TENANT_BINDING_TOKEN_PREFIX, tenantId], expIn),
    Tenant.findByTenantId(tenantId, userId), // only tenant.admins could generate token
  ]);

  return { token: bindingToken, expireAt: addSeconds(new Date(), expIn) };
};

/**
 * Tenant admin unbinding an user
 * ! ONLY tenantAdmins (or ROOT) could unbind an user (remove user from tenant)
 *
 */
const unbind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userLocale: adminLocale, userRoles: adminUserRoles } = auth(req);
  const { tenantId, userId } = await tenantIdSchema.concat(userIdSchema).validate(args);
  const tenant = await Tenant.findByTenantId(tenantId, adminId, isRoot(adminUserRoles));

  const update: UpdateQuery<UserDocument> = { $pull: { tenants: tenant._id } };
  const [user, tutor] = await Promise.all([
    User.findOneAndUpdate({ _id: userId, tenants: tenant._id }, update, { new: true }).lean(),
    Tutor.findOne({ user: userId }), // satellite should have a empty Tutor collection
  ]);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `${user.name}, you have been unbound ${tenant.name.enUS}.`,
    zhCN: `${user.name}，你已被解除绑定 ${tenant.name.zhCN}。`,
    zhHK: `${user.name}，你已被解除綁定 ${tenant.name.zhHK}。`,
  };
  await Promise.all([
    tutor &&
      Tutor.updateOne({ _id: tutor._id }, { specialties: tutor.specialties.filter(s => !s.tenant.equals(tenant._id)) }),
    startChatGroup(tenant._id, msg, [adminId, ...tenant.admins], adminLocale, `TENANT#${tenantId}-USER#${userId}`),
    DatabaseEvent.log(adminId, `/tenant-binding/${userId}`, 'UNBIND', { args }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      { bulkWrite: { users: [{ updateOne: { filter: { _id: userId }, update } }] satisfies BulkWrite<UserDocument> } },
    ),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

export default {
  bind,
  createToken,
  unbind,
};
