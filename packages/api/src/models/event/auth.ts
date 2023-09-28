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
  remark?: string;
}

type Log = (
  userId: string | Types.ObjectId,
  event: AuthEventType,
  ua: string,
  ip: string,
  coord: { lat: number; lng: number } | null,
  remark?: string,
) => Promise<AuthEventDocument>;
interface AuthEventModel extends Model<AuthEventDocument> {
  log: Log;
}

const authEventSchema = new Schema<AuthEventDocument>(
  {
    event: String,
    token: String,
    ua: String,
    ip: String,
    location: pointSchema,
    remark: String,
  },
  options,
);

const log: Log = async (user, event, ua, ip, coordinates, remark) =>
  AuthEvent.create<Partial<AuthEventDocument>>({
    user,
    event,
    ua,
    ip,
    ...(remark && { remark }),
    ...(coordinates && { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] }),
  });
authEventSchema.static('log', log);

const AuthEvent = Generic.discriminator<AuthEventDocument, AuthEventModel>('AuthEvent', authEventSchema);
export default AuthEvent;
