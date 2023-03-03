/**
 * Controller: Classroom
 *
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import Book from '../models/book';
import Chat from '../models/chat';
import type { ClassroomDocument } from '../models/classroom';
import Classroom, { searchableFields } from '../models/classroom';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import User from '../models/user';
import { idsToString, schoolYear } from '../utils/helper';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark' | 'addStudents' | 'addTeachers' | 'recover' | 'removeStudents' | 'removeTeachers';

const { MSG_ENUM } = LOCALE;
const { CHAT, TENANT, USER } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, isAdmin, isTeacher, paginateSort, searchFilter, select } = common;
const { classroomCoreSchema, classroomExtraSchema, idSchema, querySchema, remarkSchema, removeSchema, userIdsSchema } =
  yupSchema;

/**
 * (helper) only classroom.teachers, tenant.admins have permission to proceed
 */
const checkPermission = async (
  id: string,
  userId: string,
  userTenants: string[],
  isAdmin = false,
  skipDeleteCheck = false,
) => {
  const classroom = await Classroom.findOne({
    _id: id,
    tenant: { $in: userTenants },
    ...(!skipDeleteCheck && { deletedAt: { $exists: false } }),
  }).lean();
  if (!classroom || ![schoolYear(), schoolYear(1)].includes(classroom.year))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (
    !isAdmin &&
    !idsToString(classroom.teachers).includes(userId) &&
    !(await Tenant.findByTenantId(classroom.tenant, userId))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  return classroom;
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  await checkPermission(id, userId, userTenants);

  const classroom = await Classroom.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select([USER.ROLE.ADMIN]), new: true },
  ).lean();

  const userIds = [...idsToString(classroom!.teachers), userId];
  await Promise.all([
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'REMARK', { remark }),
    notify(userIds, 'CLASSROOM', { classroomIds: [id] }),
    syncSatellite({ tenantId: classroom!.tenant, userIds }, { classroomIds: [id] }),
  ]);

  return classroom!;
};

/**
 * Create New Classroom
 */
const create = async (req: Request, args: unknown): Promise<ClassroomDocument> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { tenantId, ...fields } = await classroomCoreSchema.concat(classroomExtraSchema).validate(args);

  const [books, level, subject, tenant] = await Promise.all([
    Book.countDocuments({ _id: { $in: fields.books }, level: fields.level, subjects: fields.subject }),
    Level.countDocuments({ _id: fields.level, deletedAt: { $exists: false } }),
    Subject.countDocuments({ _id: fields.subject, levels: fields.level, deletedAt: { $exists: false } }),
    Tenant.findByTenantId(tenantId, userId, isAdmin(userRoles)), // proceed ONLY if isAdmin or tenantAdmins
  ]);

  if (!userTenants.includes(tenantId) || !tenant.services.includes(TENANT.SERVICE.CLASSROOM))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!level || !subject || fields.books.length !== books) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const classroom = new Classroom<Partial<ClassroomDocument>>({ tenant: tenantId, ...fields });

  await Promise.all([
    classroom.save(),
    DatabaseEvent.log(userId, `/classrooms/${classroom._id}`, 'CREATE', { classroom: fields }),
    notify([userId], 'CLASSROOM', { classroomIds: [classroom._id.toString()] }),
    syncSatellite({ tenantId, userIds: [userId] }, { classroomIds: [classroom._id.toString()] }),
  ]);

  return classroom;
};

