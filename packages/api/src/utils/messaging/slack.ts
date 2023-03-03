/**
 * util: Slack
 *
 * This module sends Slack chat (notification) as a chat-bot
 *
 */

import axios from 'axios';

import configLoader from '../../config/config-loader';
import log from '../log';

const { accessToken, channel, enable, url } = configLoader.config.message.slack;

/**
 * Post a text message to a Slack channel
 *
 * @param level
 * @param msg
 */
export default async (level: string, msg: string): Promise<void> => {
  if (accessToken && channel && enable && url)
    await axios
      .post(url, { channel, text: `${level}: ${msg}` }, { headers: { Authorization: `Bearer ${accessToken}` } })
      .catch(error => log('error', 'FAIL to send Slack ...', error));
};
