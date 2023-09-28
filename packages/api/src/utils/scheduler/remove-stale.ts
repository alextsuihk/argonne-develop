/**
 * Remove-Stale
 *
 * remove inter-linked stale documents (assignment, chatGroup, classroom, question, and associated chats & contents etc)
 *
 * ! TODO: also add a few demo chatGroups, questions & assignments+homework (with realistic contents)
 */

import { subDays } from 'date-fns';
import type { Types } from 'mongoose';

import configLoader from '../../config/config-loader';
import Assignment from '../../models/assignment';
import Chat, { ChatDocument } from '../../models/chat';
import ChatGroup from '../../models/chat-group';
import Classroom from '../../models/classroom';
import type { ContentDocument, Id } from '../../models/content';
import Content from '../../models/content';
import Homework from '../../models/homework';
import Question from '../../models/question';
import storage from '../storage';

const { DEFAULTS } = configLoader;

/**
 * Remove bygone (stale. old) chats & classroom
 */
export const removeStale = async (): Promise<void> => {
  const [chatGroups, classrooms, questions] = await Promise.all([
    ChatGroup.find({ updatedAt: { $lt: subDays(Date.now(), DEFAULTS.BYGONE_DAYS) } }).lean(),
    Classroom.find({ updatedAt: { $lt: subDays(Date.now(), DEFAULTS.BYGONE_DAYS) } }).lean(),
    Question.find({ updatedAt: { $lt: subDays(Date.now(), DEFAULTS.BYGONE_DAYS) } }).lean(),
  ]);

  const chatIds = [...chatGroups.map(c => c.chats), ...classrooms.map(c => c.chats)].flat() as Types.ObjectId[];
  const [assignments, chats] = await Promise.all([
    Assignment.find({ _id: { $in: classrooms.map(c => c.assignments).flat() } }).lean(),
    Chat.find({ _id: { $in: chatIds } }).lean(),
  ]);

  const [homeworks] = await Promise.all([
    Homework.find({ _id: { $in: assignments.map(a => a.homeworks).flat() } }).lean(),
  ]);

  // remove parents belong to chatGroups & classrooms (some chats are attached to other non-bygone chatGroups, classrooms)
  const parentsTrimmedChats: (Pick<ChatDocument, 'parents' | 'contents'> & Id)[] = chats.map(
    ({ _id, contents, parents }) => ({
      _id,
      contents,
      parents: parents.filter(
        p =>
          !chatGroups.some(c => c._id.equals(p.replace('/chatGroups/', ''))) &&
          !classrooms.some(c => c._id.equals(p.replace('/classrooms/', ''))),
      ),
    }),
  );

  // update allContents' parents
  const allContents = await Content.find(
    {
      _id: {
        $in: [
          ...chats.map(chat => chat.contents).flat(),
          ...homeworks.map(h => h.contents).flat(),
          ...questions.map(q => [...q.contents, ...q.bids.map(b => b.contents).flat()]).flat(),
        ],
      },
    },
    '-data',
  ).lean();

  // remove parents which in the deleting chats, homeworks, questions
  const parentsTrimmedContents: (Pick<ContentDocument, 'parents'> & Id)[] = allContents.map(({ _id, parents }) => ({
    _id,
    parents: parents.filter(
      p =>
        !(
          chatIds.some(x => x.equals(p.replace('/chats/', ''))) ||
          homeworks.some(x => x._id.equals(p.replace('/homeworks/', ''))) ||
          questions.some(x => x._id.equals(p.replace('/questions/', '')))
        ),
    ),
  }));

  await Promise.all([
    ChatGroup.deleteMany({ _id: { $in: chatGroups } }),
    ...chatGroups
      .map(c => c.logoUrl)
      .filter((logoUrl): logoUrl is string => !!logoUrl)
      .map(async logoUrl => storage.removeObject(logoUrl)), // remove chatGroups' logoUrl if exists

    Classroom.deleteMany({ _id: { $in: classrooms } }),
    Assignment.deleteMany({ _id: { $in: assignments } }),
    Homework.deleteMany({ _id: { $in: homeworks } }),
    Question.deleteMany({ _id: { $in: questions } }),

    Chat.deleteMany({ _id: { $in: parentsTrimmedChats.filter(chat => !chat.parents.length) } }), // safe to remove orphan chats
    ...parentsTrimmedChats
      .filter(chat => chat.parents.length)
      .map(async chat => Chat.updateOne(chat, { parents: chat.parents })),

    Content.deleteMany({ _id: { $in: parentsTrimmedContents.filter(content => !content.parents.length) } }), // safe to remove orphan contents
    ...parentsTrimmedContents
      .filter(content => content.parents.length)
      .map(async content => Content.updateOne(content, { parents: content.parents })),
  ]);
};
