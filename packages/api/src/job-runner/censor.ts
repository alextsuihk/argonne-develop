/**
 * Censor content (primarily chatGroup & question)
 * note: no need to censor Classroom, Assignment & Homework (where teachers are present)
 *
 */

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';
import type { UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import { signContentIds } from '../controllers/content';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import type { Task } from '../models/job';
import type { QuestionDocument } from '../models/question';
import Question from '../models/question';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import { mongoId } from '../utils/helper';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';

const { CHAT_GROUP, CONTENT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const chatMsg = (link: string, data: string) => ({
  enUS: `Your message content "${data}" might contain inappropriate language [${link}].`,
  zhCN: `你有一则发文 "${data}" 可能含有不当词语 [${link}] 。`,
  zhHK: `你有一則發文 "${data}" 可能含有不當詞語 [${link}] 。`,
});

const censor = async (task: Task): Promise<string> => {
  if (task.type !== 'censor') return 'IMPOSSIBLE';

  const { tenantId, userLocale, model, parentId, contentId } = task;
  const [content, tenant] = await Promise.all([Content.findById(contentId).lean(), Tenant.findByTenantId(tenantId)]);

  if (!content) throw `content ${contentId} not found`;

  const { data, creator } = content;
  if (!data.startsWith(CONTENT_PREFIX.PLAIN)) return 'Presently, only support Plain Text format'; // TODO: later....

  const violations = [...DEFAULTS.BANNED_WORDS, ...tenant.flaggedWords].filter(word => data.includes(word));
  if (!violations.length) return 'No Violation';

  const update: UpdateQuery<ChatGroupDocument | QuestionDocument> = {
    $addToSet: { marshals: { $each: tenant.marshals } },
  };
  const contentUpdate: UpdateQuery<ContentDocument> = { $addToSet: { flags: CONTENT.FLAG.INAPPROPRIATE } };
  const userUpdate: UpdateQuery<UserDocument> = {
    $push: {
      violations: {
        _id: mongoId(),
        createdAt: new Date(),
        reason: USER.VIOLATION.CENSOR,
        link: `/${model}/${parentId}/${content._id}`,
      },
    },
  };
  const [{ chatGroup, chat, content: newContent }] = await Promise.all([
    startChatGroup(
      tenant._id,
      chatMsg(`/${model}/${parentId}`, data),
      [creator, ...tenant.marshals],
      userLocale,
      `USER#${creator}#${model.toUpperCase()}#${parentId}`,
      CHAT_GROUP.FLAG.CENSOR,
    ),
    model === 'chat-groups'
      ? ChatGroup.updateOne({ _id: parentId }, update)
      : Question.updateOne({ _id: parentId }, update),
    Content.updateOne(content, contentUpdate),
    User.updateOne({ _id: creator }, userUpdate),
  ]);

  await notifySync(
    tenant._id,
    { userIds: [creator, ...tenant.marshals], event: model === 'chat-groups' ? 'CHAT-GROUP' : 'QUESTION' },
    {
      bulkWrite: {
        chatGroups: [
          { insertOne: { document: chatGroup } },
          ...(model === 'chat-groups' ? [{ updateOne: { filter: { _id: parentId }, update } }] : []),
        ] satisfies BulkWrite<ChatGroupDocument>,
        ...(model === 'questions' && {
          questions: [{ updateOne: { filter: { _id: parentId }, update } }] satisfies BulkWrite<QuestionDocument>,
        }),

        chats: [{ insertOne: { document: chat } }],
        contents: [
          { updateOne: { filter: { _id: content._id }, update: contentUpdate } },
        ] satisfies BulkWrite<ContentDocument>,
        users: [{ updateOne: { filter: { _id: creator }, update: userUpdate } }] satisfies BulkWrite<UserDocument>,
      },
      contentsToken: await signContentIds(null, [newContent._id]),
    },
  );

  return `Violation Words: ${violations.join(',')}`;
};

export default censor;
