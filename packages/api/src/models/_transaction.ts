// todo = 'untested'; not ready, not in use

/**
 * Model: Transaction
 *
 * track all transaction movement
 *
 * ! Note: if an users deposits a payment, add to pendingPoint, post /api/payment/deposit
 * ! post /api/payment/confirm/:id
 *
 *
 * TODO: need to review
 * ref: https://stackoverflow.com/questions/51228059/mongo-db-4-0-transactions-with-mongoose-nodejs-express
 *
 */

// import type { Types } from 'mongoose';
// import mongoose, { Document, Schema } from 'mongoose';
// import configLoader from '../config/config-loader';

// export interface TransactionDocument extends Document {
//   group: string;
//   user: string | Types.ObjectId;
//   isReconciliated: boolean;
// }

// const { DEFAULTS } = configLoader;

// const transactionSchema = new Schema<TransactionDocument>(
//   {
//     group: String, // a grouping reference (UUID)
//     seq: { type: Number, default: 0 }, // sequence
//     user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
//     payment: String, // payment gateway ID
//     description: String,
//     coin: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // useable amount
//     coinWithheld: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 },
//     coinNonCash: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // free coupon (non cash convertible)
//     isReconciliated: { type: Boolean, default: false },
//     extra: { type: Schema.Types.Mixed }, // extra info: questionID,  bank, octopus reference
//     attachmentUrls: [String], // deposit/withdrawal attachment
//     paymentRef: String, // in/out payment reference #

//     withheld: { type: Boolean }, // withheld
//     refund: { type: Boolean, default: false }, // refund operation, same ref with original transaction group
//     type: String, // TODO: amount or coupon
//     bank: String, // TODO: for deposit or withdraw

//     createdAt: { type: Date, default: Date.now },
//     verifiedAt: Date,
//   },
//   DEFAULTS.MONGOOSE.SCHEMA_OPTS,
// );

export default { todo: 'TODO' };
