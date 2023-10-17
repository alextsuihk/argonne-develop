/**
 * App-Specific User model
 *
 * fields which are specific to this project
 *
 */

import { Schema } from 'mongoose';

export const userExtraDefinition = {
  studentIds: [{ type: String, index: true }],

  schoolHistories: [
    {
      _id: false,
      year: { type: String, required: true },
      school: { type: Schema.Types.ObjectId, ref: 'School', required: true },
      level: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
      schoolClass: String,
      updatedAt: { type: Date, default: Date.now },
    },
  ],

  favoriteTutors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
};
