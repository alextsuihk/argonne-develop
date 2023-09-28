/**
 * Scheduler
 *
 */

import schedule from 'node-schedule';

import configLoader from '../../config/config-loader';
import questionController from '../../controllers/question';
import { updateHubVersion } from '../../controllers/system';
import invoiceTutorTenant from '../sendmail/invoice-tutor-tenant';
import storage from '../storage';
import { removeStale } from './remove-stale';
import { resetDemo } from './reset-demo';
import { updateTutorRanking } from './update-tutor-ranking';

// TODO: if satellite, check hub server-version, and send chat.toAdmin( { key=`TENANT#id`})

const start = async (): Promise<void> => {
  console.log('DEBUG >>>>>>>>>>>>>>>>>>> TODO: need to clean up scheduler/index.ts');

  // crontab MIN HOUR DOM MON DOW CMD
  // schedule.scheduleJob('15 1 * * *', Transaction.commitWithheld); // commit transaction  // TODO: move money from withheld to payees
  schedule.scheduleJob('0 6 3 * *', removeStale);
  schedule.scheduleJob('5/* * * * *', storage.removeExpiredObjects);

  if (configLoader.config.mode === 'HUB') {
    schedule.scheduleJob('15 7 3 * *', invoiceTutorTenant);
    schedule.scheduleJob('0 5 * * *', questionController.closeByScheduler);
    schedule.scheduleJob('20 1 * * *', updateTutorRanking);
    schedule.scheduleJob('0 2 * * 0', resetDemo);
  } else {
    schedule.scheduleJob('15 * * * *', updateHubVersion);
  }

  // TODO: obsoleteUser based on user.lastLoginAt $gte 1 year,
};

// TODO: contribution expiry reminder

export default { start };
