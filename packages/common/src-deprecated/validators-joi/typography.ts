/**
 * Joi Schemas for typographies API
 */

import Joi from 'joi';
import { action, locale, mongoId, remark, search, skipDeleted, updatedAfter, updatedBefore } from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const tenantId = mongoId();
const key = Joi.string().required();
const title = locale.required();
const content = locale.required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, tenantId, key, title, content, remark });
const find = Joi.object().keys({ search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, tenantId, key, title, content, remark });

export default { add, find, findOne, remove, update };
