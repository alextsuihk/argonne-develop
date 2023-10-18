/**
 * Commonly used expected format & functions for jest
 *
 */

import 'jest-extended';

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import { addDays, addSeconds } from 'date-fns';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import { ApolloServer, testServer } from './apollo';
import configLoader from './config/config-loader';
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
import type { PresignedUrlDocument } from './models/presigned-url';
import PresignedUrl from './models/presigned-url';
import type { QuestionDocument } from './models/question';
import Question from './models/question';
import Tenant, { TenantDocument } from './models/tenant';
import type { UserDocument } from './models/user';
import User, { activeCond } from './models/user';
import { redisClient } from './redis';
import { mongoId, randomItem, randomString, schoolYear, shuffle, terminate } from './utils/helper';
import { client as minioClient, privateBucket, publicBucket } from './utils/storage';

export { ApolloServer, testServer } from './apollo';
export { mongoId, prob, randomItem, randomItems, randomString, shuffle } from './utils/helper';

export type ConvertObjectIdToString<T extends object> = {
  [K in keyof T]: T[K] extends Types.ObjectId | undefined
    ? string | undefined
    : T[K] extends Types.ObjectId[]
    ? string[]
    : T[K] | null;
};

type JestSetup = {
  adminServer: ApolloServer | null;
  adminUser: UserDocument | null;
  guestServer: ApolloServer | null;
  normalServer: ApolloServer | null;
  normalUser: UserDocument | null;
  normalUsers: UserDocument[] | null;
  rootServer: ApolloServer | null;
  rootUser: UserDocument | null;
  tenantAdmin: UserDocument | null;
  tenantAdminServer: ApolloServer | null;
  tenant: TenantDocument | null;
  tenantId: string | null;
};
const { QUESTION, USER } = LOCALE.DB_ENUM;
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
// export const apolloExpect = <T extends BaseDocument >(
export const apolloExpect = (
  res: unknown,
  type: 'data' | 'error' | 'errorContaining',
  expected: Record<string, unknown> | string,
  // expected: Record<string, Partial<ConvertObjectIdToString<T>> | { code: string } | boolean> | string,
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

// expected Date Format
export const expectedDateFormat = (isApollo = false) => (isApollo ? expect.any(Number) : expect.any(String));

// expected ChatFormat
export const expectedChatFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  parents: expect.arrayContaining([expect.any(String)]),
  // title: expect.toBeOneOf([null, expect.any(String)]), // optional
  members: expect.any(Array),
  contents: expect.arrayContaining([expectedIdFormat]),
  createdAt: expectedDateFormat(),
  updatedAt: expectedDateFormat(),
};
export const expectedChatFormatApollo = {
  ...expectedChatFormat,
  title: expect.toBeOneOf([null, expect.any(String)]),
  createdAt: expectedDateFormat(true),
  updatedAt: expectedDateFormat(true),
};

// expected Min Contribution Format
export const expectedContributionFormat = expect.objectContaining({
  _id: expectedIdFormat,
  flags: expect.any(Array),
  title: expect.any(String),
  contributors: expect.arrayContaining([
    expect.objectContaining({ user: expectedIdFormat, name: expect.any(String), school: expectedIdFormat }),
  ]),
  urls: expect.arrayContaining([expect.any(String)]),
  remarks: expect.any(Array),
});

// expect BookAssignment Format
export const expectedBookAssignmentFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  contribution: expectedContributionFormat,
  chapter: expect.any(String),
  content: expectedIdFormat,
  dynParams: expect.any(Array),
  solutions: expect.any(Array),
  examples: expect.any(Array),
  remarks: expect.any(Array),
  createdAt: expectedDateFormat(true),
  updatedAt: expectedDateFormat(true),
  deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
};

// expected Locale Format
export const expectedLocaleFormat = {
  enUS: expect.any(String),
  zhHK: expect.any(String),
  zhCN: expect.any(String),
};

// expect member
export const expectedMember = (userId: string | Types.ObjectId, flags: string[], isApollo = false) => ({
  user: userId.toString(),
  flags,
  lastViewedAt: expectedDateFormat(isApollo),
});

