/**
 * Commonly used expected format & functions for jest
 *
 */

import 'jest-extended';

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import { ApolloServer, testServer } from './apollo';
import configLoader from './config/config-loader';
import jobRunner from './job-runner';
import type { AssignmentDocument } from './models/assignment';
import Assignment from './models/assignment';
import Book from './models/book';
import type { ChatDocument } from './models/chat';
import Chat from './models/chat';
import type { ChatGroupDocument } from './models/chat-group';
import ChatGroup from './models/chat-group';
import type { ClassroomDocument } from './models/classroom';
import Classroom from './models/classroom';
import type { ContentDocument } from './models/content';
import Content from './models/content';
import type { HomeworkDocument } from './models/homework';
import Homework from './models/homework';
import PresignedUrl from './models/presigned-url';
import type { QuestionDocument } from './models/question';
import Question from './models/question';
import Tenant from './models/tenant';
import type { Id, UserDocument } from './models/user';
import User from './models/user';
import { redisClient } from './redis';
import socketServer from './socket-server';
import { idsToString, mongoId, prob, randomString, schoolYear, shuffle, terminate } from './utils/helper';
import { client as minioClient, privateBucket, publicBucket } from './utils/storage';

export { ApolloServer, testServer } from './apollo';
export { idsToString, prob, randomId, randomString, shuffle } from './utils/helper';

type JestSetup = {
  adminServer: ApolloServer | null;
  adminUser: (UserDocument & Id) | null;
  guestServer: ApolloServer | null;
  normalServer: ApolloServer | null;
  normalUser: (UserDocument & Id) | null;
  normalUsers: (UserDocument & Id)[] | null;
  rootServer: ApolloServer | null;
  rootUser: (UserDocument & Id) | null;
  tenantAdmin: (UserDocument & Id) | null;
  tenantAdminServer: ApolloServer | null;
  tenantId: string | null;
};
const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;
const { mongo } = config.server;

export const domain = `jest-${randomString()}.net`; // unique domain is generated for each jest suite

export const FAKE = `Jest Data: ${domain}`;
export const FAKE_ID = mongoId().toString();
export const FAKE_LOCALE = { enUS: `ENG: ${domain}`, zhCN: `CHS: ${domain}`, zhHK: `CHT: ${domain}` };
export const FAKE2 = `Jest Data2: ${domain}`;
export const FAKE2_LOCALE = { enUS: `ENG2: ${domain}`, zhCN: `CHS2: ${domain}`, zhHK: `CHT2: ${domain}` };

/**
 * expect() helper for apollo Jest
 *
 * note: in case error, data could be either null or undefined
 */
export const apolloExpect = (
  res: unknown,
  type: 'data' | 'error' | 'errorContaining',
  expected: Record<string, unknown> | string,
) => {
  if (type === 'data') return expect(res).toEqual({ http: expect.anything(), data: expected });

  if (type === 'error' && typeof expected === 'string')
    return expect(res).toEqual(
      expect.objectContaining({
        http: expect.anything(),
        errors: [expect.objectContaining({ message: expected })],
      }),
    );

  if (type === 'errorContaining' && typeof expected === 'string')
    return expect(res).toEqual(
      expect.objectContaining({
        http: expect.anything(),
        errors: [
          expect.objectContaining({
            message: expect.stringContaining(expected),
          }),
        ],
      }),
    );
};

// expected Address Format
export const expectedAddressFormat = expect.objectContaining({
  location: expect.objectContaining({ coordinates: expect.any(Array) }),
});

// expected ID Format
export const expectedIdFormat = expect.any(String);

// expect ChatFormat
export const expectChatFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  parents: expect.arrayContaining([expect.any(String)]),
  // title: expect.toBeOneOf([null, expect.any(String)]), // optional
  members: expect.any(Array),
  contents: expect.arrayContaining([expect.any(String)]),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

