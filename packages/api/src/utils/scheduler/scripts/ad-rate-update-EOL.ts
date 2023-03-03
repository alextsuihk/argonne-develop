// TODO: Place holder to update ad-rate
/// move to offline python script

/**
 * Update AD rate by district
 */

import { subDays } from 'date-fns';

import District from '../../../models/district';
import Tenant from '../../../models/tenant';

const run = async (): Promise<void> => {
  const [districts, rootTenant] = await Promise.all([
    District.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.findOne().sort('createdAt'),
  ]);

  const updatedAt = (rootTenant?.meta.get('adRateUpdatedAt') ?? subDays(new Date(), 7)) as Date;
  for (const district of districts) {
    //
  }
  console.log('>>>>');
};

export default { run };
