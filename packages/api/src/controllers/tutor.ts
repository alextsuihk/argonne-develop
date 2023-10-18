/**
 * Controller: Tutor
 *
 * !note: id is referencing to tutor.user
 *
 * note: tutoring schools are ONLY supported in Hub mode, school-tenant does not support tutor, no need to sync satellite
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from '../models/common';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import type { TutorDocument } from '../models/tutor';
import Tutor, { searchableFields } from '../models/tutor';
import User, { activeCond } from '../models/user';
import { messageToAdmins } from '../utils/chat';
import { mongoId } from '../utils/helper';
import common from './common';

type Action =
  | 'addCredential'
  | 'addRemark'
  | 'addSpecialty'
  | 'removeCredential'
  | 'removeSpecialty'
  | 'verifyCredential';

type Populate = { user: Id & { name: string } };
type PopulatedTutor = Omit<TutorDocument, 'user'> & Partial<Populate>; // partial in case user document is removed remotely
type TutorDocumentEx = Omit<TutorDocument, 'user'> & { name?: string };

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const { auth, authGetUser, hubModeOnly, isAdmin, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, subIdSchema, tutorCredentialSchema, tutorSchema, tutorSpecialtySchema } =
  yupSchema;

const populate = [{ path: 'user', select: '_id name' }];

/**
 * (helper) transform
 * show credential.proofs to owner & admins only
 * show specialties with intersected tenants
 */
const transform = (
  { user, ...tutor }: PopulatedTutor,
  userId: Types.ObjectId,
  userTenants: string[],
  isAdmin?: boolean,
): TutorDocumentEx => ({
  ...tutor,
  _id: user?._id || mongoId(), // in case userDoc is deleted (likely remotely)
  name: user?.name,

  credentials: tutor.credentials.map(({ proofs, ...rest }) => ({
    ...rest,
    proofs: isAdmin || user?._id.equals(userId) ? proofs : [], // only owner or admin could see proofs
  })),

  specialties: isAdmin
    ? tutor.specialties // admin could see everything
    : tutor.specialties.filter(({ tenant }) => userTenants.some(t => tenant.equals(t))), // show intersected userTenants
});

// common filter for find() & findMany()
const findCommon = async (req: Request, args: unknown) => {
  const { userId, userExtra, userRoles, userTenants } = auth(req);

  const { query } = await querySchema.validate(args);
  if (isAdmin(userRoles)) return searchFilter<TutorDocument>(searchableFields, { query }); // admin see everything

  const [levels, adminTenants] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.findAdminTenants(userId, userTenants),
  ]);

  const teacherLevelId = levels.find(({ code }) => code === 'TEACHER')?._id;
  const naLevelId = levels.find(({ code }) => code === 'NA')?._id;
  const adminTenantIds = adminTenants.map(t => t._id);
  if (!teacherLevelId || !naLevelId) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const extra: Record<'$or', Record<string, unknown>[]> = {
    $or: [
      { user: userId },
      {
        'specialties.tenant': { $in: userTenants },
        'specialties.level':
          !!userExtra?.level && !teacherLevelId.equals(userExtra.level)
            ? { $in: [userExtra.level, naLevelId] }
            : naLevelId,
      },
      ...(adminTenantIds.length ? [{ 'specialties.tenant': { $in: adminTenantIds } }] : []), // tenantAdmin could get all tutors of his/her tenants
    ],
  };

  return searchFilter<TutorDocument>(searchableFields, { query }, extra);
};

/**
 * Find Multiple Tutors (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<TutorDocumentEx[]> => {
  hubModeOnly();

  const { userId, userRoles, userTenants } = auth(req);
  const filter = await findCommon(req, args);

  const tutors = await Tutor.find(filter, select(userRoles)).populate<Populate>(populate).lean();
  return tutors.map(tutor => transform(tutor, userId, userTenants, isAdmin(userRoles)));
};

/**
 * Find Multiple Tutors with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  hubModeOnly();

  try {
    const { userId, userRoles, userTenants } = auth(req);
    const filter = await findCommon(req, { query: req.query });
    const options = paginateSort(req.query);

    const [total, tutors] = await Promise.all([
      Tutor.countDocuments(filter),
      Tutor.find(filter, select(userRoles), options).populate<Populate>(populate).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: tutors.map(tutor => transform(tutor, userId, userTenants, isAdmin(userRoles))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Tutor by ID
 * as long as within userTenants, will show it
 */
