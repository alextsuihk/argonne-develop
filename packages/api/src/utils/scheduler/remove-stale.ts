/**
 * Remove-Stale
 *
 * remove inter-linked stale documents (assignment, chat, chatGroup, classroom, question, etc)
 */

import { subDays } from 'date-fns';

import configLoader from '../../config/config-loader';
import Assignment, { Homework } from '../../models/assignment';
import Chat from '../../models/chat';
import ChatGroup from '../../models/chat-group';
import Classroom from '../../models/classroom';
import Content from '../../models/content';
import Question from '../../models/question';
import { idsToString } from '../helper';
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

  const chatGroupChatIds = chatGroups.map(c => idsToString(c.chats)).flat();
  const classroomChatIds = classrooms.map(c => idsToString(c.chats)).flat();
  const chatIds = Array.from(new Set([...classroomChatIds, ...chatGroupChatIds]));

  const chats = await Chat.find({ _id: { $in: chatIds } }).lean();
  const assignments = await Assignment.find({ _id: classrooms.map(c => idsToString(c.assignments)).flat() }).lean();
  const homeworks = await Homework.find({ _id: assignments.map(a => idsToString(a.homeworks)).flat() }).lean();

  const chatContentIds = Array.from(new Set(chats.map(c => idsToString(c.contents)).flat()));
  const homeworkContentId = homeworks.map(h => idsToString(h.contents)).flat();
  const questionContentIds = Array.from(new Set(questions.map(q => idsToString([q.content, ...q.contents])).flat()));

  await Promise.all([
    ...chatGroups.map(async chatGroup => chatGroup.logoUrl && storage.removeObject(chatGroup.logoUrl)),
    Assignment.deleteMany({ _id: { $in: assignments } }),
    Content.deleteMany({ _id: { $in: [...chatContentIds, ...homeworkContentId, ...questionContentIds] } }),
    Chat.deleteMany({ _id: { $in: chatIds } }),
    Classroom.deleteMany({ _id: { $in: classrooms } }),
    ChatGroup.deleteMany({ _id: { $in: chatGroups } }),
    Homework.deleteMany({ _id: { $in: homeworks } }),
    Question.deleteMany({ _id: { $in: questions } }),
  ]);
};
