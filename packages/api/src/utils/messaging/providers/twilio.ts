// todo = 'need to re-verify';

/**
 * util: Twilio
 *
 * using Twilio to send message to Whatsapp
 *
 * https://www.twilio.com/docs/sms/whatsapp/quickstart/node
 */

import twilio from 'twilio';

import configLoader from '../../../config/config-loader';
import log from '../../log';

const { accountSid, authToken } = configLoader.config.message.twilio;

// const client = twilio(accountSid, authToken, { lazyLoading: true, region: 'au1', edge: 'sydney' });

/**
 * Post a text message to a Whatsapp user using Twilio
 *
 * @param msg
 * @param to
 */
const whatsapp = async (msg: string, to: string, from: string): Promise<void> => {
  if (accountSid && authToken) {
    const client = twilio(accountSid, authToken, { lazyLoading: true });
    client.messages
      .create({
        body: msg,
        from: `whatsapp:${from}`,
        to: `whatsapp:${to}`,
      })
      .catch(error => log('warn', 'fail to send Whatsapp via Twilio', error));
  }
};

export default { whatsapp };
