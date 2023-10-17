/**
 * Model: Auth Event
 *
 */

import type { InferSchemaType, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { discriminatorKey, pointSchema } from '../common';
import type { GenericDocument } from './generic';
import Generic from './generic';

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

type Log = (
  user: Types.ObjectId,
  event: AuthEventType,
  ua: string,
  ip: string,
  coord: { lat: number; lng: number } | null,
  remark?: string,
) => Promise<AuthEventDocument>;
interface AuthEventModel extends Model<AuthEventDocument> {
  log: Log;
}

const authEventSchema = new Schema(
  {
    event: String,
    token: String,
    ua: String,
    ip: String,
    location: pointSchema,
    remark: String,
  },
  discriminatorKey,
);

const log: Log = async (user, event, ua, ip, coord, remark) =>
  AuthEvent.create<Partial<AuthEventDocument>>({
    user,
    event,
    ua,
    ip,
    ...(remark && { remark }),
    ...(coord && { type: 'Point', coordinates: [coord.lng, coord.lat] }),
  });

authEventSchema.static('log', log);
export type AuthEventDocument = GenericDocument & InferSchemaType<typeof authEventSchema>;
const AuthEvent = Generic.discriminator<AuthEventDocument, AuthEventModel>('AuthEvent', authEventSchema);
export default AuthEvent;
