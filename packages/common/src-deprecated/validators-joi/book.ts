/**
 * Joi Schemas for books API
 */

import Joi from 'joi';
import { action, locale, mongoId, remark, search, skipDeleted, updatedAfter, updatedBefore } from './common-fields';

/**
 * fields
 */
const id = mongoId().required();

const publisherId = mongoId();
const levelId = mongoId().required();
const subjectIds = Joi.array().min(1).unique().items(mongoId().required());
const schoolId = mongoId().required();
const title = Joi.string().trim().required();
const subTitle = Joi.string().trim();

// revision sub-document fields
const revId = mongoId().required();
const rev = Joi.string().trim().required();
const year = Joi.number().min(2000).max(2100).required();
const listPrice = Joi.number().precision(0);

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const coreFields = { publisherId, levelId, subjectIds, title, subTitle };
const revFields = { rev, year, listPrice, remark };
const add = Joi.object().keys({ action, ...coreFields, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, ...coreFields, remark });

// advanced actions
const updateSchool = Joi.object().keys({ id, action, schoolId });
const addRevision = Joi.object().keys({ id, action, ...revFields, remark });
const updateRevision = Joi.object().keys({ id, action, revId, ...revFields, remark });

export default { add, find, findOne, remove, update, updateSchool, addRevision, updateRevision };
