/**
 * Model: Auth Event
 *
 */

import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { Point } from '../common';
import { pointSchema } from '../common';
import type { GenericDocument } from './generic';
import Generic, { options } from './generic';

type AuthEventType =
  | 'deregister'
  | 'impersonateStart'
  | 'impersonateStop'
  | 'login'
  | 'loginToken'
  | 'logout'
  | 'logoutOther'
  | 'passwordChange'
  | 'passwordConfirmReset'
  | 'passwordResetRequest'
  | 'oauth'
  | 'oauthDisconnect'
  | 'oauthConnect'
  | 'register'
  | 'renew';

export interface AuthEventDocument extends GenericDocument {
  event: AuthEventType;
  token: string;
  ua: string;
  ip: string;
  location: Point;
  // active: { fullscreen: boolean; ua: string; token: string };
}

interface AuthEventModel extends Model<AuthEventDocument> {
  log(
    userId: string | Types.ObjectId,
    event: AuthEventType,
    ua: string,
    ip: string,
    coord: { lat: number; lng: number } | null,
    remark?: string,
  ): Promise<AuthEventDocument>;
}

const authEventSchema = new Schema<AuthEventDocument>(
  {
    event: String,
    token: String,
    ua: String,
    ip: String,
    location: pointSchema,
  },
  options,
);

authEventSchema.static(
  'log',
  async (
    user: string | Types.ObjectId,
    event: AuthEventType,
    ua: string,
    ip: string,
    coordinates: { lat: number; lng: number } | null,
    remark?: string,
  ): Promise<AuthEventDocument> =>
    AuthEvent.create({
      user,
      event,
      ua,
      ip,
      remark,
      ...(coordinates && { type: 'Point', location: { coordinates: [coordinates.lng, coordinates.lat] } }),
    }),
);

const AuthEvent = Generic.discriminator<AuthEventDocument, AuthEventModel>('AuthEvent', authEventSchema);
export default AuthEvent;
