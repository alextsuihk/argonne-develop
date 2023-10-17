// TODO: updateTag() not in use, move into individual controller

/**
 * Common Type & Helpers for controller
 *
 * Mongoose's filter, select, populate processing for REST-ful & Apollo
 *
 */

import type { QuerySchema } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import type { Request } from 'express';
import type { FilterQuery, Types } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from '../models/common';
import Level from '../models/level';
import type { UserDocument } from '../models/user';
import User, { activeCond } from '../models/user';
import { containUtf8, schoolYear } from '../utils/helper';
import type { Auth } from '../utils/token';

type AuthRole = 'ADMIN' | 'ROOT';
export type StatusResponse = { code: string };
export type TokenWithExpireAtResponse = { token: string; expireAt: Date };

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const DELETED_LOCALE = { enUS: '<Record Deleted>', zhCN: '<已被删除>', zhHK: '<已被刪除>' };
const DELETED = DELETED_LOCALE.enUS;

/**
 * Assert when reaching unreachable
 */
const assertUnreachable = (_: never) => {
  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * Authorization based on userRoles
 */
const auth = (req: Request, role?: AuthRole): Auth => {
  const { userExtra, userFlags, userId, userLocale, userName, userRoles, userTenants, authUserId } = req;
  if (!userFlags || !userId || !userLocale || !userName || !userRoles || !userTenants)
    throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };

  if (role === 'ADMIN' && !isAdmin(userRoles)) throw { statusCode: 403, code: MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN };
  if (role === 'ROOT' && !isRoot(userRoles)) throw { statusCode: 403, code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT };

  return { userExtra, userFlags, userId, userLocale, userName, userRoles, userTenants, authUserId };
};

/**
 * Get gull user info (after checking suspension)
 */
const authCheckUserSuspension = async (req: Request): Promise<UserDocument> => {
  const user = await authGetUser(req);

  if (user.suspendUtil && user.suspendUtil < new Date()) throw { statusCode: 403, code: MSG_ENUM.SUBMISSION_SUSPENDED };
  return user;
};

/**
 * Get full user info
 */
const authGetUser = async (req: Request, role?: AuthRole): Promise<UserDocument> => {
  const { userId } = auth(req, role);
  if (!req.user) {
    const user = await User.findOne({ _id: userId, ...activeCond }).lean();
    if (!user) throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };
    req.user = user;
  }
  return req.user;
};

/**
 * Operation is NOT supported in satellite mode
 */
const satelliteModeOnly = (): void => {
  if (config.mode !== 'SATELLITE') throw { statusCode: 400, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};

const hubModeOnly = (): void => {
  if (config.mode !== 'HUB') throw { statusCode: 400, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};

/**
 * Accessible by guest only
 */
const guest = ({ userId }: Request): void => {
  if (userId) throw { statusCode: 403, code: MSG_ENUM.AUTH_GUEST_ONLY };
};

/**
 * Check if user has a specific role
 */
const hasRole = (userRoles: string[], role: string): boolean => !!userRoles?.includes(role);

/**
 * Check if user has admin role
 */
const isAdmin = (userRoles?: string[]): boolean => !!userRoles?.includes(USER.ROLE.ADMIN);

/**
 * Check if user has root role
 */
const isRoot = (userRoles?: string[]): boolean => !!userRoles?.includes(USER.ROLE.ROOT);

/**
 * Check if user is current a teacher
 */
let teacherLevelId: Types.ObjectId | undefined; // simple caching (this is basically a constant)
const isTeacher = async (userExtra: Auth['userExtra']): Promise<boolean> => {
  if (!userExtra) return false;

  teacherLevelId ||= (await Level.exists({ code: 'TEACHER' }))?._id;
  const [prevSchoolYear, currSchoolYear, nextSchoolYear] = [schoolYear(-1), schoolYear(), schoolYear(1)];

  return (
    !!teacherLevelId &&
    teacherLevelId.equals(userExtra.level) &&
    (new Date().getMonth() === 7 || new Date().getMonth() === 8
      ? [prevSchoolYear, currSchoolYear, nextSchoolYear].includes(userExtra.year)
      : currSchoolYear === userExtra.year)
  );
};

/**
 * Setup Pagination & Sort parameters
 */
const paginateSort = (
  query: { limit?: string; skip?: string; orderBy?: string; sortOrder?: 1 | -1 },
  defaultSort: Record<string, 1 | -1> = { id: 1 },
): { limit: number; skip: number; sort: Record<string, 1 | -1> } => {
  const limit = Number(query.limit) || DEFAULTS.PAGINATION;
  const skip = Number(query.skip) || 0;

  const { orderBy, sortOrder = 1 } = query;
  const sort =
    orderBy && (sortOrder === 1 || sortOrder === -1) ? Object.fromEntries([[orderBy, sortOrder]]) : defaultSort;

  return { limit, skip, sort };
};

/**
 * Setup Filter with SearchWords parameters
 * @param { SearchFields, searchLocaleFields}
 * @param { search, updatedAfter, updatedBefore}: queryString
 * ! Caveat: mongo text search does not work, "元朗區" as a single word, searching "元朗" will not work
 */
const searchFilter = <T extends BaseDocument>(
  searchableFields: string[],
  { query }: QuerySchema,
  extra?: FilterQuery<T>,
): FilterQuery<T> => {
  const { search, updatedBefore, updatedAfter, skipDeleted } = query;

  const updatedAt = {
    ...(updatedAfter && { $gte: updatedAfter }),
    ...(updatedBefore && { $lte: updatedBefore }),
  };

  const filter: FilterQuery<T> = {
    ...(Object.keys(updatedAt).length && { updatedAt }),
    ...(skipDeleted && { deletedAt: { $exists: false } }),
    ...extra,
    ...(search && !containUtf8(search) && { $text: { $search: search } }),
  };

  if (!searchableFields.length || !search || !containUtf8(search)) return filter;

  // otherwise, do a full document dump search with regular expression
  const searchWords = search.startsWith('"') && search.endsWith('"') ? [search.slice(1, -1)] : search.split(' '); // if queryString starts & ends with double-quote, just remove double-quotes and search with entire sentence

  const searchWordFilters = searchWords
    .map(word => searchableFields.map(field => Object.fromEntries([[field, new RegExp(word, 'i')]])))
    .flat();

  return Object.hasOwn(filter, '$or')
    ? ({ $and: [filter, { $or: searchWordFilters }] } as FilterQuery<T>)
    : ({ ...filter, $or: searchWordFilters } as FilterQuery<T>);
};

/**
 * Query Projection (select)
 */
const select = (userRoles?: string[], roleSelect = { admin: '-__v -idx', normal: '-__v -idx -remarks' }) =>
  roleSelect[isAdmin(userRoles) ? 'admin' : 'normal'];

export default {
  DELETED,
  DELETED_LOCALE,
  assertUnreachable,
  auth,
  authCheckUserSuspension,
  authGetUser,
  guest,
  hubModeOnly,
  hasRole,
  isAdmin,
  isRoot,
  isTeacher,
  paginateSort,
  satelliteModeOnly,
  searchFilter,
  select,
};
