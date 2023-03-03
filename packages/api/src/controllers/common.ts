// TODO: updateTag() not in use, move into individual controller

/**
 * Common Type & Helpers for controller
 *
 * Mongoose's filter, select, populate processing for REST-ful & Apollo
 *
 */

import type { Query } from '@argonne/common';
import { LOCALE, yupSchema } from '@argonne/common';
import merge from 'deepmerge';
import type { Request } from 'express';
import type { FilterQuery, LeanDocument } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from '../models/common/base';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import Level from '../models/level';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { containUtf8, schoolYear } from '../utils/helper';
import type { Auth } from '../utils/token';
import { verifyContentIds } from '../utils/token';
export { signContentIds } from '../utils/token';

type AuthRole = 'ADMIN' | 'ROOT';

export type StatusResponse = { code: string };

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const { idSchema, tokenSchema, updatedAfterSchema } = yupSchema;

const DELETED_LOCALE = { enUS: '<Record Deleted>', zhCN: '<已被删除>', zhHK: '<已被刪除>' };
const DELETED = DELETED_LOCALE.enUS;

const defaultSelect = {
  admin: '-__v -idx',
  normal: '-__v -idx -remarks',
};

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
  const { userExtra, userFlags, userId, userLocale, userName, userRoles, userScopes, userTenants, authUserId } = req;
  if (!userFlags || !userId || !userLocale || !userName || !userRoles || !userScopes || !userTenants)
    throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };

  if (!userTenants) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR }; // publisherAdmin might not be in any tenants

  if (role === 'ADMIN' && !isAdmin(userRoles)) throw { statusCode: 403, code: MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN };
  if (role === 'ROOT' && !isRoot(userRoles)) throw { statusCode: 403, code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT };

  return { userExtra, userFlags, userId, userLocale, userName, userRoles, userScopes, userTenants, authUserId };
};

/**
 *
 */
const authCheckUserSuspension = async (req: Request): Promise<void> => {
  const user = await authGetUser(req);
  if (user.suspension && user.suspension < new Date()) throw { statusCode: 403, code: MSG_ENUM.SUBMISSION_SUSPENDED };
};

/**
 * Get (cached) User based on req.userId
 * note: Apollo query would only need to query user once
 */
const authGetUser = async (req: Request, role?: AuthRole): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req, role);
  if (!req.user) {
    const user = await User.findOneActive({ _id: userId });
    if (!user) throw { statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR };
    req.user = user;
  }
  return req.user;
};

/**
 * Find single Content (Apollo)
 */
const findContent = async (req: Request, args: unknown): Promise<LeanDocument<ContentDocument> | null> => {
  const { userId } = auth(req);
  const { id, token, updatedAfter } = await idSchema.concat(tokenSchema).concat(updatedAfterSchema).validate(args);
  await verifyContentIds(userId, id, token);

  return Content.findOne({ _id: id, ...(updatedAfter && { updatedAt: { $gt: updatedAfter } }) });
};

/**
 * Operation is NOT supported in cloud/satellite mode
 */
// const satelliteModeOnly = (): void => {
//   if (config.mode !== 'SATELLITE') throw { statusCode: 400, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
// };

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
let teacherLevelId: string | undefined; // simple caching (this is basically a constant)
const isTeacher = async (userExtra: Auth['userExtra']) => {
  if (!userExtra) return false;

  teacherLevelId ||= (await Level.findOne({ code: 'TEACHER' }).lean())?._id.toString();
  const [prevSchoolYear, currSchoolYear, nextSchoolYear] = [schoolYear(-1), schoolYear(), schoolYear(1)];

  return (
    userExtra.level == teacherLevelId &&
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
  { query }: Query,
  extra?: FilterQuery<T>,
): FilterQuery<T> => {
  const { search, updatedBefore, updatedAfter, skipDeleted } = query;

  const filter = merge.all<FilterQuery<T>>([
    updatedAfter ? { updatedAt: { $gte: updatedAfter } } : {},
    updatedBefore ? { updatedAt: { $lte: updatedBefore } } : {},
    skipDeleted ? { deletedAt: { $exists: false } } : {},
    extra ?? {},
    search && !containUtf8(search) ? { $text: { $search: search } } : {}, // use mongoDB built-in text search for non-UTF8 search
  ]);

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
const select = (userRoles?: string[], roleSelect = defaultSelect) =>
  roleSelect[isAdmin(userRoles) ? 'admin' : 'normal'];

export default {
  DELETED,
  DELETED_LOCALE,
  assertUnreachable,
  auth,
  authCheckUserSuspension,
  authGetUser,
  findContent,
  guest,
  hubModeOnly,
  hasRole,
  isAdmin,
  isRoot,
  isTeacher,
  paginateSort,
  // satelliteModeOnly,
  searchFilter,
  select,
};
