/**
 * Controller: Tutor
 *
 * note: tutoring schools are ONLY supported in Hub mode, no need to sync satellite
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument, Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import type { TutorDocument } from '../models/tutor';
import Tutor, { searchableFields } from '../models/tutor';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import { idsToString } from '../utils/helper';
import { notify } from '../utils/messaging';
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
const transform = (tutor: LeanDocument<TutorDocument>, userId: string | Types.ObjectId, isAdmin?: boolean) => ({
  ...tutor,

  credentials: tutor.credentials.map(({ proofs, ...rest }) => ({
    ...rest,
    proofs: isAdmin || tutor.user.toString() === userId.toString() ? proofs : [], // show only to owner (or admin)
  })),

  specialties: tutor.specialties.filter(s => !s.deletedAt),

  remarks: isAdmin ? tutor.remarks : [], // show for admin only
});

/**
 * Add Remark
 * only tenantAdmin could addRemark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const original = await Tutor.findOne({ _id: id, deleted: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant);

  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(
      id,
      { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
      { fields: select([USER.ROLE.ADMIN]), new: true },
    ).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'REMARK', { remark }),
    notify(admins, 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor!, userId, true);
};

/**
 * Create
 * only tenantAdmin could add tutor
 * note!: if tutor exists, just un-delete & return (keeping all statistics)
 *
 * ! ONLY identifiable User could be added as tutor
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
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

  const newTutor = new Tutor<Partial<TutorDocument>>({ user: tutorUserId, tenant: tenantId });
  const tutor = existingTutor ?? newTutor;

  const msg = {
    enUS: `${tutorUser.name}, you are now a tutor of ${tenant.name.enUS}.`,
    zhCN: `${tutorUser.name},你已成为${tenant.name.zhCN}之导师。`,
    zhHK: `${tutorUser.name},你已成為${tenant.name.zhHK}的導師。`,
  };

  const [finalTutor] = await Promise.all([
    existingTutor
      ? Tutor.findByIdAndUpdate(
          existingTutor,
          {
            $unset: { deletedAt: 1 },
            specialties: existingTutor.specialties.map(({ deletedAt: _, ...specialty }) => specialty),
          },
          { fields: select([USER.ROLE.ADMIN]), new: true },
        )
      : newTutor.save(), // save as new tutor if not previously exists
    startChatGroup(tenantId, msg, [...tenant.admins, tutorUserId], userLocale, `TUTOR#${tutor._id}`),
    DatabaseEvent.log(userId, `/tutors/${tutor._id}`, 'CREATE', { tenantId, tutorUserId }),
    notify([...tenant.admins, tutorUserId], 'TUTOR', { tutorIds: [tutor._id.toString()] }),
  ]);

  return transform(finalTutor!.toObject(), userId, true);
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
    Tenant.find({ _id: { $in: userTenants }, admins: userId, deletedAt: { $exists: false } }).lean(),
  ]);

  const teacherLevelId = levels.find(({ code }) => code === 'TEACHER')?._id.toString();
  const naLevelId = levels.find(({ code }) => code === 'NA')?._id.toString();
  if (!teacherLevelId || !naLevelId) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const extra: Record<'$or', Record<string, unknown>[]> = {
    $or: [
      { user: userId },
      {
        tenant: { $in: userTenants },
        'specialties.level':
          !!userExtra?.level && userExtra.level !== teacherLevelId ? { $in: [userExtra.level, naLevelId] } : naLevelId,
      },
    ],
  };

  // tenantAdmin could get all tutors of his/her tenants
  if (adminTenants.length) extra.$or = [...extra.$or, { tenant: { $in: idsToString(adminTenants) } }];

  return { filter: searchFilter<TutorDocument>(searchableFields, { query }, extra), adminTenants };
};

/**
 * Find Multiple Tutors (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>[]> => {
  const { userId } = auth(req);
  const { filter, adminTenants } = await findCommonFilter(req, args);

  const tutors = await Tutor.find(filter, select([USER.ROLE.ADMIN])).lean();
  return tutors.map(tutor => transform(tutor, userId, idsToString(adminTenants).includes(tutor.tenant.toString())));
};

/**
 * Find Multiple Tutors with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { filter, adminTenants } = await findCommonFilter(req, { query: req.query });
    const options = paginateSort(req.query);

    const [total, tutors] = await Promise.all([
      Tutor.countDocuments(filter),
      Tutor.find(filter, select([USER.ROLE.ADMIN]), options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: tutors.map(tutor => transform(tutor, userId, idsToString(adminTenants).includes(tutor.tenant.toString()))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Tutor by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument> | null> => {
  const { userId, userTenants } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<TutorDocument>(searchableFields, { query }, { _id: id, tenant: { $in: userTenants } });
  const [adminTenants, tutor] = await Promise.all([
    Tenant.find({ admins: userId, deletedAt: { $exists: false } }).lean(),
    Tutor.findOne(filter, select([USER.ROLE.ADMIN])).lean(),
  ]);

  return tutor && transform(tutor, userId, idsToString(adminTenants).includes(tutor.tenant.toString()));
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
const addCredential = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, ...fields } = await idSchema.concat(tutorCredentialSchema).validate(args);

  const tutor = await Tutor.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: { $exists: false } },
    { $push: { credentials: { ...fields, updatedAt: new Date() } } },
    { fields: select(), new: true },
  ).lean();
  if (!tutor) throw { statusCode: 422, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const { admins } = await Tenant.findByTenantId(tutor.tenant);

  const { title } = fields;
  const msg = {
    enUS: `A new user credential is added: ${title}, please provide proofs for manual verification`,
    zhCN: `刚上传学历资料：${title}，请提供证明文伴，等待人工审核。`,
    zhHK: `剛上傳學歷資料：${title}，請提供證明文件，等待人工審核。`,
  };

  const credentialId = tutor.credentials.find(c => c.title === title)?._id.toString();
  await Promise.all([
    startChatGroup(tutor.tenant, msg, [...admins, userId], userLocale, `TUTOR#${id}`),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'addCredential', { credentialId, ...fields }),
    notify([...admins, userId], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor, userId);
};

/**
 * Remove a credential
 * (by tutor)
 */
