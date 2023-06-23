// TODO: depends on Mode
// if satellite, of course, ONLY upload with tenantId = self.tenantId
// for hub mode, upload with tenant.apiKey

import type { Args } from '../models/job';

// TODO:

// const { JOB } = LOCALE.DB_ENUM;
// const { DEFAULTS } = configLoader;

const sync = async (args: Args): Promise<string> => {
  const { url, userIds, districtIds, ...doc } = args;

  // /// TODO: job.args.docs.minioAddItems  signUrl()

  // console.log('sync args >>>>>>>>>>>>>>>>>> ', url, userIds);

  // // const [announcements, books] = await Promise.all([
  // //   doc.announcementIds && Announcement.find({ _id: { $in: doc.announcementIds } }).lean(),
  // //   doc.bookIds && Book.find({ _id: { $in: doc.bookIds } }).lean(),
  // // ]);

  // const x = Announcement.find({ _id: { $in: doc.announcementIds } }).lean();
  // const queries: [string, Promise<(BaseDocument & Id)[]>][] = [];

  // if (doc.bookIds) queries.push(['books', Book.find({ _id: { $in: doc.bookIds } }).lean()]);
  // if (doc.announcementIds)
  //   queries.push(['announcements', Announcement.find({ _id: { $in: doc.announcementIds } }).lean()]);

  // // wait until all mongoose queries complete
  // await Promise.all([Object.values(queries)]);

  // const upload = Object.fromEntries(queries);

  // axios.patch(`${DEFAULTS.ARGONNE_URL}/api/books`, { apiKey: tenant.apiKey, ...upload });

  // const urls: string[] = []; // presigned minio URL for download
  // // TODO: convert Url to presignedUrl

  return `TODO: feature not yet support ${args}`;
};

export default sync;
