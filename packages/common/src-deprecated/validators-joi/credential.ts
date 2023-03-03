/**
 * Joi Schemas for credentials API
 */

import Joi from 'joi';
import { action, admin, mongoId, remark, search, skipDeleted, updatedAfter, updatedBefore } from './common-fields';

/**
 * fields
 */
const id = mongoId().required();
const title = Joi.string().required();
const proofUrl = Joi.string();
/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const add = Joi.object().keys({ action, title, remark });
const find = Joi.object().keys({ admin, search, updatedAfter, updatedBefore, skipDeleted });
const findOne = Joi.object().keys({ id });
const remove = Joi.object().keys({ id, action, remark });
const update = Joi.object().keys({ id, action, title, remark });
const updateProof = Joi.object().keys({ id, action, proofUrl, remark });
const verify = Joi.object().keys({ id, action, remark });

export default { add, find, findOne, remove, update, updateProof, verify };
