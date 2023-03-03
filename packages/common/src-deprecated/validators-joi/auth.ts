/**
 * Joi Schemas for auth API
 */

import Joi from 'joi';
// import configLoader from '../config/config-loader';
import { email, password } from './common-fields';

/**
 * fields
 */
const force = Joi.boolean();
const impersonatedAsId = mongoId().required();
const isPublic = Joi.boolean();
const name = Joi.string().max(100).trim().required();
const provider = Joi.string().required(); // oAuth2 provider, e.g google, github
const refreshToken = Joi.string().required();

// TODO : demo code, to be removed
const username = Joi.string().alphanum().min(3).max(50).trim().required();

/**
 * Joi schema
 * matching format of req.body (REST API) & Apollo resolver args
 */
const deregister = Joi.object().keys({ password });
const impersonateStart = Joi.object().keys({ impersonatedAsId });
const impersonateStop = Joi.object().keys({ refreshToken });
const login = Joi.object().keys({ email, password, isPublic, force });
const logout = Joi.object().keys({ refreshToken });
const logoutOther = Joi.object().keys({ refreshToken });
const oAuth2Connect = Joi.object().keys({ provider, token: Joi.string().required(), isPublic, force });
const oAuth2Disconnect = Joi.object().keys({ provider });
const register = Joi.object().keys({ email, name, password, isPublic });
const renew = Joi.object().keys({ refreshToken, isPublic });

export default {
  deregister,
  impersonateStart,
  impersonateStop,
  login,
  logout,
  logoutOther,
  oAuth2Connect,
  oAuth2Disconnect,
  register,
  renew,
};