// expected Min Contribution Format
export const expectedContributionFormat = expect.objectContaining({
  _id: expectedIdFormat,
  flags: expect.any(Array),
  title: expect.any(String),
  contributors: expect.arrayContaining([
    expect.objectContaining({ user: expect.any(String), name: expect.any(String), school: expect.any(String) }),
  ]),
  urls: expect.arrayContaining([expect.any(String)]),
  remarks: expect.any(Array),
});

// expected Locale Format
export const expectedLocaleFormat = {
  enUS: expect.any(String),
  zhHK: expect.any(String),
  zhCN: expect.any(String),
};

// expect member
export const expectedMember = (userId: string | Types.ObjectId, isApollo = false) => ({
  members: [
    {
      user: userId.toString(),
      flags: [],
      ...(isApollo
        ? { lastViewedAt: expect.any(Number) }
        : { _id: expectedIdFormat, lastViewedAt: expect.any(String) }),
    },
  ],
});

// expected Remark (only work for single addRemark)
export const expectedRemark = (userId: string | Types.ObjectId, msg: string, isApollo = false) => ({
  remarks: [
    { _id: expect.any(String), t: isApollo ? expect.any(Number) : expect.any(String), u: userId.toString(), m: msg },
  ],
});

// expected User
export const expectedUserFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),

  // tenants: expect.arrayContaining([expect.any(String)]),
  tenants: expect.any(Array), // newly registered user & user added by ROOT (e.g publisher) does not tenant
  status: USER.STATUS.ACTIVE,
  name: expect.any(String),
  // formalName: expect.any(Object),
  emails: expect.arrayContaining([expect.any(String)]),

  oAuth2s: expect.any(Array),

  // avatarUrl: expect.any(String), // could be undefined
  // mobile: expect.any(String), // could be undefined
  // whatsapp: expect.any(String), // could be undefined

  timezone: expect.any(String),
  locale: expect.any(String),
  darkMode: expect.any(Boolean),
  // theme: expect.any(String), // optional, could be undefined

  apiKeys: expect.any(Array),
  roles: expect.any(Array),
  features: expect.any(Array),
  scopes: expect.any(Array),

  coin: expect.any(Number),
  virtualCoin: expect.any(Number),
  balanceAuditedAt: expect.any(String),

  paymentMethods: expect.any(Array),
  // preference: expect.any(String), // could be undefined
  subscriptions: expect.any(Array),
  interests: expect.any(Array),
  supervisors: expect.any(Array),
  staffs: expect.any(Array),

  violations: expect.any(Array),

  expoPushTokens: expect.any(Array),
  creditability: expect.any(Number),

  studentIds: expect.any(Array),
  schoolHistories: expect.any(Array), // could be empty array

  favoriteTutors: expect.any(Array),

  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  // deletedAt: expect.toBeOneOf([null, expect.any(String)]), // undefined for RESTful, null for apollo
};

// Apollo date is number (float)
export const expectedUserFormatApollo = {
  ...expectedUserFormat,
  balanceAuditedAt: expect.any(Number),
  identifiedAt: expect.toBeOneOf([null, expect.any(Number)]),

  createdAt: expect.any(Number),
  updatedAt: expect.any(Number),
  deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
};

export const genChatGroup = (tenant: string, userId: string | Types.ObjectId) => {
  const chat = new Chat<Partial<ChatDocument>>({});
  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chat._id}`],
    creator: userId,
    data: FAKE,
  });
  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    tenant,
    admins: [userId],
    users: [userId],
    chats: [chat],
  });
  chat.parents = [`/chatGroups/${chatGroup._id}`];
  chat.contents = [content._id];

  return { chatGroup, chat, content };
};

export const genClassroom = async (tenant: string, teacherId: string | Types.ObjectId) => {
  const books = await Book.find({ deletedAt: { $exists: false } }).lean();
  const [book] = books.sort(shuffle);

  const chat = new Chat<Partial<ChatDocument>>({});
  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chat._id}`],
    creator: teacherId,
    data: FAKE,
  });

  const classroom = new Classroom<Partial<ClassroomDocument>>({
    tenant,
    level: book.level,
    subject: book.subjects[0],
    schoolClass: `schoolClass ${FAKE}`,
    books: [book._id],
    teachers: [teacherId],
    students: [FAKE_ID],
    year: schoolYear(),
    chats: [chat],
  }); // bare minimal info

  chat.parents = [`/classrooms/${classroom._id}`];
  chat.contents = [content._id];

  return { book, classroom, chat, content, fakeUserId: FAKE_ID };
};

