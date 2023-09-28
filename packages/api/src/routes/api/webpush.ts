// todo = 'only test with non-React, WIP';

/**
 * Route: Webpush
 *
 *  push subscription
 */

import { Router } from 'express';
import { auth } from '../../middleware/auth'; // TODO: to implement auth & admin
import webpush from '../../utils/messaging/webpush.ts';

const router = Router();

/**
 * @route   GET api/webpush/subscribe
 * @desc    subscribe webpush
 * @access  Private //TODO: change to private (admin)
 */
// TODO: add auth middleware
router.post('/subscribe', (req, res): void => {
  console.log('received /webpush/subscribe');
  // Get pushSubscription object
  const subscription = req.body;
  // const userId = req.user.userId;
  const userId = 56789;
  const token = 'TODO: JWT token here';
  // webpush.addSubscription(userId, subscription);

  // TODO: debug code
  console.log('webpush subscription:', subscription.endpoint);

  // store the userId & subscription
  webpush.addSubscription(userId, token, subscription);

  // TODO: store JSON.stringified subscription info into database

  // Create payload
  const payload = JSON.stringify({ title: 'Push Test (Alex)' });

  // Setup options  // TODO: to be implemented
  const options = {};

  setTimeout(() => {
    console.log(`Sending a test push Notification to ${userId}`);
    webpush.sendNotificationToUser(userId, payload);

    // Pass object to into sendNotification
    // webpush
    //   .sendNotification(subscription, payload, options)
    //   .then(() => {
    //     // TODO: in case we need to do something
    //     console.log('webpush: Service Provider has accepted the Push Notification request ');
    //   })
    //   .catch(err => {
    //     // TODO: push the notifications to
    //     console.log(' Error in sending Notification: ', err);
    //   });
  }, 1000);

  // Send 201 - resource created
  res.status(201).json({});
});

/**
 * @route   GET api/webpush/unsubscribe
 * @desc    unsubscribe webpush
 * @access  Private //TODO: change to private (admin)
 */
router.post('/unsubscribe', (req, res): void => {
  // TODO: to be implemented
  console.log('User has unsubscribed webpush userId');

  // Remove subscription in database

  res.status(201).json({});
});

export default router;
