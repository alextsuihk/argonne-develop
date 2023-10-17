/**
 * Data Migration
 *
 * ! This is demo sample
 *  give-a-way 10 coupons to active EDA
 */

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';

import type { UserDocument } from '../../models/user';
import User from '../../models/user';

const { USER } = LOCALE.DB_ENUM;
let originalData: UserDocument[] = []; // backup for roll-back if needed

/**
 * Proceed Migration
 */
const proceed = async (): Promise<string> => {
  // backup original data
  originalData = await User.find({ status: USER.STATUS.ACTIVE, flags: USER.FLAG.EDA }).select('virtualCoin').lean();

  // give-a-way 10 coupon to EDA
  await User.updateMany(
    { status: USER.STATUS.ACTIVE, flags: USER.FLAG.EDA, virtualCoin: { $lte: 12 } },
    { $inc: { virtualCoin: 10 } },
  );

  return `(${chalk.green(originalData.length)} modified)`;
};

/**
 * Rollback Migration
 */
const rollback = async (): Promise<string> => {
  // restore the original data
  // for (const user of originalData) await User.findByIdAndUpdate(user._id, { virtualCoin: user.virtualCoin }).lean();

  await Promise.all(originalData.map(user => User.updateOne(user._id, { virtualCoin: user.virtualCoin })));

  return `(${chalk.green(originalData.length)} restored)`;
};

export { proceed, rollback };
