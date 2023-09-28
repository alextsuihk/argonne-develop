/**
 * Controller: Tutor
 *
 * note: tutoring schools are ONLY supported in Hub mode, no need to sync satellite
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import mongoose, { Types, UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import type { Id, TutorDocument } from '../models/tutor';
import Tutor, { searchableFields } from '../models/tutor';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import { mongoId } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';

type Action =
  | 'addCredential'
  | 'addRemark'
  | 'addSpecialty'
  | 'removeCredential'
  | 'removeSpecialty'
  | 'verifyCredential';

const { MSG_ENUM } = LOCALE;
const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const { assertUnreachable, auth, hubModeOnly, paginateSort, searchFilter, select } = common;
const {
  idSchema,
  querySchema,
  remarkSchema,
  removeSchema,
  tenantIdSchema,
  tutorCredentialIdSchema,
  tutorCredentialSchema,
  tutorSchema,
  tutorSpecialtyIdSchema,
  tutorSpecialtySchema,
  userIdSchema,
} = yupSchema;

/**
 * hide deleted specialties ; hide credential's proofs for non-owner, non tenantAdmin, remove deleted specialties
 */
const transform = (tutor: TutorDocument & Id, userId: string | Types.ObjectId, isAdmin?: boolean) => ({
  ...tutor,

  credentials: tutor.credentials.map(({ proofs, ...rest }) => ({
    ...rest,
    proofs: isAdmin || tutor.user.equals(userId) ? proofs : [], // show only to owner (or admin)
  })),

  specialties: tutor.specialties.filter(s => !s.deletedAt),

  remarks: isAdmin ? tutor.remarks : [], // show for admin only
});

/**
 * Add Remark
 * only tenantAdmin could addRemark
 */
