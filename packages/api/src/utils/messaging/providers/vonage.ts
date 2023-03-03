/**
 * util: Vonage
 */

import configLoader from '../../../config/config-loader';
import log from '../../log';

const { apiKey } = configLoader.config.message.vonage;

const todo = async (msg: string, to: string, from: string): Promise<void> => {
  if (apiKey) console.log('TODO');
};

export default { todo };
