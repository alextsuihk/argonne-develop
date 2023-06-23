/**
 * Controller: Contacts
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Classroom from '../models/classroom';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import { Id, UserDocument, userNormalSelect } from '../models/user';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import { idsToString, schoolYear, uniqueIds } from '../utils/helper';
import { notifySync } from '../utils/notify-sync';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type ContactWithAvatarUrl = {
  _id: Types.ObjectId;
  flags: string[];
  avatarUrl?: string;
  name: string;
  identifiedAt?: Date;
  status: string;
  tenants: string[];
};

const { MSG_ENUM } = LOCALE;
const { CONTACT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;
const { auth, authGetUser, paginateSort } = common;
const { contactNameSchema, idSchema, optionalExpiresInSchema, tokenSchema } = yupSchema;

const CONTACT_TOKEN_PREFIX = 'CONTACT';

/**
 * transform user to contact format
 */
const transform = (
  userTenants: string[],
  friend: UserDocument & Id,
  userContacts: UserDocument['contacts'],
): ContactWithAvatarUrl => {
  const myContact = userContacts.find(c => c.user.toString() === friend._id.toString());
  return {
    _id: friend._id,
    flags: myContact ? [CONTACT.FLAG.FRIEND] : [],
    avatarUrl: friend.avatarUrl,
    name: myContact?.name ?? friend.name,
    identifiedAt: friend.identifiedAt,
    status: friend.networkStatus ?? friend.isOnline ? USER.NETWORK_STATUS.ONLINE : USER.NETWORK_STATUS.OFFLINE,
    tenants: userTenants.filter(x => idsToString(friend.tenants).includes(x)), // only show intersected tenant
  };
};

/**
 * Generate a token with auth-user Id for other to make friend
 */
const createToken = async (req: Request, args: unknown): Promise<{ token: string; expireAt: Date }> => {
  const { userId } = auth(req);
  const { expiresIn = DEFAULTS.CONTACT.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema.validate(args);

  return {
    token: await token.signStrings([CONTACT_TOKEN_PREFIX, userId], expiresIn),
    expireAt: addSeconds(new Date(), expiresIn),
  };
};

/**
 * Create New User Contact (bi-directional)
 */
const create = async (req: Request, args: unknown): Promise<ContactWithAvatarUrl> => {
  const { userId, userLocale, userTenants } = auth(req);
  const { token: contactToken } = await tokenSchema.validate(args);

  const [prefix, friendId] = await token.verifyStrings(contactToken);
  if (prefix !== CONTACT_TOKEN_PREFIX || !friendId) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  // cross tenant NOT allowed
  const [user, friend] = await Promise.all([
    authGetUser(req),
    User.findOneActive({ _id: friendId, tenants: { $in: userTenants } }), // make sure user & friend have intersected tenants
  ]);
  if (!friend || userId === friendId) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `friend linked ${user.name} & ${friend.name}`,
    zhCN: `${user.name} & ${friend.name} 成为朋友。`,
    zhHK: `${user.name} & ${friend.name} 成為朋友。`,
  };

  const [updatedFriend] = await Promise.all([
    User.findOneAndUpdate(
      { _id: friendId, 'contacts.user': { $ne: userId } },
      { $push: { contacts: { user: userId } } },
      { new: true },
    ).lean(),
    User.updateOne({ _id: userId, 'contacts.user': { $ne: friendId } }, { $push: { contacts: { user: friendId } } }),
    startChatGroup(null, msg, [userId, friendId], userLocale, `FRIEND#${[userId, friendId].sort().join('-')}`),
    DatabaseEvent.log(userId, `/contacts/${userId}`, 'CREATE', { user: userId, friend: friendId }),
    notifySync('CONTACT', { userIds: [userId, friendId] }, { userIds: [userId, friendId] }),
  ]);

  return transform(userTenants, updatedFriend || friend, [{ user: friendId }]);
};

/**
 * Create New User Contact or Create Token (RESTful)
 *
 */