const addRemark = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const original = await Tutor.findOne({ _id: id, deleted: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant, userId);

  const update: UpdateQuery<TutorDocument> = { $push: { remarks: { t: new Date(), u: userId, m: remark } } };
  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(id, update, { fields: select([USER.ROLE.ADMIN]), new: true }).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'REMARK', { args }),
    notifySync(
      original.tenant,
      { userIds: [...admins, original.user], event: 'TUTOR' },
      { bulkWrite: { tutors: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TutorDocument> } },
    ),
  ]);
  if (tutor) return transform(tutor, userId, true);
  log('error', 'tutorController:addRemark()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create
 * only tenantAdmin could add tutor
 * note!: if tutor exists, just un-delete & return (keeping all statistics)
 *
 * ! ONLY identifiable User could be added as tutor
 */
const create = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();

  const { userId, userLocale } = auth(req);
  const { tenantId, userId: tutorUserId } = await tenantIdSchema.concat(userIdSchema).validate(args);

  const [tenant, existingTutor, tutorUser] = await Promise.all([
    Tenant.findByTenantId(tenantId, userId),
    Tutor.findOne({ tenant: tenantId, user: tutorUserId }).lean(),
    User.findOneActive({
      _id: tutorUserId,
      identifiedAt: { $gte: addYears(Date.now(), -1 * DEFAULTS.USER.IDENTIFIABLE_EXPIRY) },
    }),
  ]);

  if (!tenant.services.includes(TENANT.SERVICE.TUTOR)) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!tutorUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const newTutor = new Tutor<Partial<TutorDocument>>({ user: tutorUser._id, tenant: tenant._id });
  const tutorId = (existingTutor ?? newTutor)._id;

  const msg = {
    enUS: `${tutorUser.name}, you are now a tutor of ${tenant.name.enUS}.`,
    zhCN: `${tutorUser.name},你已成为${tenant.name.zhCN}之导师。`,
    zhHK: `${tutorUser.name},你已成為${tenant.name.zhHK}的導師。`,
  };

  const update: UpdateQuery<TutorDocument> = existingTutor
    ? {
        $unset: { deletedAt: 1 },
        specialties: existingTutor.specialties.map(({ deletedAt: _, ...specialty }) => specialty),
      }
    : {};
  const [updatedTutor] = await Promise.all([
    existingTutor &&
      Tutor.findByIdAndUpdate(existingTutor, update, { fields: select([USER.ROLE.ADMIN]), new: true }).lean(),
    !existingTutor && newTutor.save(), // save as new tutor if not previously exists
    startChatGroup(tenant._id, msg, [...tenant.admins, tutorUserId], userLocale, `TUTOR#${tutorId}`),
    DatabaseEvent.log(userId, `/tutors/${tutorId}`, 'CREATE', { args }),
    notifySync(
      tenant._id,
      { userIds: [...tenant.admins, tutorUserId], event: 'TUTOR' },
      {
        bulkWrite: {
          tutors: [
            existingTutor
              ? { updateOne: { filter: { _id: existingTutor._id }, update } }
              : { insertOne: { document: newTutor.toObject() } },
          ] satisfies BulkWrite<TutorDocument>,
        },
      },
    ),
  ]);

  if (updatedTutor) return transform(updatedTutor, userId, true);
  if (!existingTutor) return transform(newTutor.toObject(), userId, true);
  log('error', 'tutorController:create()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create New Tutor (RESTful)
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
  const { userId, userExtra, userTenants } = auth(req);
  const [{ query }, levels, adminTenants] = await Promise.all([
    querySchema.validate(args),
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.findAdminTenants(userId, userTenants),
  ]);

  const teacherLevelId = levels.find(({ code }) => code === 'TEACHER')?._id;
  const naLevelId = levels.find(({ code }) => code === 'NA')?._id;
  const adminTenantIds = adminTenants.map(t => t._id.toString()); // cast toString() because of merge.all() limitation
  if (!teacherLevelId || !naLevelId) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const extra: Record<'$or', Record<string, unknown>[]> = {
    $or: [
      { user: userId },
      {
        tenant: { $in: userTenants },
        'specialties.level':
          !!userExtra?.level && !teacherLevelId.equals(userExtra.level)
            ? { $in: [userExtra.level.toString(), naLevelId.toString()] } // cast toString() because of merge.all() limitation in searchFilter() [merge.all cannot handle ObjectId()]
            : naLevelId.toString(), // cast toString() because of merge.all() limitation in searchFilter()
      },
      ...(adminTenantIds.length ? [{ tenant: { $in: adminTenantIds } }] : []), // tenantAdmin could get all tutors of his/her tenants
    ],
  };

  // tenantAdmin could get all tutors of his/her tenants
  // if (adminTenantIds.length) extra.$or = [...extra.$or, { tenant: { $in: adminTenantIds } }];
  return { filter: searchFilter<TutorDocument>(searchableFields, { query }, extra), adminTenantIds };
};

/**
 * Find Multiple Tutors (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(TutorDocument & Id)[]> => {
  const { userId } = auth(req);
  const { filter, adminTenantIds } = await findCommonFilter(req, args);

  const tutors = await Tutor.find(filter, select([USER.ROLE.ADMIN])).lean();

  return tutors.map(tutor =>
    transform(
      tutor,
      userId,
      adminTenantIds.some(tid => tutor.tenant.equals(tid)),
    ),
  );
};

/**
 * Find Multiple Tutors with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { filter, adminTenantIds } = await findCommonFilter(req, { query: req.query });
    const options = paginateSort(req.query);

    const [total, tutors] = await Promise.all([
      Tutor.countDocuments(filter),
      Tutor.find(filter, select([USER.ROLE.ADMIN]), options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: tutors.map(tutor =>
        transform(
          tutor,
          userId,
          adminTenantIds.some(tid => tutor.tenant.equals(tid)),
        ),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Tutor by ID
 */
const findOne = async (req: Request, args: unknown): Promise<(TutorDocument & Id) | null> => {
  const { userId, userTenants } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<TutorDocument>(searchableFields, { query }, { _id: id, tenant: { $in: userTenants } });
  const [adminTenants, tutor] = await Promise.all([
    Tenant.findAdminTenants(userId, userTenants),
    Tutor.findOne(filter, select([USER.ROLE.ADMIN])).lean(),
  ]);

  return (
    tutor &&
    transform(
      tutor,
      userId,
      adminTenants.some(t => t._id.equals(tutor.tenant.toString())),
    )
  );
};

/**
 * Find One Tutor by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const tutor = await findOne(req, { id: req.params.id });
    tutor ? res.status(200).json({ data: tutor }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a Credential
 * (by tutor)
 */
const addCredential = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, ...inputFields } = await idSchema.concat(tutorCredentialSchema).validate(args);

  const update: UpdateQuery<TutorDocument> = {
    $push: { credentials: { _id: mongoId(), ...inputFields, updatedAt: new Date() } },
  };
  const tutor = await Tutor.findOneAndUpdate({ _id: id, user: userId, deletedAt: { $exists: false } }, update, {
    fields: select(),
    new: true,
  }).lean();
  if (!tutor) throw { statusCode: 422, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const { admins } = await Tenant.findByTenantId(tutor.tenant);

  const { title } = inputFields;
  const msg = {
    enUS: `A new user credential is added: ${title}, please provide proofs for manual verification`,
    zhCN: `刚上传学历资料：${title}，请提供证明文伴，等待人工审核。`,
    zhHK: `剛上傳學歷資料：${title}，請提供證明文件，等待人工審核。`,
  };

  const credentialId = tutor.credentials.find(c => c.title === title)?._id.toString();
  const [transformed] = await Promise.all([
    transform(
      tutor,
      userId,
      admins.some(admin => admin.equals(userId)),
    ),
    startChatGroup(tutor.tenant, msg, [...admins, userId], userLocale, `TUTOR#${id}`),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'addCredential', { args, credentialId }),
    notifySync(
      tutor.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      { bulkWrite: { tutors: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TutorDocument> } },
    ),
  ]);

  return transformed;
};