// expected Remark (only work for single addRemark)
export const expectedRemark = (userId: string | Types.ObjectId, msg: string, isApollo = false) => ({
  remarks: [{ t: expectedDateFormat(isApollo), u: userId.toString(), m: msg }],
});

// expected User
export const expectedUserFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),

  // tenants: expect.arrayContaining([expectedIdFormat]),
  tenants: expect.any(Array), // newly registered user & user added by ROOT (e.g publisher) does not tenant
  status: USER.STATUS.ACTIVE,
  name: expect.any(String),
  // formalName: expect.any(Object), // could be null
  emails: expect.arrayContaining([expect.any(String)]),

  oAuth2s: expect.any(Array),

  // avatarUrl: expect.any(String), // could be undefined
  messengers: expect.any(Array), // could be empty array

  timezone: expect.any(String),
  locale: expect.any(String),
  darkMode: expect.any(Boolean),
  // theme: expect.any(String), // optional, could be undefined

  roles: expect.any(Array),
  features: expect.any(Array),

  coin: expect.any(Number),
  virtualCoin: expect.any(Number),
  balanceAuditedAt: expectedDateFormat(),

  paymentMethods: expect.any(Array),
  // preference: expect.any(String), // could be undefined
  pushSubscriptions: expect.any(Array),
  supervisors: expect.any(Array),
  staffs: expect.any(Array),

  violations: expect.any(Array),

  expoPushTokens: expect.any(Array),
  creditability: expect.any(Number),

  stashes: expect.any(Array),

  studentIds: expect.any(Array),
  schoolHistories: expect.any(Array), // could be empty array

  favoriteTutors: expect.any(Array),

  createdAt: expectedDateFormat(),
  updatedAt: expectedDateFormat(),
  // deletedAt: expect.toBeOneOf([null, expectedDateFormat()]), // undefined for RESTful, null for apollo
};

// Apollo date is number (float)
export const expectedUserFormatApollo = {
  ...expectedUserFormat,
  availability: expect.toBeOneOf([null, expect.any(String)]),
  avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
  balanceAuditedAt: expectedDateFormat(true),
  dob: expect.toBeOneOf([null, expect.any(Number)]),
  formalName: expect.toBeOneOf([
    null,
    { enUS: expect.any(String), zhHK: expect.any(String), zhCN: expect.toBeOneOf([null, expect.any(String)]) },
  ]),
  identifiedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  preference: expect.toBeOneOf([null, expect.any(String)]),
  suspendUtil: expect.toBeOneOf([null, expectedDateFormat(true)]),
  theme: expect.toBeOneOf([null, expect.any(String)]),
  yob: expect.toBeOneOf([null, expect.any(Number)]),

  remarks: null,
  createdAt: expectedDateFormat(true),
  updatedAt: expectedDateFormat(true),
  deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
};

export const genChatGroup = (tenant: string, userId: Types.ObjectId) => {
  const chat = new Chat<Partial<ChatDocument>>({});
  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chat._id}`],
    creator: userId,
    data: FAKE,
  });
  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    tenant: mongoId(tenant),
    admins: [userId],
    users: [userId],
    chats: [chat._id],
  });
  chat.parents = [`/chatGroups/${chatGroup._id}`];
  chat.contents = [content._id];

  return { chatGroup, chat, content };
};

export const genClassroom = async (tenant: string, teacherId: Types.ObjectId) => {
  const books = await Book.find({ deletedAt: { $exists: false } }).lean();
  const book = randomItem(books);

  const chat = new Chat<Partial<ChatDocument>>({});
  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chat._id}`],
    creator: teacherId,
    data: FAKE,
  });

  const classroom = new Classroom<Partial<ClassroomDocument>>({
    tenant: mongoId(tenant),
    level: book.level,
    subject: book.subjects[0],
    schoolClass: `schoolClass ${FAKE}`,
    books: [book._id],
    teachers: [teacherId],
    students: [mongoId()],
    year: schoolYear(),
    chats: [chat._id],
  }); // bare minimal info

  chat.parents = [`/classrooms/${classroom._id}`];
  chat.contents = [content._id];

  return { book, classroom, chat, content, fakeUserId: mongoId() };
};

