/**
 * Notify Users (socket.io / webpush) & Sync Satellite
 *
 */

import { LOCALE } from '@argonne/common';
import { subSeconds } from 'date-fns';
import type { Types } from 'mongoose';
import webpush from 'web-push';

import configLoader from '../config/config-loader';
import type { SyncJobDocument } from '../models/sync-job';
import SyncJob, { SYNC_JOB_CHANNEL } from '../models/sync-job';
import { findSatelliteTenantById, findSatelliteTenants } from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { redisClient } from '../redis';
import socketServer from '../socket-server';
import { isTestMode } from './environment';

export type { SyncBulkWrite as BulkWrite } from '../models/sync-job';

const { USER } = LOCALE.DB_ENUM;
const { config } = configLoader;
const { mailTo, publicKey, privateKey } = config.messenger.webpush;

const webpushEnabled = !!mailTo && !!publicKey && !!privateKey;
if (webpushEnabled) webpush.setVapidDetails(`mailto:${mailTo}`, publicKey, privateKey);

// Setup options  // TODO: to be implemented
const webpushOptions = {
  // TTL: 60,
};

/**
 * (helper) queueSyncJob
 */
const queueSyncJob = async (
  tenant: Types.ObjectId,
  notify: SyncJobDocument['notify'],
  sync: SyncJobDocument['sync'],
) => {
  await SyncJob.create<Partial<SyncJobDocument>>({
    tenant,
    notify,
    sync,
    attempt: 0,
    ...(isTestMode && { completedAt: new Date(), result: 'No Sync in Test Mode' }),
  });
  if (!isTestMode) await redisClient.publish(SYNC_JOB_CHANNEL, tenant.toString()); // redis publish, trigger job-runner to proceed
};

/**
 * Notify (users' devices) & queue SyncJob
 *  notification is sent immediately via socket.io (within local cluster)
 *  for valid satellite, notify & sync is queued into SyncJob
 */
export const notifySync = async (
  tenant: Types.ObjectId | null, // null = notify only, sync to no satellite
  notify: SyncJobDocument['notify'],
  sync: SyncJobDocument['sync'],
) => {
  // send notification (to client connected to local cluster)
  if (notify) {
    const { event, msg, userIds } = notify;

    // pull subscriptions (webpush info) info from active users
    const users: Pick<UserDocument, '_id' | 'pushSubscriptions'>[] = await User.find(
      { _id: { $in: userIds }, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } },
      '_id pushSubscriptions',
    ).lean();

    // (webpush might not be sent immediately) roll back 5 seconds, webpush notification will not re-trigger fetch
    const payload = `${event}#${subSeconds(Date.now(), 5).getTime()}`;

    // send socket.io, webpush notification
    await Promise.all([
      socketServer.emit({ userIds: users.map(user => user._id), event, msg }), // send socket message
      webpushEnabled && // send webpush
        Promise.all(
          users
            .map(user =>
              user.pushSubscriptions.map(({ endpoint, p256dh, auth }) => ({ endpoint, keys: { p256dh, auth } })),
            )
            .flat()
            .map(async sub => webpush.sendNotification(sub, payload, webpushOptions)),
        ),
    ]);
  }

  // push notify+sync into SyncJob (if satellite is read to queue)
  if (tenant && (await findSatelliteTenantById(tenant, 'queue'))) await queueSyncJob(tenant, notify, sync);
};

/**
 * Sync To all Satellites
 * note: queue into syncJob
 */
export const syncToAllSatellites = async (sync: SyncJobDocument['sync']) => {
  if (config.mode === 'HUB') {
    const satelliteTenants = await findSatelliteTenants('queue');
    await Promise.all(satelliteTenants.map(async ({ _id }) => queueSyncJob(_id, null, sync)));
  }
};