export const genClassroomWithAssignment = async (tenant: string, teacherId: string | Types.ObjectId) => {
  const { book, classroom, fakeUserId } = await genClassroom(tenant, teacherId);
  const assignmentIdx = Math.floor(Math.random() * book.assignments.length);

  const assignment = new Assignment<Partial<AssignmentDocument>>({
    classroom: classroom._id,
    deadline: new Date(),
    bookAssignments: book!.assignments,
  });

  const homework = new Homework<Partial<HomeworkDocument>>({ assignment, user: fakeUserId, assignmentIdx });
  const homeworkContents = Array(2)
    .fill(0)
    .map(
      (_, idx) =>
        new Content<Partial<ContentDocument>>({
          parents: [`/homeworks/${homework._id}`],
          creator: fakeUserId,
          data: `${FAKE} (${idx})`,
        }),
    );

  homework.contents = idsToString(homeworkContents);
  assignment.homeworks = [homework];
  classroom.assignments = [assignment._id];

  return { assignment, assignmentIdx, book, classroom, homework, homeworkContents };
};

export const genClassroomUsers = (
  tenant: string | Types.ObjectId,
  school: string | Types.ObjectId,
  level: string | Types.ObjectId,
  schoolClass: string,
  count: number,
): (UserDocument & Id)[] =>
  Array(count)
    .fill(0)
    .map(
      (_, idx) =>
        new User<Partial<UserDocument>>({
          name: `classroomUser-${idx}`,
          tenants: [tenant],
          schoolHistories: [{ year: schoolYear(), school, level, schoolClass, updatedAt: new Date() }],
        }),
    );

export const genQuestion = (
  tenant: string,
  userId: string | Types.ObjectId,
  classroom?: string | Types.ObjectId,
  owner?: 'tutor' | 'student',
) => {
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: FAKE });
  const question = new Question<Partial<QuestionDocument>>({
    tenant,
    ...(classroom && { classroom }),
    ...(owner === 'student'
      ? { student: userId }
      : owner === 'tutor'
      ? { tutor: userId }
      : prob(0.5)
      ? { student: userId }
      : { tutor: userId }),
    contents: [content._id],
  });
  content.parents = [`/questions/${question._id}`];

  return { question, content };
};

// minimal user info: name
export const genUser = (tenantId: string | Types.ObjectId | null, name = randomString()) =>
  new User<Partial<UserDocument>>({ ...(tenantId && { tenants: [tenantId] }), name });

export const jestPutObject = async (
  userId: string | Types.ObjectId,
  bucketType: 'private' | 'public' = 'public',
): Promise<string> => {
  const image = await fsPromises.readFile(path.join(__dirname, 'jest.png'));
  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;

  const objectName = randomString('png');
  await Promise.all([
    minioClient.putObject(publicBucket, objectName, image),
    PresignedUrl.create({
      user: userId,
      url: `/${bucketName}/${objectName}`,
      expireAt: addSeconds(Date.now(), DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY + 5),
    }),
  ]);

  return `/${publicBucket}/${objectName}`;
};

export const jestRemoveObject = async (url: string): Promise<void> => {
  const [, bucketName, objectName] = url.split('/');
  if (bucketName && objectName) await minioClient.removeObject(bucketName, objectName);
};

