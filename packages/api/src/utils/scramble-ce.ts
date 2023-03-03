/**
 * Scramble mongo ID
 *
 */

import type { Types } from 'mongoose';

export default (id: string | Types.ObjectId, ownerId: string | Types.ObjectId): string =>
  `${ownerId.toString().slice(0, 10)}${id.toString().slice(10)}`;