export const genClassroomWithAssignment = async (tenant: string, teacherId: Types.ObjectId) => {
  const { book, classroom, fakeUserId } = await genClassroom(tenant, teacherId);
  const assignmentIdx = Math.floor(Math.random() * book.assignments.length);

  const assignment = new Assignment<Partial<AssignmentDocument>>({
    classroom: classroom._id,
    deadline: new Date(),
    bookAssignments: book!.assignments,
  });

  const homework = new Homework<Partial<HomeworkDocument>>({
    assignment: assignment._id,
    user: fakeUserId,
    assignmentIdx,
  });
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

  homework.contents = homeworkContents.map(c => c._id);
  assignment.homeworks = [homework._id];
  classroom.assignments = [assignment._id];

  return { assignment, assignmentIdx, book, classroom, homework, homeworkContents };
};

export const genClassroomUsers = (
  tenantId: string,
  school: Types.ObjectId,
  level: Types.ObjectId,
  schoolClass: string,
  count: number,
): UserDocument[] =>
  Array(count)
    .fill(0)
    .map((_, idx) =>
      genUser(tenantId, {
        name: `classroomUser-${idx}`,
        schoolHistories: [{ year: schoolYear(), school, level, schoolClass, updatedAt: new Date() }],
      }),
    );

export const genQuestion = (tenantId: string, creator: Types.ObjectId, extra: Partial<QuestionDocument>) => {
  const content = new Content<Partial<ContentDocument>>({ creator, data: FAKE });
  const question = new Question<Partial<QuestionDocument>>({
    tenant: mongoId(tenantId),
    student: mongoId(),
    deadline: addDays(Date.now(), 10),
    level: mongoId(),
    subject: mongoId(),
    lang: QUESTION.LANG.CSE,
    contents: [content._id],

    ...extra,
  });
  content.parents = [`/questions/${question._id}`];

  return { question, content };
};

/**
 * Generate an unique Test User
 */
export const genUser = (tenantId: string | null, override: Partial<UserDocument> = {}) =>
  new User<Partial<UserDocument>>({
    ...(tenantId && { tenants: [mongoId(tenantId)] }),
    name: `Jest User ${domain}`,
    emails: [`jest-${randomString()}@${domain}`.toUpperCase()],
    password: User.genValidPassword(),
    ...override,
  });

export const jestPutObject = async (
  userId: Types.ObjectId,
  bucketType: 'private' | 'public' = 'public',
): Promise<string> => {
  const image = await fsPromises.readFile(path.join(__dirname, 'jest.png'));
  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;

  const objectName = randomString('png');
  await Promise.all([
    minioClient.putObject(publicBucket, objectName, image),
    PresignedUrl.insertMany<Partial<PresignedUrlDocument>>(
      {
        user: userId,
        url: `/${bucketName}/${objectName}`,
        expireAt: addSeconds(Date.now(), DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY + 5),
      },
      { rawResult: true },
    ),
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
    types.includes('admin') ? User.findOne({ roles: USER.ROLE.ADMIN, ...activeCond }).lean() : null,
    types.includes('root') ? User.findOne({ roles: USER.ROLE.ROOT, ...activeCond }).lean() : null,
  ]);

  const normalUsers =
    tenant && allUsers
      ? allUsers
          .filter(
            ({ _id }) =>
              ![...tenant.admins, ...tenant.supports, ...tenant.counselors, ...tenant.marshals].some(user =>
                user.equals(_id),
              ),
          )
          .filter(u => ((apollo ? 0 : 1) + u.idx) % 2) // half for apollo-test, another half for restful
          .sort(shuffle) // randomize
      : null;

  if (normalUsers !== null && !normalUsers.length)
    return terminate('We have a problem, there is no normal users (it is required by the test) !');

  const [normalUser] = normalUsers ?? [null];

  const tenantAdmin =
    tenant && allUsers ? allUsers.filter(user => tenant.admins.some(a => a.equals(user._id)))[apollo ? 1 : 0] : null;

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
    tenant,
    tenantId: tenant?._id.toString() || null,
  };
};

/**
 * shutdown jest-server & close mongoose connection pool
 */
export const jestTeardown = async (): Promise<void> => {
  redisClient.disconnect();
  await mongoose.connection.close();
  // await Promise.all([jobRunner.removeRedisListener(), socketServer.stop(), mongoose.connection.close()]); // socketServer.stop() to disconnect redis
};
