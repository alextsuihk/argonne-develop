/**
 * Sync: sync data between satellite & hub
 *
 */

import type { DocumentSync } from '@argonne/common';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import Job from '../models/job';
import Tenant from '../models/tenant';
import User from '../models/user';
import { isProdMode } from './environment';
import { idsToString } from './helper';
import storage from './storage';

type Notify = { tenantId?: string | Types.ObjectId; userIds?: (string | Types.ObjectId)[] };

const { config, DEFAULTS } = configLoader;

const TODO_ENABLE_LATER = true;

export const sync = async (
  { tenantId, userIds }: Notify,
  { jobIds: _, minioAddItems, ...doc }: DocumentSync,
  adjPriority = 0,
): Promise<void> => {
  if (!isProdMode) return;

  // if (config.mode === 'HUB') {
  //   if (tenantId) {

  //   }
  // } else {

  // }

  const satelliteTenants = await Tenant.findSatellites();
  const uniqueUserIds = Array.from(new Set(idsToString(userIds ?? [])));

  // if (config.mode === 'HUB') {

  // } else {

  // }

  if (tenantId) {
    // general sync between hub <-> single satellite
    const url =
      config.mode === 'HUB'
        ? satelliteTenants.find(t => t._id.toString() === tenantId)?.satelliteUrl
        : DEFAULTS.ARGONNE_URL;

    if (url)
      await Job.queue({
        task: 'sync',
        args: {
          url,
          usersIds: uniqueUserIds,
          ...doc,
          ...(minioAddItems && { minioAddItems }),
        },
        startAfter: new Date(),
        priority: 10 + adjPriority,
      });
  } else if (userIds?.length) {
    // usage cases: adminChat, contact, oauth, password, role, user-profile, etc
    // although it should always be a single user, we want to have this function generic enough for multiple users
    if (config.mode == 'HUB') {
      const users = await User.find({ _id: { $in: userIds } }).lean();

      const uniqueUserTenantIds = Array.from(new Set(idsToString(users.map(user => user.tenants).flat())));
      const targetTenantUrls = satelliteTenants
        .filter(t => t.satelliteUrl && uniqueUserTenantIds.includes(t._id.toString()))
        .map(t => t.satelliteUrl!);

      await Promise.all(
        targetTenantUrls.map(async url =>
          Job.queue({
            task: 'sync',
            args: {
              url,
              usersIds: uniqueUserIds,
              ...doc,
              ...(minioAddItems && { minioAddItems }),
            },
            startAfter: new Date(),
            priority: 10,
          }),
        ),
      );
    } else {
      // satellite could ONLY update hub
      await Job.queue({
        task: 'sync',
        args: {
          url: DEFAULTS.ARGONNE_URL,
          usersIds: uniqueUserIds,
          ...doc,
          ...(minioAddItems && { minioAddItems }),
        },
        startAfter: new Date(),
        priority: 10,
      });
    }
  } else {
    if (config.mode === 'HUB') {
      // send to all satellite tenants (core database)
      const satelliteTenants = await Tenant.findSatellites();
      await Promise.all(
        satelliteTenants.map(t =>
          Job.queue({
            task: 'sync',
            args: { tenantId: t._id.toString(), ...doc },
            startAfter: new Date(),
            priority: 10,
          }),
        ),
      );
    } else {
      console.log(`sync-satellite ERROR >>> (impossible case) ${Object.keys(doc)}, ${userIds}`);
    }
  }
};

export default sync;
