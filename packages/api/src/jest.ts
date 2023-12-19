/**
 * Commonly used expected format & functions for jest
 *
 */

import 'jest-extended';

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import type { GraphQLResponse } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { LOCALE } from '@argonne/common';
import { addDays, addSeconds } from 'date-fns';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

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
import Tenant from './models/tenant';
import type { UserDocument } from './models/user';
import User, { activeCond } from './models/user';
import { redisClient } from './redis';
import resolvers from './resolvers';
import typeDefs from './typeDefs';
import { latestSchoolHistory, mongoId, randomItem, randomString, schoolYear, shuffle } from './utils/helper';
import { client as minioClient, privateBucket, publicBucket } from './utils/storage';

export { mongoId, prob, randomItem, randomItems, randomString, shuffle } from './utils/helper';

export type ConvertObjectIdToString<T extends object> = {
  [K in keyof T]: T[K] extends Types.ObjectId | undefined | null
    ? string | undefined | null
    : T[K] extends Types.ObjectId[]
      ? string[]
      : T[K] | null;
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
 * Apollo Test Expected Result
 *
 * note: in case error, data could be either null or undefined
 */
// export const apolloExpect = <T extends BaseDocument >( // _id is ObjectId type in model, but string in apollo result
export const apolloExpect = (
  res: GraphQLResponse<Record<string, unknown>>,
  type: 'data' | 'error' | 'errorContaining',
  expected: Record<string, unknown> | string,
  // expected: Record<string, Partial<ConvertObjectIdToString<T>> | { code: string } | boolean> | string,
): number => {
  if (type === 'data') {
    expect(res.body).toEqual({ kind: 'single', singleResult: { data: expected } });
  } else if (type === 'error' && typeof expected === 'string') {
    expect(res.body).toEqual({
      kind: 'single',
      singleResult: expect.objectContaining({ errors: [expect.objectContaining({ message: expected })] }),
    });
  } else if (type === 'errorContaining' && typeof expected === 'string') {
    expect(res.body).toEqual({
      kind: 'single',
      singleResult: expect.objectContaining({
        errors: [expect.objectContaining({ message: expect.stringContaining(expected) })],
      }),
    });
  } else {
    throw `We don't know how to process (${expected})`;
  }

  return 1;
};

/**
 * Generate Context for Apollo Test Server
 */
export const apolloContext = (user: UserDocument | null) => ({
  req: {
    ip: '127.0.0.1',
    ua: 'Apollo-Jest-User-Agent',
    userFlags: user?.flags,
    userId: user?._id,
    userLocale: user?.locale,
    userName: user?.name,
    userRoles: user?.roles,
    userTenants: user?.tenants.map(t => t.toString()),
    ...(user?.schoolHistories[0] && { userExtra: latestSchoolHistory(user.schoolHistories) }),
  },
  // setCookie() & clearCookie() are needed for authController's compatibility with Express cookie usage
  res: {
    cookie: (_name: string, _value: string, _opt: unknown) => {
      console.log(`apollo.js: setCooke() ${_name} ${_value} ${_opt}`);
    },
    clearCookie: (_name: string) => {
      console.log(`apollo.js: clearCookie()  ${_name}`);
    },
  },
});

/**
 * Apollo Test Server
 */
export const apolloTestServer = new ApolloServer<ReturnType<typeof apolloContext>>({
  typeDefs,
  resolvers,
  csrfPrevention: true,
});

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
export const expectedContributionFormat = (isApollo = false) => {
  const min = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    title: expect.any(String),
    contributors: expect.arrayContaining([
      { user: expectedIdFormat, name: expect.any(String), school: expectedIdFormat },
    ]),
    urls: expect.any(Array), // could be empty
    remarks: expect.any(Array),
    createdAt: expectedDateFormat(isApollo),
    updatedAt: expectedDateFormat(isApollo),
  };

  return isApollo
    ? {
        ...min,
        description: expect.toBeOneOf([null, expect.any(String)]),
        book: expect.toBeOneOf([null, expectedIdFormat]),
        chapter: expect.toBeOneOf([null, expect.any(String)]),
        deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
      }
    : min;
};

// expect BookAssignment Format
export const expectedBookAssignmentFormat = (isApollo = false) => {
  const min = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    contribution: isApollo
      ? { ...expectedContributionFormat(isApollo), book: expectedIdFormat }
      : expect.objectContaining({ ...expectedContributionFormat(), book: expectedIdFormat }),
    chapter: expect.any(String),
    content: expectedIdFormat,
    dynParams: expect.any(Array),
    solutions: expect.any(Array),
    examples: expect.any(Array),
    remarks: expect.any(Array),
    createdAt: expectedDateFormat(isApollo),
    updatedAt: expectedDateFormat(isApollo),
  };

  return isApollo ? { ...min, deletedAt: expect.toBeOneOf([null, expectedDateFormat(isApollo)]) } : min;
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

/**
 * Simulating uploaded object
 */
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
      { includeResultMetadata: true },
    ),
  ]);

  return `/${publicBucket}/${objectName}`;
};

/**
 * Remove Object from Minio
 */
export const jestRemoveObject = async (url: string): Promise<void> => {
  const [, bucketName, objectName] = url.split('/');
  if (bucketName && objectName) await minioClient.removeObject(bucketName, objectName);
};

/**
 * Setup Jest (for both restful API & apollo)
 * connect mongoose & fetch users, optionally setup apollo test-server
 *
 */
export const jestSetup = async (code = 'JEST') => {
  await mongoose.connect(mongo.url, { autoIndex: false });
  // mongoose.set('debug', true);

  const tenant = await Tenant.findOne({ code }).lean();
  if (!tenant) throw `jestSetup(): invalid Tenant (${code})`;

  const [allUsers, adminUser, rootUser] = await Promise.all([
    User.find({
      tenants: tenant._id,
      roles: { $nin: [USER.ROLE.ADMIN, USER.ROLE.ROOT] },
      identifiedAt: { $exists: true },
      ...activeCond, // newly jest created user will be excluded (to avoid racing conflict)
    }).lean(),
    User.findOne({ roles: USER.ROLE.ADMIN, ...activeCond }).lean(),
    User.findOne({ roles: USER.ROLE.ROOT, ...activeCond }).lean(),
  ]);

  const { admins, supports, counselors, marshals } = tenant;
  const normalUsers = allUsers
    .filter(({ _id }) => ![...admins, ...supports, ...counselors, ...marshals].some(user => user.equals(_id)))
    .sort(shuffle);

  const [normalUser] = normalUsers;
  const [tenantAdmin] = allUsers.filter(user => tenant.admins.some(a => a.equals(user._id))).sort(shuffle);

  if (!adminUser || !rootUser || !normalUser || !tenantAdmin)
    throw `jestSetup(): no valid admin, root or tenantAdmin user(s)`;

  const tenantId = tenant._id.toString();
  return { adminUser, normalUser, normalUsers, rootUser, tenantAdmin, tenant, tenantId };
};

/**
 * shutdown jest-server & close mongoose connection pool
 */
export const jestTeardown = async (): Promise<void> => {
  redisClient.disconnect();
  await mongoose.connection.close();
};