/**
 * Setup Jest (for both restful API & apollo)
 * connect mongoose & fetch users, optionally setup apollo test-server
 */
export const jestSetup = async (
  types: Array<'admin' | 'guest' | 'normal' | 'root' | 'tenantAdmin'>,
  options?: { code?: string; apollo?: boolean },
): Promise<JestSetup> => {
  const code = options?.code ?? 'JEST';
  const apollo = !!options?.apollo;
  await mongoose.connect(mongo.url, { autoIndex: false });
  // mongoose.set('debug', true);

  const tenantNeeded = types.includes('normal') || types.includes('tenantAdmin');

  const tenant = tenantNeeded ? await Tenant.findOne({ code }).lean() : null;

  if (tenantNeeded && !tenant?.admins.length)
    return terminate(
      `jesSetup() Tenant (${code}) is inappropriate configured. Please re-init database by running $ yarn database:dev --minio --drop --seed --fake --jest`,
    );

  const [allUsers, adminUser, rootUser] = await Promise.all([
    tenant
      ? User.find({
          status: USER.STATUS.ACTIVE,
          tenants: tenant._id,
          roles: { $nin: [USER.ROLE.ADMIN] },
          identifiedAt: { $exists: true }, // newly jest created user will be excluded (to avoid racing conflict)
        }).lean()
      : null,
    types.includes('admin') ? User.findOneActive({ roles: USER.ROLE.ADMIN }) : null,
    types.includes('root') ? User.findOneActive({ roles: USER.ROLE.ROOT }) : null,
  ]);

  const normalUsers =
    tenant && allUsers
      ? allUsers
          .filter(
            ({ _id }) =>
              !idsToString(tenant.admins).includes(_id.toString()) &&
              !idsToString(tenant.supports).includes(_id.toString()) &&
              !idsToString(tenant.counselors).includes(_id.toString()) &&
              !idsToString(tenant.marshals).includes(_id.toString()),
          )
          .filter(u => ((apollo ? 0 : 1) + u.idx) % 2) // half for apollo-test, another half for restful
          .sort(shuffle) // randomize
      : null;

  if (normalUsers !== null && !normalUsers.length)
    return terminate('We have a problem, there is no normal users (it is required by the test) !');

  const [normalUser] = normalUsers ?? [null];

  const tenantAdmin =
    tenant && allUsers
      ? allUsers.filter(user => idsToString(tenant.admins).includes(user._id.toString()))[apollo ? 1 : 0]
      : null;

  const [adminServer, guestServer, normalServer, rootServer, tenantAdminServer] = [
    apollo && types.includes('admin') ? testServer(adminUser) : null,
    apollo && types.includes('guest') ? testServer() : null,
    apollo && types.includes('normal') ? testServer(normalUser) : null,
    apollo && types.includes('root') ? testServer(rootUser) : null,
    tenant && apollo && types.includes('tenantAdmin') ? testServer(tenantAdmin!) : null,
  ];

  return {
    adminServer,
    adminUser,
    guestServer,
    normalServer,
    normalUser,
    normalUsers,
    rootUser,
    rootServer,
    tenantAdmin,
    tenantAdminServer,
    tenantId: tenant ? tenant._id.toString() : null,
  };
};

/**
 * shutdown jest-server & close mongoose connection pool
 */
export const jestTeardown = async (): Promise<void> => {
  redisClient.disconnect();
  await Promise.all([jobRunner.stop(), socketServer.stop(), mongoose.connection.close()]);
};

/**
 * Generate an unique Test User
 */
export const uniqueTestUser = (): { email: string; name: string; password: string } => {
  // const email = `jest@${domain}`;
  // const idx = email.indexOf('@');
  return {
    // email: [email.slice(0, idx), `-${randomString()}`, email.slice(idx)].join(''),
    email: `jest-${randomString()}@${domain}`,
    name: `Jest User ${domain}`,
    password: User.genValidPassword(),
  };
};
