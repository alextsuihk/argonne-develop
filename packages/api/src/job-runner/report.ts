/**
 * Task: Generate Report
 *
 * !note: execute in hub-mode only, and sync back to satellite
 */

import type { JobDocument } from '../models/job';

export default async (args: JobDocument['report']): Promise<string> => {
  if (!args || !args.tenantId || !args.file || !args.arg) return 'Internal Format Error';

  try {
    const report = await import(`./reports/${args.file}`);
    return report(args.arg);
  } catch (error) {
    throw `There is an error in report....`;
  }
};
