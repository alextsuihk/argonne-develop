/**
 * Joi Schemas for specialties API
 */

import Joi from 'joi';
import { action, mongoId, remark, search, skipDeleted, updatedAfter, updatedBefore } from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const note = Joi.string();
const langs = Joi.array().min(1).unique().items(Joi.string()).required();
const subjectId = mongoId().required();
const levelId = mongoId().required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, note, langs, subjectId, levelId, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, note, langs, subjectId, levelId, remark });

export default { add, find, findOne, remove, update };
