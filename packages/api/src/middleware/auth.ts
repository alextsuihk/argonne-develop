/**
 * Middleware: JWT authentication (Authorization)
 *
 * decode auth header, and populate req.user
 *
 */

import type { NextFunction, Request, Response } from 'express';
import MobileDetect from 'mobile-detect';

import User from '../models/user';
import { isStagingMode, isTestMode } from '../utils/environment';
import { idsToString } from '../utils/helper';
import token from '../utils/token';

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
      const jestUser = await User.findOneActive({ _id: jestUserId });

      if (jestUser) {
        if (jestUser.histories[0])
          req.userExtra = {
            year: jestUser.histories[0].year,
            school: jestUser.histories[0].school.toString(),
            level: jestUser.histories[0].level.toString(),
            ...(jestUser.histories[0].schoolClass && { schoolClass: jestUser.histories[0].schoolClass }),
          };

        req.userFlags = jestUser.flags;
        req.userId = jestUserId;
        req.userLocale = jestUser.locale;
        req.userName = jestUser.name;
        req.userRoles = jestUser.roles;
        req.userScopes = jestUser.scopes;
        req.userTenants = idsToString(jestUser.tenants);
      }
    } else {
      // process as normal user access, decode JWT and populate request
      const authToken = req.get('Authorization')?.replace('Bearer ', '') || (req.cookies as { jwt?: string })?.jwt;
      const apiKey = req.get('x-api-key');

      if (authToken) {
        const decoded = await token.decodeAuth(authToken);

        req.authUserId = decoded.authUserId;
        req.userExtra = decoded.userExtra;
        req.userFlags = decoded.userFlags;
        req.userId = decoded.userId;
        req.userLocale = decoded.userLocale;
        req.userName = decoded.userName;
        req.userRoles = decoded.userRoles;
        req.userScopes = decoded.userScopes;
        req.userTenants = decoded.userTenants;
      } else if (apiKey) {
        const { userId, scope } = await token.decodeApi(apiKey);
        const user = await User.findOneActive({ _id: userId });

        if (user?.scopes.includes(scope) || (user && scope === 'systems:r')) {
          if (user.histories[0])
            req.userExtra = {
              year: user.histories[0].year,
              school: user.histories[0].school.toString(),
              level: user.histories[0].level.toString(),
              ...(user.histories[0].schoolClass && { schoolClass: user.histories[0].schoolClass }),
            };
          req.userFlags = user.flags;
          req.userId = user._id.toString();
          req.userLocale = user.locale;
          req.userName = user.name;
          req.userRoles = user.roles;
          req.userScopes = [scope];
          req.userTenants = idsToString(user.tenants);
        }
      }
    }

    next();
  } catch (error) {
    next(error); // re-throw JWT decode error
    // next(); // don't care the JWT decode error, controller will care further
  }
};