const removeCredential = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
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

  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(
      id,
      { credentials: original.credentials.filter(c => c._id.toString() !== credentialId) },
      { field: select(), new: true },
    ).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'removeCredential', {
      credentialId,
      originalCredential: original.credentials.find(c => c._id.toString() === credentialId),
    }),
    notify([userId], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor!, userId);
};

/**
 * Verify
 * only tenantAdmin could verify credentials
 */
const verifyCredential = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, credentialId } = await idSchema.concat(tutorCredentialIdSchema).validate(args);

  // only tenantAdmin could verify credentials
  const original = await Tutor.findOne({ _id: id, 'credentials._id': credentialId, deletedAt: { $exists: false } });
  const credential = original?.credentials.find(c => c._id.toString() === credentialId);

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
    DatabaseEvent.log(userId, `/tutors/${id}`, 'verifyCredential', { credentialId }),
    notify([...admins, original.user], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor!, userId, true);
};

/**
 *  Add a Specialty
 * (by tutor)
 */
const addSpecialty = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req);
  const { id, ...fields } = await idSchema.concat(tutorSpecialtySchema).validate(args);

  const [original, level, subject] = await Promise.all([
    Tutor.findOne({ _id: id, user: userId, deletedAt: { $exists: false } }).lean(),
    Level.findOne({ _id: fields.level, deletedAt: { $exists: false } }).lean(),
    Subject.findOne({ _id: fields.subject, levels: fields.level, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!Object.keys(QUESTION.LANG).includes(fields.lang) || !original || !level || !subject)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const specialtyId = original.specialties.find(
    s => s.subject.toString() == fields.subject && s.level.toString() === fields.level && s.lang === fields.lang,
  )?._id;

  const { admins } = await Tenant.findByTenantId(original.tenant);

  const msg = {
    enUS: `A new tutor specialty is added: ${level.name.enUS}-${subject.name.enUS}`,
    zhCN: `刚上传专展资料：${level.name.zhCN}-${subject.name.zhCN}。`,
    zhHK: `剛上傳專長資料：${level.name.zhHK}-${subject.name.zhHK}。`,
  };

  const [tutor] = await Promise.all([
    specialtyId
      ? // un-delete specialty
        await Tutor.findOneAndUpdate(
          { _id: id, 'specialties._id': specialtyId },
          {
            $set: { 'specialties.$.note': fields.note },
            $unset: { 'specialties.$.deletedAt': 1 },
          },
          { fields: select(), new: true },
        ).lean()
      : // add a new specialty
        await Tutor.findOneAndUpdate(
          { _id: id },
          { $push: { specialties: { ...fields, priority: 0, ranking: { updatedAt: new Date() } } } },
          { fields: select(), new: true },
        ).lean(),
    startChatGroup(original!.tenant, msg, [...admins, userId], userLocale, `TUTOR#${id}`),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'addSpecialty', { specialtyId, ...fields }),
    notify([...admins, userId], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor!, userId);
};

/**
 * Delete Specialty by ID (by tutor)
 * ! (to keep ranking info, only update deletedAt, to hide the entry)
 */
const removeSpecialty = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, specialtyId } = await idSchema.concat(tutorSpecialtyIdSchema).validate(args);

  const tutor = await Tutor.findOneAndUpdate(
    { _id: id, user: userId, 'specialties._id': specialtyId, deletedAt: { $exists: false } },
    { $set: { 'specialties.$.deletedAt': new Date() } },
    { field: select(), new: true },
  ).lean();
  if (!tutor) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    DatabaseEvent.log(userId, `/tutors/${id}`, 'removeSpecialty', { specialtyId }),
    notify([userId], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor, userId);
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

  await Promise.all([
    Tutor.findByIdAndUpdate(id, {
      $unset: { intro: 1, officeHour: 1 },
      credentials: [],
      specialties: original.specialties.map(specialty => ({ ...specialty, deletedAt: new Date() })),
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    }).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'DELETE', { remark, original }),
    notify(admins, 'TUTOR', { tutorIds: [id] }),
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
const update = async (req: Request, args: unknown): Promise<LeanDocument<TutorDocument>> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id, ...fields } = await idSchema.concat(tutorSchema).validate(args);

  const original = await Tutor.findOne({ _id: id, user: userId, deleted: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { admins } = await Tenant.findByTenantId(original.tenant);

  const [tutor] = await Promise.all([
    Tutor.findByIdAndUpdate(id, fields, { fields: select(), new: true }).lean(),
    DatabaseEvent.log(userId, `/tutors/${id}`, 'UPDATE', {
      intro: original.intro,
      officeHour: original.officeHour,
      update: fields,
    }),
    notify([...admins, userId], 'TUTOR', { tutorIds: [id] }),
  ]);

  return transform(tutor!, userId);
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
