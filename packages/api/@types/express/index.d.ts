/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * typescript declaration file
 *
 * note: declare as global
 */
import type { LeanDocument } from 'mongoose';

import type { UserDocument } from '../../src/models/user';
import type { Auth } from '../../src/utils/token';

declare global {
  namespace Express {
    interface Request extends Partial<Auth> {
      ua: string;
      user?: LeanDocument<UserDocument>;
      isMobile?: boolean;
      isApollo?: boolean;
    }
  }
}