/**
 * Remove a credential
 * (by tutor)
 */
const removeCredential = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, credentialId } = await idSchema.concat(tutorCredentialIdSchema).validate(args);

  const original = await Tutor.findOne({
    _id: id,
    user: userId,
    'credentials._id': credentialId,
    deletedAt: { $exists: false },
  }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { admins } = await Tenant.findByTenantId(original.tenant);

  const update: UpdateQuery<TutorDocument> = {
    credentials: original.credentials.filter(c => !c._id.equals(credentialId)),
  };
  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(id, update, { field: select(), new: true }).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'removeCredential', {
      args,
      originalCredential: original.credentials.find(c => c._id.equals(credentialId)),
    }),
    notifySync(
      original.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      { bulkWrite: { tutors: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TutorDocument> } },
    ),
  ]);

  if (tutor)
    return transform(
      tutor,
      userId,
      admins.some(admin => admin.equals(userId)),
    );
  log('error', 'tutorController:removeCredential()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Verify
 * only tenantAdmin could verify credentials
 */
const verifyCredential = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, credentialId } = await idSchema.concat(tutorCredentialIdSchema).validate(args);

  // only tenantAdmin could verify credentials
  const original = await Tutor.findOne({ _id: id, 'credentials._id': credentialId, deletedAt: { $exists: false } });
  const credential = original?.credentials.find(c => c._id.equals(credentialId));

  if (!original || !credential) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant, userId);

  const msg = {
    enUS: `Tutor credential is verified: ${credential.title}.`,
    zhCN: `学历资料完成审批：${credential.title}。`,
    zhHK: `學歷資料完成審批：${credential.title}。`,
  };
  const [tutor] = await Promise.all([
    Tutor.findOneAndUpdate(
      { _id: id, 'credentials._id': credentialId },
      { $set: { 'credentials.$.verifiedAt': new Date() } },
      { fields: select([USER.ROLE.ADMIN]), new: true },
    ).lean(),
    startChatGroup(original.tenant, msg, [...admins, original.user], userLocale, `TUTOR#${id}`),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'verifyCredential', { args }),
    notifySync(
      original.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      {
        bulkWrite: {
          tutors: [
            {
              updateOne: {
                filter: { _id: id, 'credentials._id': credentialId },
                update: { $set: { 'credentials.$.verifiedAt': new Date() } },
              },
            },
          ] satisfies BulkWrite<TutorDocument>,
        },
      },
    ),
  ]);

  if (tutor) return transform(tutor, userId, true);
  log('error', 'tutorController:verifyCredential()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 *  Add a Specialty
 * (by tutor)
 */
const addSpecialty = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, ...inputFields } = await idSchema.concat(tutorSpecialtySchema).validate(args);

  const [original, level, subject] = await Promise.all([
    Tutor.findOne({ _id: id, user: userId, deletedAt: { $exists: false } }).lean(),
    Level.findOne({ _id: inputFields.level, deletedAt: { $exists: false } }).lean(),
    Subject.findOne({ _id: inputFields.subject, levels: inputFields.level, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!Object.keys(QUESTION.LANG).includes(inputFields.lang) || !original || !level || !subject)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const specialtyId = original.specialties.find(
    s => s.subject.equals(inputFields.subject) && s.level.equals(inputFields.level) && s.lang === inputFields.lang,
  )?._id;

  const { admins } = await Tenant.findByTenantId(original.tenant);

  const msg = {
    enUS: `A new tutor specialty is added: ${level.name.enUS}-${subject.name.enUS}`,
    zhCN: `刚上传专展资料：${level.name.zhCN}-${subject.name.zhCN}。`,
    zhHK: `剛上傳專長資料：${level.name.zhHK}-${subject.name.zhHK}。`,
  };

  const update: UpdateQuery<TutorDocument> = {
    $push: {
      specialties: {
        _id: mongoId(),
        ...inputFields,
        level: level._id,
        subject: subject._id,
        priority: 0,
        ranking: { updatedAt: new Date() },
      },
    },
  };
  const [tutor] = await Promise.all([
    specialtyId
      ? // un-delete specialty
        await Tutor.findOneAndUpdate(
          { _id: id, 'specialties._id': specialtyId },
          {
            $set: { 'specialties.$.note': inputFields.note },
            $unset: { 'specialties.$.deletedAt': 1 },
          },
          { fields: select(), new: true },
        ).lean()
      : // add a new specialty
        await Tutor.findOneAndUpdate({ _id: id }, update, { fields: select(), new: true }).lean(),
    startChatGroup(original.tenant, msg, [...admins, userId], userLocale, `TUTOR#${id}`),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'addSpecialty', { args, specialtyId }),
    notifySync(
      original.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      {
        bulkWrite: {
          tutors: [
            {
              updateOne: specialtyId
                ? {
                    filter: { _id: id, 'specialties._id': specialtyId },
                    update: {
                      $set: { 'specialties.$.note': inputFields.note },
                      $unset: { 'specialties.$.deletedAt': 1 },
                    },
                  }
                : { filter: { _id: id }, update },
            },
          ] satisfies BulkWrite<TutorDocument>,
        },
      },
    ),
  ]);

  if (tutor)
    return transform(
      tutor,
      userId,
      admins.some(admin => admin.equals(userId)),
    );
  log('error', 'tutorController:addSpecialty()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Delete Specialty by ID (by tutor)
 * ! (to keep ranking info, only update deletedAt, to hide the entry)
 */
const removeSpecialty = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, specialtyId } = await idSchema.concat(tutorSpecialtyIdSchema).validate(args);

  const tutor = await Tutor.findOneAndUpdate(
    { _id: id, user: userId, 'specialties._id': specialtyId, deletedAt: { $exists: false } },
    { $set: { 'specialties.$.deletedAt': new Date() } },
    { field: select(), new: true },
  ).lean();
  if (!tutor) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { admins } = await Tenant.findByTenantId(tutor.tenant);
  await Promise.all([
    DatabaseEvent.log(userId, `/tutors/${id}`, 'removeSpecialty', { args }),
    notifySync(
      tutor.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      {
        bulkWrite: {
          tutors: [
            {
              updateOne: {
                filter: { _id: id, 'specialties._id': specialtyId },
                update: { $set: { 'specialties.$.deletedAt': new Date() } },
              },
            },
          ] satisfies BulkWrite<TutorDocument>,
        },
      },
    ),
  ]);

  return transform(
    tutor,
    userId,
    admins.some(admin => admin.equals(userId)),
  );
};

/**
 * Delete by ID
 * (by tenantAdmin)
 *
 * note!: keep specialties ranking data, only marked with deleted
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const original = await Tutor.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant, userId);

  const update: UpdateQuery<TutorDocument> = {
    $unset: { intro: 1, officeHour: 1 },
    credentials: [],
    specialties: original.specialties.map(specialty => ({ ...specialty, deletedAt: new Date() })),
    deletedAt: new Date(),
    ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
  };
  await Promise.all([
    Tutor.updateOne({ _id: id }, update),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'DELETE', { args, original }),
    notifySync(
      original.tenant,
      { userIds: [...admins, original.user], event: 'TUTOR' },
      { bulkWrite: { tutors: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TutorDocument> } },
    ),
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
 * Update Tutor (intro & officeHour)
 */
const update = async (req: Request, args: unknown): Promise<TutorDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, intro, officeHour } = await idSchema.concat(tutorSchema).validate(args);

  const original = await Tutor.findOne({ _id: id, user: userId, deleted: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant);

  const update: UpdateQuery<TutorDocument> = {
    intro,
    ...(officeHour ? { officeHour } : { $unset: { officeHour: 1 } }),
  };
  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(id, update, { fields: select(), new: true }).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'UPDATE', {
      args,
      intro: original.intro,
      officeHour: original.officeHour,
    }),
    notifySync(
      original.tenant,
      { userIds: [...admins, userId], event: 'TUTOR' },
      { bulkWrite: { tutors: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TutorDocument> } },
    ),
  ]);

  if (tutor)
    return transform(
      tutor,
      userId,
      admins.some(admin => admin.equals(userId)),
    );
  log('error', 'tutorController:update()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Tutor (credentials & specialties) (RESTful)
 */
const updateById: RequestHandler<{ id?: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, ...req.body }) });
      case 'addCredential':
        return res.status(200).json({ data: await addCredential(req, { id, ...req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'addSpecialty':
        return res.status(200).json({ data: await addSpecialty(req, { id, ...req.body }) });
      case 'removeCredential':
        return res.status(200).json({ data: await removeCredential(req, { id, ...req.body }) });
      case 'removeSpecialty':
        return res.status(200).json({ data: await removeSpecialty(req, { id, ...req.body }) });
      case 'verifyCredential':
        return res.status(200).json({ data: await verifyCredential(req, { id, ...req.body }) });
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
  addCredential,
  addSpecialty,
  find,
  findMany,
  findOne,
  findOneById,
  remove,
  removeById,
  removeCredential,
  removeSpecialty,
  update,
  updateById,
  verifyCredential,
};
