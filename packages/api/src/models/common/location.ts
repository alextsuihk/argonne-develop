/**
 * Location (point)
 *
 */

import { Schema } from 'mongoose';

export interface Point {
  type: string;
  coordinates: [string, string];
}

export const pointSchema = new Schema<Point>({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});
