/**
 * Jest: /resolvers/announcement
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  FAKE,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
} from '../jest';
import type { AnnouncementDocument } from '../models/announcement';
import Announcement from '../models/announcement';
import { ADD_ANNOUNCEMENT, GET_ANNOUNCEMENT, GET_ANNOUNCEMENTS, REMOVE_ANNOUNCEMENT } from '../queries/announcement';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Announcement GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    tenant: expect.toBeOneOf([null, expectedIdFormat]),
    title: expect.any(String),
    message: expect.any(String),
    beginAt: expectedDateFormat(true),
    endAt: expectedDateFormat(true),
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_ANNOUNCEMENTS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { announcements: expect.arrayContaining([expectedFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(2);

    // in case database has no valid (non-expired) announcement, create a site-wide & tenant-specific announcements
    const announcements = await Announcement.create<Partial<AnnouncementDocument>>([
      { title: FAKE, message: FAKE, beginAt: new Date(), endAt: addDays(Date.now(), 10) }, // all tenant announcement
      {
        tenant: randomItem(jest.normalUser.tenants),
        title: FAKE,
        message: FAKE,
        beginAt: new Date(),
        endAt: addDays(Date.now(), 10),
      },
    ]);

    const [siteWideAnnouncements, tenantAnnouncements] = await Promise.all([
      Announcement.find({ tenant: { $exists: false }, endAt: { $gte: new Date() }, deletedAt: { $exists: false } }),
      Announcement.find({
        tenant: { $in: jest.normalUser.tenants },
        endAt: { $gte: new Date() },
        deletedAt: { $exists: false },
      }),
    ]);

    const res1 = await apolloTestServer.executeOperation(
      { query: GET_ANNOUNCEMENT, variables: { id: randomItem(siteWideAnnouncements)._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res1, 'data', { announcement: expectedFormat });

    const res2 = await apolloTestServer.executeOperation(
      { query: GET_ANNOUNCEMENT, variables: { id: randomItem(tenantAnnouncements)._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'data', { announcement: expectedFormat });

    // clean up
    await Announcement.deleteMany({ _id: { $in: announcements.map(a => a._id) } });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_ANNOUNCEMENT },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_ANNOUNCEMENT, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role as guest', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: {
          announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
        },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when mutating without ADMIN role as normal user', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: {
          announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
        },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when ADD & DELETE (as admin)', async () => {
    expect.assertions(2);

    const create = {
      title: 'Jest Apollo Title',
      message: 'Jest Apollo Message',
      beginAt: addDays(Date.now(), 5),
      endAt: addDays(Date.now(), 15),
    };
    const createdRes = await apolloTestServer.executeOperation<{ addAnnouncement: AnnouncementDocument }>(
      { query: ADD_ANNOUNCEMENT, variables: { announcement: create } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', {
      addAnnouncement: {
        ...expectedFormat,
        ...create,
        beginAt: create.beginAt.getTime(),
        endAt: create.endAt.getTime(),
      },
    });

    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addAnnouncement._id.toString() : null;

    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_ANNOUNCEMENT, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removeAnnouncement: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when ADD & DELETE (with tenantId) (as tenantAdmin)', async () => {
    expect.assertions(2);

    const create = {
      title: `Jest Apollo Title (tenantAdmin ${jest.tenantAdmin.name})`,
      message: `Jest Apollo Message (tenantAdmin ${jest.tenantAdmin.name})`,
      beginAt: addDays(Date.now(), 5),
      endAt: addDays(Date.now(), 15),
    };
    const createdRes = await apolloTestServer.executeOperation<{ addAnnouncement: AnnouncementDocument }>(
      { query: ADD_ANNOUNCEMENT, variables: { announcement: { ...create, tenantId: jest.tenantId } } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(createdRes, 'data', {
      addAnnouncement: {
        ...expectedFormat,
        ...create,
        tenant: jest.tenantId,
        beginAt: create.beginAt.getTime(),
        endAt: create.endAt.getTime(),
      },
    });

    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addAnnouncement._id.toString() : null;
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_ANNOUNCEMENT, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(removedRes, 'data', { removeAnnouncement: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD & DELETE (WITHOUT tenantId) (as tenantAdmin)', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: {
          announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
        },
      },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when ADD without title, message, beginAt, endAt (as admin)', async () => {
    expect.assertions(4);

    // add without title
    const res1 = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: { announcement: { message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "title" of required type "String!" was not provided.');

    // add without message
    const res2 = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: { announcement: { title: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "message" of required type "String!" was not provided.');

    // add without beginAt
    const res3 = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: { announcement: { title: FAKE, message: FAKE, endAt: addDays(Date.now(), 5) } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res3, 'errorContaining', 'Field "beginAt" of required type "DateInput!" was not provided.');

    // add without endAt
    const res4 = await apolloTestServer.executeOperation(
      {
        query: ADD_ANNOUNCEMENT,
        variables: { announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 15) } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res4, 'errorContaining', 'Field "endAt" of required type "DateInput!" was not provided.');
  });
});
