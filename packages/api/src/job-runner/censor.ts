/**
 * Censor content (primarily chatGroup & question)
 * note: no need to censor Classroom, Assignment & Homework (where teachers are present)
 *
 */

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';
import * as yup from 'yup';

import configLoader from '../config/config-loader';
import ChatGroup from '../models/chat-group';
import Content from '../models/content';
import Question from '../models/question';
import Tenant from '../models/tenant';
import User from '../models/user';
import { startChatGroup } from '../utils/chat';
import { notifySync } from '../utils/notify-sync';

const { CHAT_GROUP, CONTENT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const chatMsg = (link: string, data: string) => ({
  enUS: `Your message content "${data}" might contain inappropriate language [${link}].`,
  zhCN: `你有一则发文 "${data}" 可能含有不当词语 [${link}] 。`,
  zhHK: `你有一則發文 "${data}" 可能含有不當詞語 [${link}] 。`,
});

const censor = async (args: unknown): Promise<void> => {
  const { tenantId, userLocale, model, parentId, contentId } = await yup
    .object({
      tenantId: yup.string().required(),
      userId: yup.string().required(),
      userLocale: yup.string().required(),
      model: yup.string().required(),
      parentId: yup.string().required(),
      contentId: yup.string().required(),
    })
    .validate(args);

  const [content, { marshals, flaggedWords }] = await Promise.all([
    Content.findById(contentId).lean(),
    Tenant.findByTenantId(tenantId),
  ]);

  if (!content) throw `content ${contentId} not found`;

  const { data, creator } = content;
  if (!data.startsWith(CONTENT_PREFIX.PLAIN)) return; // TODO: later....

  const violations = [...DEFAULTS.BANNED_WORDS, ...flaggedWords].filter(word => data.includes(word));
  if (!violations.length) return;

  await Promise.all([
    startChatGroup(
      tenantId,
      chatMsg(`/${model}/${parentId}`, data),
      [creator, ...marshals],
      userLocale,
      `USER#${creator}#${model.toUpperCase()}#${parentId}`,
      CHAT_GROUP.FLAG.CENSOR,
    ),
    model === 'chat-groups'
      ? ChatGroup.updateOne({ _id: parentId }, { $addToSet: { marshals: { $each: marshals } } })
      : Question.updateOne({ _id: parentId }, { $addToSet: { marshals: { $each: marshals } } }),
    Content.updateOne(content, { $push: { flags: CONTENT.FLAG.INAPPROPRIATE } }),
    User.updateOne(
      { _id: creator },
      {
        $push: {
          violations: {
            createdAt: new Date(),
            reason: USER.VIOLATION.CENSOR,
            link: `/${model}/${parentId}/${content._id}`,
          },
        },
      },
    ),

    notifySync(model === 'chat-groups' ? 'CHAT-GROUP' : 'QUESTION', { tenantId, userIds: marshals }, {}), // only need to notify newly add marshals
  ]);
};

export default censor;
