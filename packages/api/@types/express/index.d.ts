/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * typescript declaration file
 *
 * note: declare as global
 */

import type { Id, UserDocument } from '../../src/models/user';
import type { Auth } from '../../src/utils/token';

declare global {
  namespace Express {
    interface Request extends Partial<Auth> {
      ua: string;
      user?: UserDocument & Id;
      isMobile?: boolean;
      isApollo?: boolean;
    }
  }
}
