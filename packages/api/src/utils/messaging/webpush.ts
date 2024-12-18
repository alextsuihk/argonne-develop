// todo = 'wIP, partial tested with hack webpush page';
// webpush icon 192x192 (send tenant logo)
// https://useinsider.com/what-is-web-push-notification/

/**
 * util: webpush
 *
 * Note: use Mongoose DB to store subscription
 * TODO: refer to Udemdy PWA EP156, Traversy WebPush
 */

//  notification options
// PWA EP157 2:06 (and eariler)

// var options = {
//  body: 'Hello world',
//  icon: '/src/images/icons/app-icon-96x96.png',
//  image: '/src/images/sf-boat.jpg',
//  dir: 'ltr', // left to right text
//  lang: 'en-US', // BCP 47
//  vibrate: [100, 50, 200],
//  badge: '/src/images/icons/app-icon-96x96.png', // Android notification bar, recommend 96x96
//  tag: 'confirm-notification', // only the latest tag will be shown
//  renotify: true, // even with same tag, phone will vibrate again
//  action: [  // OS might not process actions
//   { action: 'confirm', title: 'Okay', icon; '/src/images/icons/app-icon-96x96.png' },
//   { action: 'cancel', title: 'Cancel', icon; '/src/images/icons/app-icon-96x96.png' },
//  ],
//  ttl: 60 // keep message up to 60 seconds when device offline

// }

// when unregister serviceWorker, clear the associated vapid record in backend server

import webpush from 'web-push';

import configLoader from '../../config/config-loader';
import { WebpushDocument } from '../../models/schema/webpush';

/**
 * Setup Web-Push backend server
 */
const { config } = configLoader;

webpush.setVapidDetails(
  `mailto:${config.webpush.mailTo}`,
  config.webpush.vapid.publicKey,
  config.webpush.vapid.privateKey,
);

// Setup options  // TODO: to be implemented
const options = {
  // TTL: 60,
};

/**
 * Send a notification to a specific user
 */
const push = async (subscriptions: WebpushDocument[], payload: string | Buffer | null | undefined): Promise<number> => {
  let success = 0;
  for (const subscription of subscriptions) {
    try {
      const result = await webpush.sendNotification(subscription.subscription, payload, options);
      success++;
      console.log('webpush: Service Provider has accepted the Push Notification request ', result);
    } catch (error) {
      console.log(' Error in sending Notification: ', error);
    }
  }

  return success;
};

export default push;
