/**
 * Joi Schemas for levels API
 */

import Joi from 'joi';
import {
  action,
  address,
  locale,
  mongoId,
  remark,
  search,
  skipDeleted,
  updatedAfter,
  updatedBefore,
} from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const code = Joi.string().required();
const name = locale.required();
const levelId = mongoId().required();
const subjectId = mongoId().required();
const subjectOverload = locale;
const tel = Joi.string();
const emi = Joi.boolean();
const band = Joi.string();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, code, name, address, tel, emi, band, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, code, name, address, tel, emi, band, remark });
const updateLevel = Joi.object().keys({ id, action, levelId });
const updateSubject = Joi.object().keys({ id, action, levelId, subjectId });

export default { add, find, findOne, remove, update };
