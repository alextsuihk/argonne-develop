/**
 * Task: Generate Report
 *
 * !note: execute in hub-mode only, and sync back to satellite
 */

import configLoader from '../config/config-loader';
import type { Task } from '../models/job';

export default async (task: Task): Promise<string> => {
  if (task.type !== 'report' || configLoader.config.mode === 'SATELLITE') return 'IMPOSSIBLE';

  try {
    const report = await import(`./reports/${task.file}`);
    return report(task.args);
  } catch (error) {
    throw `There is an error in report....`;
  }
};
