/**
 * Joi Schemas for publishers API
 */

import Joi from 'joi';
import {
  action,
  locale,
  mongoId,
  remark,
  search,
  skipDeleted,
  tel,
  updatedAfter,
  updatedBefore,
  website,
} from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const name = locale.required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, name, tel, website, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, name, tel, website, remark });

export default { add, find, findOne, remove, update, updateAdmin };
