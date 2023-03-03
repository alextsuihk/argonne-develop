// todo = 'worked with Twillio test account long time again, need to re-test';
/**
 * util: Whatsapp
 *
 * This module sends Slack chat (notification) as a chat-bot
 *
 */

import configLoader from '../../config/config-loader';
import twilio from './providers/twilio';

const { whatsapp } = configLoader.config.message;
/**
 * Post a text message using Twilio service
 *
 * @param channel
 * @param recipient // format '+852987654321'
 */

//  recipients.map(recipient => twilio.whatsapp(text, recipient, whatsapp.from))
export default async (recipients: string[], text: string): Promise<void> => {
  const { from } = whatsapp;
  if (from) Promise.all(recipients.map(recipient => twilio.whatsapp(text, recipient, from)));
};
