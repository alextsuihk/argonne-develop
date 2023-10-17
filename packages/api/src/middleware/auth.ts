/**
 * Middleware: JWT authentication (Authorization)
 *
 * decode auth header, and populate req.user
 *
 */

import type { NextFunction, Request, Response } from 'express';
import MobileDetect from 'mobile-detect';

import configLoader from '../config/config-loader';
import User, { activeCond } from '../models/user';
import { isStagingMode, isTestMode } from '../utils/environment';
import { latestSchoolHistory, mongoId } from '../utils/helper';
import token, { API_KEY_TOKEN_PREFIX } from '../utils/token';

const { config } = configLoader;

/**
 * decode Header (auth or x-api-key)
 */
export const decodeHeader = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    req.ua = req.get('user-agent') || 'unknown user-agent';
    req.isMobile = !!new MobileDetect(req.ua).mobile();

    const jestUserId = req.get('Jest-User');

    // special case for Jest testing
    if ((isStagingMode || isTestMode) && jestUserId) {
      const jestUser = await User.findOne({ _id: jestUserId, ...activeCond }).lean();

      if (jestUser) {
        req.userExtra = latestSchoolHistory(jestUser.schoolHistories);
        req.userFlags = jestUser.flags;
        req.userId = mongoId(jestUserId);
        req.userLocale = jestUser.locale;
        req.userName = jestUser.name;
        req.userRoles = jestUser.roles;
        req.userTenants = jestUser.tenants.map(t => t.toString());
      }
    } else {
      // process as normal user access, decode JWT and populate request
      const authToken = req.get('Authorization')?.replace('Bearer ', '') || (req.cookies as { jwt?: string })?.jwt;
      const apiKey = req.get('x-api-key');

      if (authToken) {
        const decoded = await token.verifyAuth(authToken);

        req.authUserId = decoded.authUserId && mongoId(decoded.authUserId.toString()); // decoded.userId is actually string, just to simplify type
        req.userExtra = decoded.userExtra;
        req.userFlags = decoded.userFlags;
        req.userId = mongoId(decoded.userId.toString()); // decoded.userId is actually string, just to simplify type
        req.userLocale = decoded.userLocale;
        req.userName = decoded.userName;
        req.userRoles = decoded.userRoles;
        req.userTenants = decoded.userTenants;
      } else if (apiKey) {
        const [prefix, userId, scope] = await token.verifyStrings(apiKey);
        const user = prefix === API_KEY_TOKEN_PREFIX ? await User.findOne({ _id: userId, ...activeCond }).lean() : null;

        // only support hub mode
        if (config.mode === 'HUB' && user && scope) {
          req.apiScope = scope;
          req.userExtra = latestSchoolHistory(user.schoolHistories);
          req.userFlags = user.flags;
          req.userId = user._id;
          req.userLocale = user.locale;
          req.userName = user.name;
          req.userRoles = user.roles;
          req.userTenants = user.tenants.map(t => t.toString());
        }
      }
    }

    next();
  } catch (error) {
    next(error); // re-throw JWT decode error
    // next(); // don't care the JWT decode error, controller will care further
  }
};