const findOne = async (req: Request, args: unknown): Promise<TutorDocumentEx | null> => {
  hubModeOnly();

  const { userId, userRoles, userTenants } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<TutorDocument>(
    searchableFields,
    { query },
    { user: id, ...(!isAdmin(userRoles) && { 'specialties.tenant': { $in: userTenants } }) },
  );
  const tutor = await Tutor.findOne(filter, select(userRoles)).populate<Populate>(populate).lean();

  return tutor && transform(tutor, userId, userTenants, isAdmin(userRoles));
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
 * upsert Tutor
 */
const upsert = async (req: Request, args: unknown, action?: Action): Promise<TutorDocumentEx> => {
  hubModeOnly();

  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const save = async (user: Types.ObjectId, update: UpdateQuery<TutorDocument>, event: Record<string, unknown>) => {
    const [tutor] = await Promise.all([
      Tutor.findOneAndUpdate({ user }, { user, ...update }, { fields: select(userRoles), new: true, upsert: true })
        .populate<Populate>(populate)
        .lean(),
      DatabaseEvent.log(userId, `/tutors/${user}`, action || 'update', event),
    ]);

    return transform(tutor, userId, userTenants, isAdmin(userRoles));
  };

  if (action === 'addCredential') {
    const [{ identifiedAt }, { title, proofs }] = await Promise.all([
      authGetUser(req),
      tutorCredentialSchema.validate(args),
    ]);

    // only identifiable addSpecialty
    if (!identifiedAt || addYears(identifiedAt, DEFAULTS.USER.IDENTIFIABLE_EXPIRY) < new Date())
      throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

    const msg = {
      enUS: `A new user credential is added: ${title}, please provide proofs for manual verification`,
      zhCN: `刚上传学历资料：${title}，请提供证明文伴，等待人工审核。`,
      zhHK: `剛上傳學歷資料：${title}，請提供證明文件，等待人工審核。`,
    };
    const _id = mongoId();
    const credential: TutorDocument['credentials'][0] = { _id, title, proofs, updatedAt: new Date() };
    const [transformed] = await Promise.all([
      save(userId, { $push: { credentials: credential } }, { _id, title }),
      messageToAdmins(msg, userId, userLocale, false, [], `TUTOR#${userId}`),
    ]);
    return transformed;
    //
  } else if (action == 'addRemark') {
    const { userId: adminId } = auth(req, 'ADMIN'); // admin ONLY
    const { id: userId, remark } = await idSchema.concat(remarkSchema).validate(args);

    return save(mongoId(userId), { $push: { remarks: { t: new Date(), u: adminId, m: remark } } }, { args });
    //
  } else if (action === 'addSpecialty') {
    const [{ identifiedAt }, { tenantId, note, langs, level, subject }] = await Promise.all([
      authGetUser(req),
      tutorSpecialtySchema.validate(args),
    ]);

    // only identifiable addSpecialty
    if (!identifiedAt || addYears(identifiedAt, DEFAULTS.USER.IDENTIFIABLE_EXPIRY) < new Date())
      throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

    const [original, l, s] = await Promise.all([
      Tutor.findOne({ user: userId }).lean(),
      Level.exists({ _id: level, deletedAt: { $exists: false } }),
      Subject.exists({ _id: subject, levels: level, deletedAt: { $exists: false } }),
    ]);

    const duplicatedSpecialty = original?.specialties.some(
      s => s.tenant.equals(tenantId) && s.subject.equals(subject) && s.level.equals(level),
    );

    if (!userTenants.includes(tenantId) || !l || !s || duplicatedSpecialty)
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const _id = mongoId();
    const specialty: TutorDocument['specialties'][0] = {
      _id,
      tenant: mongoId(tenantId),
      note,
      langs: langs.filter(x => Object.keys(QUESTION.LANG).includes(x)), // sanitized langs
      level: l._id,
      subject: s._id,
      priority: 0,
    };
    return save(userId, { $push: { specialties: specialty } }, { args, _id });
    //
  } else if (action === 'removeCredential') {
    const [original, { subId }] = await Promise.all([
      Tutor.findOne({ user: userId }).lean(),
      subIdSchema.validate(args),
    ]);

    const originalCredential = original?.credentials.find(c => c._id.equals(subId));
    if (!originalCredential) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return save(userId, { $pull: { credentials: { _id: subId } } }, { args, originalCredential });
    //
  } else if (action === 'removeSpecialty') {
    const [original, { subId }] = await Promise.all([
      Tutor.findOne({ user: userId }).lean(),
      subIdSchema.validate(args),
    ]);

    const originalSpecialty = original?.specialties.find(s => s._id.equals(subId));
    if (!originalSpecialty) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return save(userId, { $pull: { specialties: { _id: subId } } }, { args, originalSpecialty });
    //
  } else if (action === 'verifyCredential') {
    const { userId: adminId } = auth(req, 'ADMIN'); // admin ONLY
    const { id: userId, subId } = await idSchema.concat(subIdSchema).validate(args);
    const [original, user] = await Promise.all([
      Tutor.findOne({ user: userId }).lean(),
      User.findOne({ _id: userId, ...activeCond }).lean(),
    ]);

    const credential = original?.credentials.find(c => c._id.equals(subId));
    if (!user || !credential) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const msg = {
      enUS: `Tutor credential is verified: ${credential.title}.`,
      zhCN: `学历资料完成审批：${credential.title}。`,
      zhHK: `學歷資料完成審批：${credential.title}。`,
    };

    const [tutor] = await Promise.all([
      Tutor.findOneAndUpdate(
        { user: userId, 'credentials._id': subId },
        { $set: { 'credentials.$.verifiedAt': new Date() } },
        { fields: select(userRoles), new: true, upsert: true }, // upsert is pointless, just to make typescript happy
      )
        .populate<Populate>(populate)
        .lean(),
      DatabaseEvent.log(adminId, `/tutors/${userId}`, action, { args }),
      messageToAdmins(msg, user._id, user.locale, false, [adminId], `TUTOR#${userId}`),
    ]);
    return transform(tutor, adminId, userTenants, isAdmin(userRoles));
  } else {
    const { intro, officeHour } = await tutorSchema.validate(args);
    const unset = { ...(!intro && { intro: 1 }), ...(!officeHour && { officeHour: 1 }) };
    return save(
      userId,
      {
        ...(intro && { intro }),
        ...(officeHour && { officeHour }),
        ...(Object.keys(unset).length && { $unset: unset }),
      },
      { args },
    );
  }
};

/**
 * UpsertHandler Tutor (credentials & specialties) (RESTful)
 */
const upsertHandler: RequestHandler<{ action?: Action }> = async (req, res, next) => {
  const { action } = req.params;

  try {
    return res.status(200).json({ data: await upsert(req, req.body, action) });
  } catch (error) {
    next(error);
  }
};

export default {
  find,
  findMany,
  findOne,
  findOneById,
  upsert,
  upsertHandler,
};
