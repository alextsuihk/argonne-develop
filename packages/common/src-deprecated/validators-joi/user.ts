// TODO: 2021-04-09 WIP
/**
 * Joi Schemas for users API
 */

import Joi from 'joi';
import { action, locale, mongoId, remark, search, skipDeleted, updatedAfter, updatedBefore } from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const name = locale.required();
const region = locale.required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, name, region, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, name, region, remark });

export default { add, find, findOne, remove, update };
