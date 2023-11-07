/**
 * Controller: Contacts
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Classroom from '../models/classroom';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User, { activeCond, userNormalSelect } from '../models/user';
import { schoolYear } from '../utils/helper';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import token from '../utils/token';
import type { StatusResponse, TokenWithExpireAtResponse } from './common';
import common from './common';

type ContactWithAvatarUrl = {
  _id: Types.ObjectId; // this is userId
  flags: string[];
  avatarUrl?: string;
  name: string;
  identifiedAt?: Date;
  availability: string;
  tenants: string[];
  updatedAt: Date;
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
  friend: UserDocument,
  userContacts: UserDocument['contacts'],
): ContactWithAvatarUrl => {
  const myContact = userContacts.find(c => c.user.equals(friend._id));
  return {
    _id: friend._id,
    flags: myContact ? [CONTACT.FLAG.FRIEND] : [],
    avatarUrl: friend.avatarUrl,
    name: myContact?.name ?? friend.name,
    identifiedAt: friend.identifiedAt,
    availability: friend.availability ?? friend.isOnline ? USER.AVAILABILITY.ONLINE : USER.AVAILABILITY.OFFLINE,
    tenants: userTenants.filter(x => friend.tenants.some(t => t.equals(x))), // only show intersected tenant
    updatedAt: myContact?.updatedAt || new Date(),
  };
};

/**
 * Generate a token with auth-user Id for other to make friend
 */
const createToken = async (req: Request, args: unknown): Promise<TokenWithExpireAtResponse> => {
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
  const { userTenants } = auth(req);
  const { token: contactToken } = await tokenSchema.validate(args);

  const [prefix, friendId] = await token.verifyStrings(contactToken);
  if (prefix !== CONTACT_TOKEN_PREFIX || !friendId) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  // cross tenant NOT allowed
  const [user, friend] = await Promise.all([
    authGetUser(req),
    User.findOne({ _id: friendId, tenants: { $in: userTenants }, ...activeCond }).lean(), // make sure user & friend have intersected tenants
  ]);
  if (!friend || user._id.equals(friend._id)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const isFriendInUserContacts = user.contacts.some(c => c.user.equals(friend._id));
  const isUserInFriendContacts = friend.contacts.some(c => c.user.equals(user._id));

  const updatedAt = new Date();
  const friendUpdate: UpdateQuery<UserDocument> = { $push: { contacts: { user: user._id, updatedAt } }, updatedAt };
  const userUpdate: UpdateQuery<UserDocument> = { $push: { contacts: { user: friend._id, updatedAt } }, updatedAt };
  const [transformed] = await Promise.all([
    transform(userTenants, friend, [{ user: friend._id, updatedAt }]), // friend in user.contacts
    !isFriendInUserContacts && User.updateOne({ _id: user._id }, userUpdate),
    !isUserInFriendContacts && User.updateOne({ _id: friend._id }, friendUpdate, { new: true }),
    DatabaseEvent.log(user._id, `/contacts/${user._id}`, 'CREATE', { user: user._id, friend: friend._id }),
    notifySync(
      user.tenants[0] && friend.tenants[0]?.equals(user.tenants[0]) ? user.tenants[0] : null,
      { userIds: [user._id, friend._id], event: 'CONTACT' },
      {
        bulkWrite: {
          users: [
            ...(isFriendInUserContacts ? [] : [{ updateOne: { filter: { _id: user._id }, update: userUpdate } }]),
            ...(isUserInFriendContacts ? [] : [{ updateOne: { filter: { _id: friend._id }, update: friendUpdate } }]),
          ] satisfies BulkWrite<UserDocument>,
        },
      },
    ),
  ]);

  return transformed;
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
const myContactIds = async (userId: Types.ObjectId, userTenants: string[]) => {
  const [user, classrooms, systemAccountIds, tenants] = await Promise.all([
    User.findOne({ _id: userId, ...activeCond }).lean(),
    Classroom.find({
      tenant: { $in: userTenants },
      $or: [{ students: userId }, { teachers: userId }],
      year: { $in: [schoolYear(-1), schoolYear(0), schoolYear(1)] },
    }).lean(),
    User.findSystemAccountIds(),
    Tenant.findAdminTenants(userId, userTenants),
  ]);

  if (!user) throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };

  //  { systemId,  adminIds, accountId, accountWithheldId, robotIds, alexId }
  return {
    user,
    contactIds: [
      ...user.contacts.map(c => c.user), // user's contacts
      systemAccountIds.systemId,
      ...systemAccountIds.adminIds, // system admins
      ...(systemAccountIds.accountId ? [systemAccountIds.accountId] : []),
      ...(systemAccountIds.accountWithheldId ? [systemAccountIds.accountWithheldId] : []),
      ...systemAccountIds.robotIds,
      ...(systemAccountIds.alexId ? [systemAccountIds.alexId] : []),
      ...tenants.map(t => [...t.admins, ...t.supports, ...t.marshals, ...t.counselors]).flat(), // admins of tenant(s)
      ...classrooms.map(c => [...c.teachers, ...c.students]).flat(), // teachers & classmates
      ...user.favoriteTutors,
    ],
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

  if (userId.equals(friendId) || !contactIds.some(c => c.equals(friendId))) return null;
  const friend = await User.findOne({ _id: friendId, ...activeCond }).lean();
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
 * only updating contact
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { id: friendId } = await idSchema.validate(args);

  const update: UpdateQuery<UserDocument> = { $pull: { contacts: { user: friendId } } };
  const user = await User.findByIdAndUpdate(userId, update).lean();

  if (user)
    await Promise.all([
      DatabaseEvent.log(userId, `/contacts/${userId}`, 'DELETE', { user: userId, friend: friendId }),
      notifySync(
        user.tenants[0] || null,
        { userIds: [userId], event: 'CONTACT' },
        {
          bulkWrite: { users: [{ updateOne: { filter: { _id: userId }, update } }] satisfies BulkWrite<UserDocument> },
        },
      ),
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

  const friend = await User.findOne({ _id: friendId, tenants: { $in: userTenants }, ...activeCond }).lean();
  if (!friend) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const now = new Date();
  const { modifiedCount } = await User.updateOne(
    { _id: userId, 'contacts.user': friendId },

    name
      ? { $set: { 'contacts.$.name': name, 'contacts.$.updatedAt': now } }
      : { $set: { 'contacts.$.updatedAt': now }, $unset: { 'contacts.$.name': 1 } },
  );
  if (!modifiedCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return transform(userTenants, friend, [{ user: friend._id, name, updatedAt: now }]);
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
