/**
 * Controller: Roles
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import AccessEvent from '../models/event/access';
import DatabaseEvent from '../models/event/database';
import User from '../models/user';
import { messageToAdmin } from '../utils/chat';
import { notifySync } from '../utils/notify-sync';
import common from './common';

type Action = 'addRole' | 'removeRole';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { auth } = common;
const { idSchema, roleSchema } = yupSchema;

// const find ==

/**
 * Find User's Roles
 */
const findOne = async (req: Request, args: unknown): Promise<string[]> => {
  auth(req, 'ADMIN');
  const { id } = await idSchema.validate(args);

  const user = await User.findOneActive({ _id: id });
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  return user.roles;
};

/**
 * Find User's Roles (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json({ data: await findOne(req, { id: req.params.id }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Role (add / remove)
 */
const updateRole = async (req: Request, args: unknown, action: Action): Promise<string[]> => {
  const { userId: adminId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id: userId, role } = await idSchema.concat(roleSchema).validate(args);

  if (role === USER.ROLE.ROOT) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const user =
    action === 'addRole'
      ? await User.findOneAndUpdate(
          { _id: userId, roles: { $ne: role } },
          { $push: { roles: role } },
          { fields: 'roles', new: true },
        ).lean()
      : await User.findOneAndUpdate(
          { _id: userId, roles: role },
          { $pull: { roles: role } },
          { fields: 'roles', new: true },
        ).lean();

  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg =
    action === 'addRole'
      ? {
          enUS: `A new role (${role}) is given to you [/users/${userId}].`,
          zhCN: `刚授权新角色 (${role}) [/users/${userId}]。`,
          zhHK: `剛授權新角色 (${role}) [/users/${userId}]。`,
        }
      : {
          enUS: `A new role (${role}) is given to you [/users/${userId}].`,
          zhCN: `刚删除角色 (${role}) [/users/${userId}]。`,
          zhHK: `剛刪除角色 (${role}) [/users/${userId}]。`,
        };

  await Promise.all([
    messageToAdmin(msg, adminId, userLocale, userRoles, [userId], `USER#${userId}`),
    AccessEvent.log(adminId, `/roles/${userId}`, { role }),
    DatabaseEvent.log(adminId, `/roles/${userId}`, action, role),
    notifySync('RENEW-TOKEN', { userIds: [userId] }, { userIds: [userId] }),
  ]);

  return user.roles;
};

/**
 * Add Role by ID (RESTful)
 */
const addById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(201).json({ data: await updateRole(req, { id: req.params.id, ...req.body }, 'addRole') });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Role by ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json({ data: await updateRole(req, { id: req.params.id, ...req.body }, 'removeRole') });
  } catch (error) {
    next(error);
  }
};

export default { addById, findOne, findOneById, removeById, updateRole };