const createNew: RequestHandler<{ action?: 'createToken' }> = async (req, res, next) => {
  try {
    req.params.action === 'createToken'
      ? res.status(200).json({
          data: await createToken(
            req,
            typeof req.body.expiresIn === 'number' ? { expiresIn: Number(req.body.expiresIn) } : {},
          ),
        })
      : res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

// (helper) to get all contactIds (contacts, platform admin, tenantAdmins, classroom teachers & classmates)
const myContactIds = async (userId: string, userTenants: string[]) => {
  const [user, classrooms, { adminIds, accountId, accountWithheldId, robotIds, alexId }, tenants] = await Promise.all([
    User.findOneActive({ _id: userId }),
    Classroom.find({
      tenant: { $in: userTenants },
      $or: [{ students: userId }, { teachers: userId }],
      year: { $in: [schoolYear(-1), schoolYear(0), schoolYear(1)] },
    }).lean(),
    User.findSystemAccountIds(),
    Tenant.find({ _id: { $in: userTenants } }).lean(),
  ]);

  if (!user) throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };

  return {
    user,
    contactIds: uniqueIds([
      ...user.contacts.map(c => c.user), // user's contacts
      ...adminIds, // system admins
      accountId,
      accountWithheldId,
      ...robotIds,
      alexId,
      ...tenants.map(t => [...t.admins, ...t.supports, ...t.marshals, ...t.counselors]).flat(), // admins of tenant(s)
      ...classrooms.map(c => [...c.teachers, ...c.students]).flat(), // teachers & classmates
      ...user.favoriteTutors,
    ]),
  };
};
/**
 * Return My Contacts (& system adminId, admins of userTenants)
 */
const find = async (req: Request): Promise<ContactWithAvatarUrl[]> => {
  const { userId, userTenants } = auth(req);
  const { user, contactIds } = await myContactIds(userId, userTenants);
  const contacts = await User.find({ status: USER.STATUS.ACTIVE, _id: { $in: contactIds } }).lean();

  return contacts.map(friend => transform(userTenants, friend, user.contacts));
};

/**
 * Find Multiple Contacts with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userTenants } = auth(req);
    const { user, contactIds } = await myContactIds(userId, userTenants);
    const options = paginateSort(req.query, { name: 1 });

    const [total, contacts] = await Promise.all([
      User.countDocuments({ status: USER.STATUS.ACTIVE, _id: { $in: contactIds } }),
      User.find({ status: USER.STATUS.ACTIVE, _id: { $in: contactIds } }, userNormalSelect, options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: contacts.map(friend => transform(userTenants, friend, user.contacts)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Contact by ID
 */
const findOne = async (req: Request, args: unknown): Promise<ContactWithAvatarUrl | null> => {
  const { userId, userTenants } = auth(req);
  const [{ user, contactIds }, { id: friendId }] = await Promise.all([
    myContactIds(userId, userTenants),
    idSchema.validate(args),
  ]);

  if (userId === friendId || !idsToString(contactIds).includes(friendId)) return null;
  const friend = await User.findOneActive({ _id: friendId });
  return friend && transform(userTenants, friend, user.contacts);
};

/**
 * Find One Contact by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const contact = await findOne(req, { id: req.params.id });
    contact ? res.status(200).json({ data: contact }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contact by friend User ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userName } = auth(req);
  const { id: friendId } = await idSchema.validate(args);

  const [friend] = await Promise.all([
    User.findByIdAndUpdate(friendId, { $pull: { contacts: { user: userId } } }, { new: true }).lean(),
    User.updateOne({ _id: userId }, { $pull: { contacts: { user: friendId } } }, { new: true }),
  ]);

  if (!friend) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `friend unlinked: ${userName} & ${friend.name}.`,
    zhCN: `取消朋关系友：${userName} & ${friend.name}。`,
    zhHK: `取消朋友關係：${userName} & ${friend.name}。`,
  };

  await Promise.all([
    startChatGroup(null, msg, [userId, friendId], userLocale, `FRIEND#${[userId, friendId].sort().join('-')}`),
    DatabaseEvent.log(userId, `/contacts/${userId}`, 'DELETE', { user: userId, friend: friendId }),
    notifySync('CONTACT', { userIds: [userId, friendId] }, { userIds: [userId, friendId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete contact by friend User ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    res.status(200).json({ data: await remove(req, { id }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Contact Name
 */
const update = async (req: Request, args: unknown): Promise<ContactWithAvatarUrl> => {
  const { userId, userTenants } = auth(req);
  const { id: friendId, name } = await contactNameSchema.concat(idSchema).validate(args);

  const friend = await User.findOneActive({ _id: friendId });
  if (!friend) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { modifiedCount } = await User.updateOne(
    { _id: userId, 'contacts.user': friendId },
    name ? { $set: { 'contacts.$.name': name } } : { $unset: { 'contacts.$.name': 1 } },
  );
  if (!modifiedCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return transform(userTenants, friend, [{ user: friendId, name }]);
};

/**
 * Update Contact Name (RESTful)
 */
const updateById: RequestHandler<{ id: string }> = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    res.status(200).json({ data: await update(req, { id, ...req.body }) });
  } catch (error) {
    next(error);
  }
};

export default {
  create,
  createNew,
  createToken,
  find,
  findMany,
  findOne,
  findOneById,
  remove,
  removeById,
  update,
  updateById,
};
