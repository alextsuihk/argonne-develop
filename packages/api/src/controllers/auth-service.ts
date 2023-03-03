/**
 * Controller: Auth-Service
 *  ! provide oAuth2-like service
 *  REST-ful ONLY
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from 'express';

import Tenant from '../models/tenant';
import User from '../models/user';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { hubModeOnly } = common;
const { apiKeySchema, emailSchema, passwordSchema } = yupSchema;

/**
 * Share User Info with other servers/service
 */
const userBasicInfo: RequestHandler = async (req, res, next) => {
  try {
    hubModeOnly();
    const { email, password, apiKey } = await apiKeySchema
      .concat(emailSchema)
      .concat(passwordSchema)
      .validate(req.body);

    const tenant = await Tenant.findOne({ apiKey, deletedAt: { $exists: false } }).lean();

    if (!tenant || !tenant.userSelect || !tenant.services.includes(TENANT.SERVICE.AUTH_SERVICE))
      throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

    // accept verified (lower-cased) & unverified email (upper-cased)
    const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, tenant.userSelect);

    // check if password is correct
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

    user.password = '*'.repeat(password.length); // remove password information

    res.status(200).json({ data: { user } });
  } catch (error) {
    next(error);
  }
};

export default {
  userBasicInfo,
};