/**
 * Create New Classroom (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

// common filter for find() & findMany()
const findCommonFilter = async (req: Request, args: unknown) => {
  const { userId } = auth(req);
  const [{ query }, adminTenants] = await Promise.all([
    querySchema.validate(args),
    Tenant.find({ admins: userId }).lean(),
  ]);

  return searchFilter<ClassroomDocument>(
    searchableFields,
    { query },
    { $or: [{ teachers: userId }, { students: userId }, { tenant: { $in: adminTenants } }] },
  );
};

/**
 * Find Multiple Classroom (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument>[]> => {
  const { userExtra, userRoles } = auth(req);
  const filter = await findCommonFilter(req, args);

  return Classroom.find(
    filter,
    select((await isTeacher(userExtra)) ? [USER.ROLE.ADMIN, ...userRoles] : userRoles),
  ).lean();
};

/**
 * Find Multiple Classrooms with queryString (RESTful)
 * ! year would & should be provided /?search=year
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userExtra, userRoles } = auth(req);
    const filter = await findCommonFilter(req, { query: req.query });
    const options = paginateSort(req.query, { updatedAt: 1 });

    const [total, classrooms] = await Promise.all([
      Classroom.countDocuments(filter),
      Classroom.find(
        filter,
        select((await isTeacher(userExtra)) ? [USER.ROLE.ADMIN, ...userRoles] : userRoles),
        options,
      ).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: classrooms });
  } catch (error) {
    next(error);
  }
};

// // common filter for findByTenantAdmin() & findManyByTenantAdmin()
// const findByTenantAdminCommonFilter = async (req: Request, args: unknown) => {
//   const { userId } = auth(req);
//   const { query, tenantId } = await querySchema.concat(validate(args);

//   await Tenant.findByTenantId(tenantId, userId); // only tenantAdmin could access
//   return searchFilter<ClassroomDocument>(searchableFields, { query }, { tenant: tenantId });
// };

// /**
//  * Find All Classrooms by tenantAdmin (Apollo)
//  */
// const findByTenantAdmin = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument>[]> => {
//   const filter = await findByTenantAdminCommonFilter(req, args);
//   return Classroom.find(filter, select([USER.ROLE.ADMIN])).lean();
// };

// /**
//  * Find All Classrooms by tenantAdmin with queryString (RESTful)
//  */
// const findManyByTenantAdmin: RequestHandler = async (req, res, next) => {
//   try {
//     const filter = await findByTenantAdminCommonFilter(req, { query: req.query });
//     const options = paginateSort(req.query);

//     const [total, classrooms] = await Promise.all([
//       Classroom.countDocuments(filter),
//       Classroom.find(filter, select(), options).lean(),
//     ]);

//     res.status(200).json({ meta: { total, ...options }, data: classrooms });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Find One Classroom by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument> | null> => {
  const { userId, userExtra, userRoles } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<ClassroomDocument>(
    [],
    { query },
    { _id: id, $or: [{ students: userId }, { teachers: userId }] },
  );
  return Classroom.findOne(
    filter,
    select((await isTeacher(userExtra)) ? [USER.ROLE.ADMIN, ...userRoles] : userRoles),
  ).lean();
};

/**
 * Find One Classroom by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const classroom = await findOne(req, { id: req.params.id });
    classroom ? res.status(200).json({ data: classroom }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

const recover = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument>> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  await checkPermission(id, userId, userTenants, isAdmin(userRoles), true); // proceed ONLY if isAdmin or tenantAdmins

  const classroom = await Classroom.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: true } },
    { $unset: { deletedAt: 1 }, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    { fields: select([USER.ROLE.ADMIN]), new: true },
  ).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = [userId, ...idsToString(classroom.teachers), ...idsToString(classroom.students)];
  await Promise.all([
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'RECOVER', { remark }),
    notify(userIds, 'CLASSROOM', { classroomIds: [id] }),
    syncSatellite({ tenantId: classroom.tenant, userIds }, { classroomIds: [id] }),
  ]);

  return classroom;
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  await checkPermission(id, userId, userTenants, isAdmin(userRoles)); // proceed ONLY if isAdmin or tenantAdmins

  const classroom = await Classroom.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
  ).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = [userId, ...idsToString(classroom.teachers), ...idsToString(classroom.students)];
  await Promise.all([
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'DELETE', { remark }),
    notify(userIds, 'CLASSROOM', { classroomIds: [id] }),
    syncSatellite({ tenantId: classroom.tenant, userIds }, { classroomIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete by ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json(await remove(req, { id: req.params.id, ...req.body }));
  } catch (error) {
    next(error);
  }
};

/**
 * Update
 * ! only some fields are mutable

 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<ClassroomDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, ...fields } = await classroomExtraSchema.concat(idSchema).validate(args);

  const originalClassroom = await checkPermission(id, userId, userTenants);

  const userIds = [...idsToString(originalClassroom.teachers), ...idsToString(originalClassroom.students), userId];
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, fields, { fields: select([USER.ROLE.ADMIN]), new: true }).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'UPDATE', { originalClassroom, update: fields }),
    notify(userIds, 'CLASSROOM', { classroomIds: [id] }),
    syncSatellite({ tenantId: originalClassroom.tenant, userIds }, { classroomIds: [id] }),
  ]);

  return classroom!;
};

/**
 * updateMembers: addStudents, addTeachers, removeStudents, removeTeachers
 * note: only classroom teacher or tenantAdmins or admin could update
 */
