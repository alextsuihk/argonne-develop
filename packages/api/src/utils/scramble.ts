/**
 * Scramble mongo ID
 *
 */

import type { Types } from 'mongoose';

export default (id: string | Types.ObjectId, ownerId: string | Types.ObjectId): string =>
  ((BigInt(`0x${id.toString()}`) + BigInt(`0x${ownerId.toString()}`)) << (BigInt(2) / BigInt(2) + BigInt(88))).toString(
    16,
  );
