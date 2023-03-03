/**
 * Controller: Contacts
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { messageToAdmin, startChatGroup } from '../utils/chat';
import { idsToString } from '../utils/helper';
import log from '../utils/log';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type ContactWithAvatarUrl = {
  _id: string;
  avatarUrl: string | null;
  name: string;
  identifiedAt?: Date;
  status: string;
  tenants: string[];
};

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;
const { auth, authGetUser } = common;
const { contactNameSchema, idSchema, optionalExpiresInSchema, tokenSchema } = yupSchema;

/**
 * transform user to contact format
 */
const transform = (
  user: LeanDocument<UserDocument>,
  friend: LeanDocument<UserDocument>,
  name?: string,
): ContactWithAvatarUrl => ({
  _id: friend._id.toString(),
  avatarUrl: friend.avatarUrl || null,
  name: name ?? friend.name,
  identifiedAt: friend.identifiedAt,
  status: friend.networkStatus ?? friend.isOnline ? USER.NETWORK_STATUS.ONLINE : USER.NETWORK_STATUS.OFFLINE,
  tenants: idsToString(user.tenants).filter(x => idsToString(friend.tenants).includes(x)),
});

/**
 * Generate a token with auth-user Id for other to make friend
 */
const contactToken = async (req: Request, args: unknown): Promise<string> => {
  const { userId } = auth(req);
  const { expiresIn = DEFAULTS.CONTACT.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema.validate(args);

  return token.signEvent(userId, 'contact', expiresIn);
};

/**
 * Create New User Contact (bi-directional)
 */
const create = async (req: Request, args: unknown): Promise<ContactWithAvatarUrl> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const { token: contactToken } = await tokenSchema.validate(args);
  const { id: friendId } = await token.verifyEvent(contactToken, 'contact');

  // cross tenant NOT allowed
  const [user, friend] = await Promise.all([
    authGetUser(req),
    User.findOneActive({ _id: friendId, tenants: { $in: userTenants } }), // make sure user & friend have intersected tenants
  ]);
  if (!friend || userId === friendId) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // check if users & friend's contacts are consistent
  const userContactIds = user.contacts.map(c => c.user.toString());
  const friendContactIds = friend.contacts.map(c => c.user.toString());
  const userKnowsFriend = userContactIds.includes(friendId);
  const friendKnowsUser = friendContactIds.includes(userId);
  if ((userKnowsFriend && !friendKnowsUser) || (!userKnowsFriend && friendKnowsUser)) {
    const msg = {
      enUS: 'We have detected discrepancy when binding you two as friends. If you two are not able to see each other name, please reply into this chat.',
      zhCN: '当绑定好友失败时，我们发现数据库异常，如果你们不能看见彼此名字，請回覆此聊天室。',
      zhHK: '當綁定好友失敗時，我們發現數據庫異常，如果你們不能看見彼此名字，請回覆此聊天室。',
    };

    await Promise.all([
      log(
        'error',
        `[DISCREPANCY-CONTACT] user: ${userId}, friend: ${friendId}`,
        { user: userContactIds, friend: friendContactIds },
        userId,
      ),
      messageToAdmin(msg, userId, userLocale, userRoles, [friendId], `USER#${userId}-${friendId}`),
    ]);
  }

  if (userKnowsFriend && friendKnowsUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `friend linked ${user.name} & ${friend.name}`,
    zhCN: `${user.name} & ${friend.name} 成为朋友。`,
    zhHK: `${user.name} & ${friend.name} 成為朋友。`,
  };

  const [updatedUser, updatedFriend] = await Promise.all([
    User.findOneAndUpdate(
      { _id: userId, 'contacts.user': { $ne: friendId } },
      { $push: { contacts: { user: friendId, name: friend.name } } },
      { new: true },
    ).lean(),
    User.findOneAndUpdate(
      { _id: friendId, 'contacts.user': { $ne: userId } },
      { $push: { contacts: { user: userId, name: user.name } } },
      { new: true },
    ).lean(),
    startChatGroup(null, msg, [userId, friendId], userLocale, `FRIEND#${[userId, friendId].sort().join('-')}`),
    DatabaseEvent.log(userId, `/users/${userId}`, 'CREATE', { user: userId, friend: friendId }),
  ]);
  if (updatedFriend)
    await Promise.all([
      notify([friendId], 'CONTACT', { userIds: [userId] }),
      syncSatellite({ userIds: [userId, friendId] }, { userIds: [userId, friendId] }),
    ]);

  if (!updatedUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  return transform(updatedUser, friend);
};

/**
 * Create New User Contact or Generate Token (RESTful)
 *
 */
const createNew: RequestHandler<{ token?: 'token' }> = async (req, res, next) => {
  try {
    req.params.token === 'token'
      ? res.status(200).json({
          data: await contactToken(
            req,
            typeof req.body.expiresIn === 'number' ? { expiresIn: Number(req.body.expiresIn) } : {},
          ),
        })
      : res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

/**
 * Return My Contacts
 */
const find = async (req: Request): Promise<ContactWithAvatarUrl[]> => {
  const user = await authGetUser(req);
  const friends = await User.find({ status: USER.STATUS.ACTIVE, _id: { $in: user.contacts.map(c => c.user) } }).lean();

  return friends.map(friend =>
    transform(user, friend, user.contacts.find(c => c.user.toString() === friend._id.toString())?.name),
  );
};

/**
 * Find Multiple Districts with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json({ data: await find(req) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Contact by ID
 */
const findOne = async (req: Request, args: unknown): Promise<ContactWithAvatarUrl | null> => {
  const [user, { id: friendId }] = await Promise.all([authGetUser(req), idSchema.validate(args)]);

  const contact = user.contacts.find(c => c.user.toString() === friendId);
  const friend = contact && (await User.findOneActive({ _id: friendId }));
  if (!contact || !friend) return null;

  return transform(user, friend, contact.name);
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
  const { userId, userLocale } = auth(req);
  const { id: friendId } = await idSchema.validate(args);

  const [user, friend] = await Promise.all([
    User.findByIdAndUpdate(userId, { $pull: { contacts: { user: friendId } } }, { new: true }).lean(),
    User.findByIdAndUpdate(friendId, { $pull: { contacts: { user: userId } } }, { new: true }).lean(),
  ]);

  if (!friend || !user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `friend unlinked: ${user.name} & ${friend.name}.`,
    zhCN: `取消朋关系友：${user.name} & ${friend.name}。`,
    zhHK: `取消朋友關係：${user.name} & ${friend.name}。`,
  };

  await Promise.all([
    startChatGroup(null, msg, [userId, friendId], userLocale, `FRIEND#${[userId, friendId].sort().join('-')}`),
    DatabaseEvent.log(userId, `/users/${userId}`, 'DELETE', { user: userId, friend: friendId }),
    notify([friendId], 'CONTACT', { userIds: [userId] }), // notify friend that contacts has changed
    syncSatellite({ userIds: [userId, friendId] }, { userIds: [userId, friendId] }),
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
  const { userId } = auth(req);
  const { id: friendId, name } = await contactNameSchema.concat(idSchema).validate(args);

  const friend = await User.findOneActive({ _id: friendId });
  if (!friend) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const user = await User.findOneAndUpdate(
    { _id: userId, 'contacts.user': friendId },
    name ? { $set: { 'contacts.$.name': name } } : { $unset: { 'contacts.$.name': 1 } },
    { new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return transform(user, friend, name);
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
  find,
  findMany,
  findOne,
  findOneById,
  contactToken,
  remove,
  removeById,
  update,
  updateById,
};
