// TODO: not in use
// TODO: placeholder to

/**
 * Censor content (primarily chatGroup & question)
 * note: no need to censor Classroom, Assignment & Homework (where teachers are present)
 *
 * !TODO: censor embedded content
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import ChatGroup from '../models/chat-group';
import Content, { ContentDocument } from '../models/content';
import Question from '../models/question';
import Tenant from '../models/tenant';
import User from '../models/user';
import { messageToAdmin } from './chat';
import { idsToString } from './helper';
import { notify } from './messaging';
import syncSatellite from './sync-satellite';

const { CONTENT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const chatMsg = (parent: string, data: string) => ({
  enUS: `Your message content "${data}" might contain inappropriate language [/${parent}].`,
  zhCN: `你有一则发文 "${data}" 可能含有不当词语 [/${parent}] 。`,
  zhHK: `你有一則發文 "${data}" 可能含有不當詞語 [/${parent}] 。`,
});

const censor = async (
  tenantId: string | Types.ObjectId,
  parent: string,
  content: ContentDocument,
  userLocale: string,
): Promise<void> => {
  const [model, id] = parent.split('/').splice(1);
  if (!model || !id || (model !== 'chatGroups' && model !== 'classrooms' && model !== 'questions')) return;

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) return;

  const { data, creator } = content;
  const contentId = content._id.toString();

  const violations = [...DEFAULTS.BANNED_WORDS, ...tenant.flaggedWords].filter(word => data.includes(word));
  if (!violations.length) return;

  const marshalIds = idsToString(tenant.marshals);

  if (model === 'chatGroups') {
    const chatGroup = await ChatGroup.findById(id).lean();
    if (chatGroup) {
      const newUserIds = marshalIds.filter(x => !idsToString(chatGroup.users).includes(x));
      const userIds = [...idsToString(chatGroup.users), ...marshalIds];
      await Promise.all([
        messageToAdmin(chatMsg(parent, data), creator, userLocale, [], marshalIds, `USER#${creator}`),
        ChatGroup.findByIdAndUpdate(id, { $push: { users: newUserIds } }).lean(),
        Content.findByIdAndUpdate(content, { $push: { flags: CONTENT.FLAG.INAPPROPRIATE } }).lean(),
        User.findByIdAndUpdate(creator, {
          $push: {
            violations: { createdAt: new Date(), reason: USER.VIOLATION.CENSOR, link: `${parent}/${contentId}` },
          },
        }).lean(),
        syncSatellite({ tenantId, userIds }, { chatGroupIds: [id], contentIds: [contentId] }),
        notify(userIds, 'CHAT', { chatGroupIds: [id], contentIds: [contentId] }),
      ]);
    }
  } else if (model === 'questions') {
    const question = await Question.findById(id).lean();
    if (question) {
      const newUserIds = marshalIds.filter(x => !idsToString(question.members.map(m => m.user)).includes(x));
      const userIds = [...idsToString(question.members.map(m => m.user)), ...marshalIds];

      await Promise.all([
        messageToAdmin(chatMsg(parent, data), creator, userLocale, [], marshalIds, `USER#${creator}`),
        Question.findByIdAndUpdate(id, { $push: { members: newUserIds.map(user => ({ user, flags: [] })) } }).lean(),
        Content.findByIdAndUpdate(content, { $push: { flags: CONTENT.FLAG.INAPPROPRIATE } }).lean(),
        User.findByIdAndUpdate(creator, {
          $push: {
            violations: { createdAt: new Date(), reason: USER.VIOLATION.CENSOR, link: `${parent}/${contentId}` },
          },
        }).lean(),
        syncSatellite({ tenantId, userIds }, { questionIds: [id], contentIds: [contentId] }),
        notify(userIds, 'CHAT', { questionIds: [id], contentIds: [contentId] }),
      ]);
    }
  }
};

export default censor;
