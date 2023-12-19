/**
 * Iterate & Scramble ObjectId
 *
 */

import mongoose, { Types } from 'mongoose';

const hack = async (data: unknown, userId: Types.ObjectId) => `hack-${data}-${userId}`;

const scramble = async (data: unknown, userId: Types.ObjectId): Promise<unknown> =>
  mongoose.isObjectIdOrHexString(data)
    ? hack(data, userId)
    : Array.isArray(data)
      ? Promise.all(data.map(async d => scramble(d, userId)))
      : typeof data === 'object' && data
        ? Object.fromEntries(
            await Promise.all(Object.entries(data).map(async ([key, value]) => [key, scramble(value, userId)])),
          ) // non-null object
        : data; // non mongoId string | boolean | null | number (or any other primitives)

export default scramble;
