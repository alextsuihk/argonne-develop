/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * typescript declaration file
 *
 * note: declare as global
 */

import type { UserDocument } from '../../src/models/user';
import type { Auth } from '../../src/utils/token';

declare global {
  namespace Express {
    export interface Request extends Partial<Auth> {
      apiScope?: string;
      ua: string;
      user?: UserDocument;
      isMobile?: boolean;
      isApollo?: boolean;
    }
  }
}
