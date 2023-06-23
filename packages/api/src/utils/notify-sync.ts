/**
 * Notify Users (socket.io / webpush) & Sync Satellite
 *
 * send webpush ONLY if socket connection is not available
 */

import { DocumentSync, LOCALE, NOTIFY_EVENTS } from '@argonne/common';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import Job from '../models/job';
import Tenant from '../models/tenant';
import type { Id } from '../models/user';
import User from '../models/user';
import socketServer from '../socket-server';
import { idsToString } from './helper';

const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const TODO_ENABLE_LATER = false;
console.log('Enable notify-sync.ts webpush() later');

/**
 * Notify (users' devices) & Sync satellite/hub
 */
export const notifySync = async (
  event: (typeof NOTIFY_EVENTS)[number],
  { tenantId, userIds: uIds }: { tenantId?: string | Types.ObjectId; userIds?: (string | Types.ObjectId | Id)[] },
  { jobIds: _, ...docSync }: DocumentSync,
  opt?: { adjPriority?: number; msg?: string },
) => {
  const adjPriority = opt?.adjPriority || 0;
  const msg = opt?.msg;
  const doc = Object.fromEntries(Object.entries(docSync).map(([k, v]) => [k, idsToString(v)])); // convert ObjectId[] to string[]

  const [users, satelliteTenants] = await Promise.all([
    User.find(
      { _id: { $in: uIds }, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } },
      '_id subscriptions tenants',
    ).lean(),
    Tenant.findSatellites(),
  ]);

  // determine destination(s) of sync
  const userTenantIds = Array.from(new Set(idsToString(users.map(user => user.tenants).flat())));
  const urls =
    config.mode === 'SATELLITE'
      ? [DEFAULTS.ARGONNE_URL] // satellite only allows to sync back to Hub
      : event === 'CORE'
      ? satelliteTenants.map(t => t.satelliteUrl) // hub sync to ALL satellites
      : tenantId
      ? satelliteTenants.filter(t => t._id.toString() === tenantId.toString()).map(t => t.satelliteUrl) // hub syncs to a specific satellite tenant
      : satelliteTenants.filter(t => userTenantIds.includes(t._id.toString())).map(t => t.satelliteUrl); // use cases: adminChat, contact, oauth, password, role, user-profile, etc

  const userIds = idsToString(users);

  // send socket.io, webpush notification & queue sync
  await Promise.all([
    socketServer.emit(userIds, event, msg), // send socket message

    ...(TODO_ENABLE_LATER
      ? userIds.map(async userId => {
          const userSocketIds = await socketServer.listSockets(userId);
          const userSubscriptions =
            users
              .find(user => user._id.toString() === userId)
              ?.subscriptions.filter(({ socketId }) => !userSocketIds.includes(socketId)) ?? [];

          console.log(`TODO: need to send FCM or WebPush ${userId} ---- ${userSubscriptions?.length}`);
          // TODO: send FCM to subscriptions...... (if subscriptions.length)
        })
      : []),

    ...(Object.entries(doc).length
      ? urls.map(
          async url => url && Job.queue({ task: 'sync', args: { url, userIds, ...doc }, priority: 10 + adjPriority }),
        )
      : []),
  ]);
};
