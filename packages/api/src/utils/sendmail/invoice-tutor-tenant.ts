/**
 * Sendmail: Invoice Tutor Tenant
 */

import configLoader from '../../config/config-loader';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { messageToAdmin } from '../chat';
import { idsToString } from '../helper';
import { sendmail } from './common';

const { config } = configLoader;

export default async (): Promise<void> => {
  const [paidTenants, { accountId }] = await Promise.all([
    Tenant.find({ school: { $exists: false } }).lean(),
    User.findSystemAccountIds(),
  ]);

  for (const tenant of paidTenants) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
    const subject = `Invoice: ${month} - ${new Date().getFullYear()} ${tenant.name}`;
    const users = await User.find({ _id: { $in: tenant.admins } }).lean();
    const emails = [...users.map(u => u.emails).flat(), config.adminEmail];

    // TODO: if (new Date() < tenant.freeUntil), free of charge

    const userCount = await User.countDocuments({ tenants: tenant, deletedAt: { $exist: false } });
    const body = `TODO: test billing ${subject} >>> ${userCount}`;

    await Promise.all([
      sendmail(emails, subject, body, `${__filename}: [ ${subject} ] ${JSON.stringify(emails)}`),
      messageToAdmin(body, accountId, 'enUS', [], idsToString(users), `TENANT#${tenant._id}`),
    ]);
  }
};
