/**
 * Job-Runner: Send Update satellite
 *
 * syncJob MUST be executed in chronological order. do not proceed to next syncJob if any failure
 * ! note: single instance per satellite
 */

import axios from 'axios';

import configLoader from '../config/config-loader';
import { SyncResponse } from '../controllers/satellite';
import SyncJob from '../models/sync-job';
import Tenant from '../models/tenant';
import log from '../utils/log';

const { config, DEFAULTS } = configLoader;

const syncInProgressTenants: string[] = [];

/**
 * SendSync to satellite tenant
 * ! single instance per satellite tenant
 *  note: notify is sent ONLY in first attempt. does not make sense to send de
 */
export const sync = async (tenantId: string) => {
  if (syncInProgressTenants.includes(tenantId)) return; // single instance per satellite
  syncInProgressTenants.push(tenantId); // indicate this tenantId is now sync-in-progress

  const findNextSyncJob = async () =>
    SyncJob.findOne({ tenant: tenantId, completedAt: { $exists: false } })
      .sort('createdAt')
      .lean();

  const tenant = await Tenant.findSatelliteById(tenantId);

  const destination = tenant
    ? {
        url: config.mode === 'SATELLITE' ? DEFAULTS.ARGONNE_URL : tenant.satelliteUrl,
        apiKey: tenant.apiKey,
      } // satellite could ONLY send sync-data to hub
    : null;

  if (destination) {
    let syncJob = await findNextSyncJob();

    while (syncJob) {
      const { _id, attempt, notify, sync } = syncJob;
      try {
        const { data } = await axios.patch<SyncResponse>(
          `${destination.url}/api/satellite/sync`,
          {
            apiKey: destination.apiKey,
            attempt: attempt + 1,
            syncJobId: _id.toString(),
            stringifiedNotify: attempt < 1 ? JSON.stringify(notify) : null, // do notify() ONLY for first 2 attempts
            stringifiedSync: JSON.stringify(sync),
            tenantId,
            timestamp: new Date(),
            version: config.buildInfo,
          },
          { timeout: DEFAULTS.AXIOS_TIMEOUT },
        );

        await SyncJob.updateOne(
          { _id },
          { $inc: { attempt: 1 }, completedAt: new Date(), result: JSON.stringify(data) },
        );
      } catch (error) {
        await Promise.all([
          SyncJob.updateOne({ _id }, { $inc: { attempt: 1 }, result: `error: ${JSON.stringify(error)}` }),

          !((attempt + 1) % DEFAULTS.JOB_RUNNER.SYNC.ATTEMPT_FAILURE_WRITE_LOG) && // for error, log every n attempts
            log('error', `satellite sync error (too many attempts)`, {
              syncJobId: _id.toString(),
              attempt: attempt + 1,
              error: JSON.stringify(error),
            }),
        ]);
        break; // for ANY failure, break the while loop (wait for next interval)
      }

      syncJob = await findNextSyncJob();
    }
  }

  const index = syncInProgressTenants.indexOf(tenantId);
  if (index >= 0) syncInProgressTenants.splice(index, 1); // just be safe, index should be greater then or equal to 0
};

export default sync;
