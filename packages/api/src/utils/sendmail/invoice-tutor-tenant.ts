/**
 * Sendmail: Invoice Tutor Tenant
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../../config/config-loader';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { startChatGroup } from '../chat';
import { sendmail } from './common';

const { enUS } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config } = configLoader;

export default async (): Promise<void> => {
  const [paidTenants, { alexId }] = await Promise.all([
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
      alexId && startChatGroup(tenant._id, body, [alexId, ...tenant.admins], enUS, `TENANT-INVOICING#${tenant._id}`),
    ]);

    await sendmail(emails, subject, body, `${__filename}: [ ${subject} ] ${JSON.stringify(emails)}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // add some delay, not to stress email server
  }
};
