// TODO: depends on Mode
// if satellite, of course, ONLY upload with tenantId = self.tenantId
// for hub mode, upload with tenant.apiKey

import type { DocumentSync } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import axios from 'axios';
import type { Document, LeanDocument, Query } from 'mongoose';

import configLoader from '../../config/config-loader';
import Announcement from '../../models/announcement';
import Book from '../../models/book';
import Chat from '../../models/chat';
import ChatGroup from '../../models/chat-group';
import Content from '../../models/content';
import type { JobDocument } from '../../models/job';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { idsToString } from '../../utils/helper';

// TODO:

const { JOB } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const sync = async (job: JobDocument) => {
  const { tenantId, userIds, doc } = job.args as unknown as { tenantId: string; userIds: string[]; doc: DocumentSync };
  const satelliteTenants = await Tenant.findSatellites();
  const tenant = satelliteTenants.find(t => tenantId === t._id.toString());

  /// TODO: job.args.docs.minioAddItems  signUrl()

  if (!tenant?.apiKey) return true;

  console.log('sync args >>>>>>>>>>>>>>>>>> ', tenantId, userIds);

  // const [announcements, books] = await Promise.all([
  //   doc.announcementIds && Announcement.find({ _id: { $in: doc.announcementIds } }).lean(),
  //   doc.bookIds && Book.find({ _id: { $in: doc.bookIds } }).lean(),
  // ]);

  const queries: [string, Query<LeanDocument<Document>, Document>][] = [];

  if (doc.bookIds) queries.push(['books', Book.find({ _id: { $in: doc.bookIds } }).lean()]);
  if (doc.announcementIds)
    queries.push(['announcements', Announcement.find({ _id: { $in: doc.announcementIds } }).lean()]);

  // wait until all mongoose queries complete
  await Promise.all([Object.values(queries)]);

  const upload = Object.fromEntries(queries);

  axios.patch(`${DEFAULTS.ARGONNE_URL}/api/books`, { apiKey: tenant.apiKey, ...upload });

  const urls: string[] = []; // presigned minio URL for download
  // TODO: convert Url to presignedUrl

  // TODO: just throw error for any failures
  const completed = { status: JOB.STATUS.COMPLETED, progress: 100, completedAt: new Date() };
};

export default sync;
