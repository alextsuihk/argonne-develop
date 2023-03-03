/**
 * JEST Test: /api/chats routes
 *
 */

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import { expectedIdFormat, FAKE, FAKE2, jestSetup, jestTeardown, prob, randomId, shuffle } from '../../jest';
import type { ChatDocument } from '../../models/chat';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ClassroomDocument } from '../../models/classroom';
import Classroom from '../../models/classroom';
import { ContentDocument } from '../../models/content';
import type { UserDocument } from '../../models/user';
import { schoolYear } from '../../utils/helper';
import commonTest from './rest-api-test';

const { CHAT } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany, getUnauthenticated } = commonTest;
const route = 'chats';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: LeanDocument<UserDocument> | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantId: string | null;

  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    parents: expect.arrayContaining([expect.any(String)]),
    // title: expect.any(String),
    members: expect.arrayContaining([expect.objectContaining({ user: expect.any(String), flags: expect.any(Array) })]),
    contents: expect.arrayContaining([
      expect.objectContaining({
        _id: expectedIdFormat,
        flags: expect.any(Array),
        parents: expect.arrayContaining([expect.any(String)]),
        creator: expect.any(String),
        data: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    ]),

    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  };

  beforeAll(async () => {
    ({ adminUser, normalUser, normalUsers, tenantId } = await jestSetup(['admin', 'normal']));
  });

  afterAll(jestTeardown);

  test('should pass when getMany & getById (as normalUser)', async () =>
    getMany(route, { 'Jest-User': normalUser!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should pass when getMany & getById (as adminUser)', async () =>
    getMany(route, { 'Jest-User': adminUser!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when accessing as guest', async () => getUnauthenticated(route, {}));

  const commonFullSuite = async (type: 'chatGroup' | 'classroom') => {
    expect.assertions(10 * 3 + 4);

    const classrooms = await Classroom.find({ tenant: tenantId!, deletedAt: { $exists: false } }).lean();
    const [attachingClassroom] = classrooms.sort(shuffle);
    const teacherId = randomId(attachingClassroom!.teachers);

    const userId = normalUsers!.find(user => user._id.toString() !== teacherId)!._id.toString();

    const parentDoc =
      type === 'chatGroup'
        ? await ChatGroup.create<Partial<ChatGroupDocument>>({
            tenant: tenantId!,
            title: `Chat Test (apollo)`,
            admins: [teacherId],
            users: [teacherId, userId],
            chats: [],
          })
        : await Classroom.create<Partial<ClassroomDocument>>({
            tenant: tenantId!,
            year: schoolYear(),
            teachers: [teacherId],
            students: [userId],
          });
    const parent = `/${type}s/${parentDoc._id}`;

    const titleProb = prob(0.5);
    const chat1 = await createUpdateDelete<ChatDocument>(
      route,
      { 'Jest-User': teacherId },
      [
        {
          action: 'create', // teacher create a new chat
          data: { ...(titleProb && { title: `FAKE(1)` }), parent, content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            ...(titleProb && { title: `FAKE(1)` }),
            parents: [parent],
            members: [
              expect.objectContaining({ user: teacherId, flags: [], lastViewedAt: expect.any(String) }),
              expect.objectContaining({ user: userId, flags: [] }),
            ],
          },
        },
      ],
      { skipAssertion: true },
    );
    const chatId = chat1!._id.toString();
    expect(chat1!.contents.length).toBe(1); // only one content

    const timestamp = new Date();
    const chat2 = await createUpdateDelete<ChatDocument>(
      route,
      { 'Jest-User': userId },
      [
        {
          action: 'updateLastViewedAt', // user updateLastViewedAt()
          data: { parent, timestamp },
          expectedMinFormat: {
            ...expectedMinFormat,
            members: [
              expect.objectContaining({ user: teacherId, flags: [], lastViewedAt: expect.any(String) }),
              expect.objectContaining({ user: userId, flags: [], lastViewedAt: timestamp.toISOString() }),
            ],
          },
        },
        {
          action: 'create', // user add 2nd content
          data: { id: chatId, parent, content: FAKE2 },
          expectedMinFormat,
        },
        {
          action: 'create', // user add 3rd content
          data: { id: chatId, parent, content: FAKE2 },
          expectedMinFormat,
        },
      ],
      { skipAssertion: true, overrideId: chatId },
    );
    expect(chat2!.contents.length).toBe(3); // only 3 contents (1 from teacher, 3 from user)

    const chat3 = await createUpdateDelete<ChatDocument>(
      route,
      { 'Jest-User': userId },
      [
        {
          action: 'recallContent', // user recall content
          data: { id: chatId, parent, contentId: (chat2!.contents[1] as ContentDocument)._id },
          expectedMinFormat,
        },
        {
          action: 'blockContent', // teacher block content
          headers: { 'Jest-User': teacherId },
          data: { id: chatId, parent, contentId: (chat2!.contents[2] as ContentDocument)._id, remark: FAKE },
          expectedMinFormat,
        },
        {
          action: 'setFlag', // user setFlag
          data: { id: chatId, parent, flag: CHAT.MEMBER.FLAG.IMPORTANT },
          expectedMinFormat: {
            members: [
              expect.objectContaining({ user: teacherId, flags: [], lastViewedAt: expect.any(String) }),
              expect.objectContaining({
                user: userId,
                flags: [CHAT.MEMBER.FLAG.IMPORTANT],
                lastViewedAt: expect.any(String),
              }),
            ],
          },
        },
        {
          action: 'clearFlag', // user clearFlag
          data: { id: chatId, parent, flag: CHAT.MEMBER.FLAG.IMPORTANT },
          expectedMinFormat: {
            members: [
              expect.objectContaining({ user: teacherId, flags: [], lastViewedAt: expect.any(String) }),
              expect.objectContaining({ user: userId, flags: [], lastViewedAt: expect.any(String) }),
            ],
          },
        },
        {
          action: 'updateTitle', // teacher updateTitle
          headers: { 'Jest-User': teacherId },
          data: { parent, title: FAKE2 },
          expectedMinFormat: { ...expectedMinFormat, title: FAKE2 },
        },
        {
          action: 'attachToClassroom', // teacher attachToClassroom
          headers: { 'Jest-User': teacherId },
          data: { parent, classroomId: attachingClassroom._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            parents: [parent, `/classrooms/${attachingClassroom._id.toString()}`],
          },
        },
      ],
      { skipAssertion: true, overrideId: chatId },
    );

    const contents = chat3!.contents as ContentDocument[];

    expect(contents[1].data.startsWith(CONTENT_PREFIX.RECALLED) && contents[1].data.endsWith(userId)).toBeTrue();
    expect(contents[2].data.startsWith(CONTENT_PREFIX.BLOCKED) && contents[1].data.endsWith(userId)).toBeTrue();
  };

  test('should pass the full suite (chatGroup)', async () => commonFullSuite('chatGroup'));
  test('should pass the full suite (classroom)', async () => commonFullSuite('classroom'));
});
