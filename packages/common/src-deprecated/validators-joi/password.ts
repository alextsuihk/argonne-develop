/**
 * Joi Schemas for password API
 */

import Joi from 'joi';
import { email, password } from './common-fields';

/**
 * fields
 */
const currPassword = password;
const newPassword = password;
const refreshToken = Joi.string().required();
const resetToken = Joi.string().required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const change = Joi.object().keys({ currPassword, newPassword, refreshToken });
const confirmReset = Joi.object().keys({ resetToken, password });
const requestReset = Joi.object().keys({ email });

export default { change, confirmReset, requestReset };
