// todo = 'basic working, need more fine-tune on additional fields';

// TODO: add eda: number, default=0

/**
 * App-Specific User model
 *
 * fields which are specific to this project
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

export interface UserExtra {
  studentIds: string[];

  schoolHistories: {
    year: string;
    school: string | Types.ObjectId;
    level: string | Types.ObjectId;
    schoolClass?: string; // e.g. 3F, 4B, no format rule, (teacher might NOT have a schoolClass)
    updatedAt: Date;
  }[];

  favoriteTutors: (string | Types.ObjectId)[];
}

export const userExtraDefinition = {
  studentIds: [{ type: String, index: true }],

  schoolHistories: [
    {
      year: String,
      school: { type: Schema.Types.ObjectId, ref: 'School' },
      level: { type: Schema.Types.ObjectId, ref: 'Level' },
      schoolClass: String,
      updatedAt: { type: Date, default: Date.now },
    },
  ],

  favoriteTutors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
};
