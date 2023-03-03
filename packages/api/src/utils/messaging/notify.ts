/**
 * Notify Users
 *
 * send webpush if socket connection is not available
 */

import type { DocumentSync } from '@argonne/common';
import { LOCALE, NOTIFY_EVENTS } from '@argonne/common';
import type { Types } from 'mongoose';

import User from '../../models/user';
import socketServer from '../../socket-server';
import { isDevMode, isTestMode } from '../environment';
import { idsToString } from '../helper';

// TODO: if socket connected, send thru socket, otherwise, send FCM (webpush)

type NotifyEvent = (typeof NOTIFY_EVENTS)[number];

const { USER } = LOCALE.DB_ENUM;

export default async (
  userIds: (string | Types.ObjectId)[],
  event: NotifyEvent,
  payload?: DocumentSync,
): Promise<void> => {
  if (isDevMode || isTestMode) return;

  // await new Promise(resolve => setTimeout(resolve, 500));

  const uniqueUserIds = Array.from(new Set(idsToString(userIds))); // remove duplicated userIds
  socketServer.emit(uniqueUserIds, event, payload); // send socket message first

  // send FCM in case sockets are not connected
  for (const userId of uniqueUserIds) {
    const [user, userSocketIds] = await Promise.all([
      User.findOneActive({ _id: userId }, 'subscriptions'),
      socketServer.listSockets(userId),
    ]);

    const subscriptions = user?.subscriptions.filter(({ socketId }) => !userSocketIds.includes(socketId));
    if (isDevMode) console.log(`TODO: need to send FCM or WebPush ${userId} ---- ${subscriptions?.length}`);
    // TODO: send FCM to subscriptions...... (if subscriptions.length)
  }
};
