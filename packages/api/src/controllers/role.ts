/**
 * Controller: Roles
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import AccessEvent from '../models/event/access';
import DatabaseEvent from '../models/event/database';
import type { UserDocument } from '../models/user';
import User, { activeCond } from '../models/user';
import { messageToAdmins } from '../utils/chat';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import common from './common';

type Action = 'addRole' | 'removeRole';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { auth } = common;
const { idSchema, roleSchema } = yupSchema;

/**
 * Find User's Roles
 */
const findOne = async (req: Request, args: unknown): Promise<string[]> => {
  auth(req, 'ADMIN');
  const { id } = await idSchema.validate(args);

  const user = await User.findOne({ _id: id, ...activeCond }).lean();
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
  const { userId: adminId } = auth(req, 'ADMIN');
  const { id, role } = await idSchema.concat(roleSchema).validate(args);

  if (!Object.keys(USER.ROLE).includes(role)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (role === USER.ROLE.ROOT) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const user =
    action === 'addRole'
      ? await User.findOneAndUpdate(
          { _id: id, roles: { $ne: role } },
          { $push: { roles: role } },
          { fields: 'roles tenants', new: true },
        ).lean()
      : await User.findOneAndUpdate(
          { _id: id, roles: role },
          { $pull: { roles: role } },
          { fields: 'roles tenants', new: true },
        ).lean();

  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg =
    action === 'addRole'
      ? {
          enUS: `A new role (${role}) is given to you [/users/${user._id}].`,
          zhCN: `刚授权新角色 (${role}) [/users/${user._id}]。`,
          zhHK: `剛授權新角色 (${role}) [/users/${user._id}]。`,
        }
      : {
          enUS: `A new role (${role}) is given to you [/users/${user._id}].`,
          zhCN: `刚删除角色 (${role}) [/users/${user._id}]。`,
          zhHK: `剛刪除角色 (${role}) [/users/${user._id}]。`,
        };

  const title = {
    enUS: `Admin Message (${user.name})`,
    zhCN: `管理员留言 (${user.name})`,
    zhHK: `管理員留言 (${user.name})`,
  };

  await Promise.all([
    messageToAdmins(msg, adminId, user.locale, true, [user._id], `USER#${user._id}`, title),
    AccessEvent.log(adminId, `/roles/${user._id}`, { role }),
    DatabaseEvent.log(adminId, `/roles/${user._id}`, action, { args }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: {
          users: [
            {
              updateOne: {
                filter: { _id: user._id },
                update: action === 'addRole' ? { $addToSet: { roles: role } } : { $pull: { roles: role } },
              },
            },
          ] satisfies BulkWrite<UserDocument>,
        },
      },
    ),
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