const updateMembers = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'addStudents' | 'addTeachers' | 'removeStudents' | 'removeTeachers'>,
): Promise<LeanDocument<ClassroomDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);
  const uniqueUserIds = Array.from(new Set(userIds)); // remove duplicated userIds,

  const originalClassroom = await checkPermission(id, userId, userTenants);

  const userCount = await User.countDocuments({ _id: { $in: uniqueUserIds }, tenants: originalClassroom.tenant });
  if (userCount !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const newUsers =
    action === 'addStudents'
      ? uniqueUserIds.filter(x => !idsToString(originalClassroom.students).includes(x))
      : action === 'addTeachers'
      ? uniqueUserIds.filter(x => !idsToString(originalClassroom.teachers).includes(x))
      : [];
  const notifyUserIds = [
    ...idsToString(originalClassroom.teachers),
    ...idsToString(originalClassroom.students),
    ...newUsers,
    userId,
  ];

  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(
      id,
      action === 'addStudents'
        ? { $push: { students: { $each: newUsers } } }
        : action === 'addTeachers'
        ? { $push: { teachers: { $each: newUsers } } }
        : action === 'removeStudents'
        ? { $pull: { students: { $in: uniqueUserIds } } }
        : { $pull: { teachers: { $in: uniqueUserIds } } }, // removeTeachers
      { fields: select([USER.ROLE.ADMIN]), new: true },
    ).lean(),
    action === 'addStudents' || action === 'addTeachers'
      ? Promise.all([
          // undo (pull) 'REMOVED' from members.flags whom previously removed
          Chat.updateMany(
            { _id: { $in: originalClassroom.chats }, 'members.user': { $in: uniqueUserIds } },
            { $pull: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
            { arrayFilters: [{ 'elem.user': { $in: uniqueUserIds } }], multi: true },
          ),
          // add newMembers into chat.members
          Chat.updateMany(
            { _id: { $in: originalClassroom.chats }, 'members.user': { $nin: uniqueUserIds } },
            { $addToSet: { members: { $each: uniqueUserIds.map(user => ({ user, flags: [] })) } } },
          ),
        ])
      : Chat.updateMany(
          { _id: { $in: originalClassroom.chats }, 'members.user': { $in: uniqueUserIds } },
          { $push: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
          { arrayFilters: [{ 'elem.user': { $in: uniqueUserIds } }], multi: true },
        ),

    DatabaseEvent.log(userId, `/classrooms/${id}`, 'UPDATE', { action, originalClassroom, userIds }),
    notify(notifyUserIds, 'CLASSROOM', { classroomIds: [id], chatIds: idsToString(originalClassroom.chats) }),
    syncSatellite(
      { tenantId: originalClassroom.tenant, userIds: notifyUserIds },
      { classroomIds: [id], chatIds: idsToString(originalClassroom.chats) },
    ),
  ]);

  return classroom!;
};

/**
 * Update Chat (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, ...req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'addStudents':
      case 'addTeachers':
      case 'removeStudents':
      case 'removeTeachers':
        return res.status(200).json({ data: await updateMembers(req, { id, ...req.body }, action) });
      case 'recover':
        return res.status(200).json({ data: await recover(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addRemark,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  recover,
  remove,
  removeById,
  update,
  updateById,
  updateMembers,
};
