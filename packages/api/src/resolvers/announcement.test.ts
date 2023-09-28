/**
 * Jest: /resolvers/announcement
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  apolloExpect,
  ApolloServer,
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
import type { Id, UserDocument } from '../models/user';
import { ADD_ANNOUNCEMENT, GET_ANNOUNCEMENT, GET_ANNOUNCEMENTS, REMOVE_ANNOUNCEMENT } from '../queries/announcement';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Announcement GraphQL', () => {
  let adminServer: ApolloServer | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

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

  beforeAll(async () => {
    ({ adminServer, guestServer, normalServer, normalUser, tenantAdmin, tenantAdminServer, tenantId } = await jestSetup(
      ['admin', 'guest', 'normal', 'tenantAdmin'],
      { apollo: true },
    ));
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await normalServer!.executeOperation({ query: GET_ANNOUNCEMENTS });
    apolloExpect(res, 'data', { announcements: expect.arrayContaining([expectedFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(2);

    // in case database has no valid (non-expired) announcement, create a site-wide & tenant-specific announcements
    await Announcement.create<Partial<AnnouncementDocument>>([
      { title: FAKE, message: FAKE, beginAt: new Date(), endAt: addDays(Date.now(), 10) },
      {
        tenant: randomItem(normalUser!.tenants),
        title: FAKE,
        message: FAKE,
        beginAt: new Date(),
        endAt: addDays(Date.now(), 10),
      },
    ]);

    const [siteWideAnnouncements, tenantAnnouncements] = await Promise.all([
      Announcement.find({
        tenant: { $exists: false },
        endAt: { $gte: new Date() },
        deletedAt: { $exists: false },
      }),
      Announcement.find({
        tenant: { $in: normalUser!.tenants },
        endAt: { $gte: new Date() },
        deletedAt: { $exists: false },
      }),
    ]);

    const res1 = await normalServer!.executeOperation({
      query: GET_ANNOUNCEMENT,
      variables: { id: randomItem(siteWideAnnouncements)._id.toString() },
    });
    apolloExpect(res1, 'data', { announcement: expectedFormat });

    const res2 = await normalServer!.executeOperation({
      query: GET_ANNOUNCEMENT,
      variables: { id: randomItem(tenantAnnouncements)._id.toString() },
    });
    apolloExpect(res2, 'data', { announcement: expectedFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_ANNOUNCEMENT });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({
      query: GET_ANNOUNCEMENT,
      variables: { id: 'invalid-mongoID' },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role as guest', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: {
        announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when mutating without ADMIN role as normal user', async () => {
    expect.assertions(1);

    const res = await normalServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: {
        announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when ADD & DELETE (as admin)', async () => {
    expect.assertions(2);

    const createdRes = await adminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: {
        announcement: {
          title: 'Jest Apollo Title',
          message: 'Jest Apollo Message',
          beginAt: addDays(Date.now(), 5),
          endAt: addDays(Date.now(), 15),
        },
      },
    });
    apolloExpect(createdRes, 'data', { addAnnouncement: expectedFormat });

    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_ANNOUNCEMENT,
      variables: { id: createdRes.data!.addAnnouncement._id, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeAnnouncement: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when ADD & DELETE (with tenantId) (as tenantAdmin)', async () => {
    expect.assertions(2);

    const createdRes = await tenantAdminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: {
        announcement: {
          tenantId,
          title: `Jest Apollo Title (tenantAdmin ${tenantAdmin!.name})`,
          message: `Jest Apollo Message (tenantAdmin ${tenantAdmin!.name})`,
          beginAt: addDays(Date.now(), 5),
          endAt: addDays(Date.now(), 15),
        },
      },
    });
    apolloExpect(createdRes, 'data', { addAnnouncement: { ...expectedFormat, tenant: tenantId } });

    const removedRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_ANNOUNCEMENT,
      variables: { id: createdRes.data!.addAnnouncement._id, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeAnnouncement: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD & DELETE (WITHOUT tenantId) (as tenantAdmin)', async () => {
    expect.assertions(1);

    const res = await tenantAdminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: {
        announcement: {
          title: `Jest Apollo Title (tenantAdmin ${tenantAdmin!.name})`,
          message: `Jest Apollo Message (tenantAdmin ${tenantAdmin!.name})`,
          beginAt: addDays(Date.now(), 5),
          endAt: addDays(Date.now(), 15),
        },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when ADD without title, message, beginAt, endAt (as admin)', async () => {
    expect.assertions(4);

    // add without title
    const res1 = await adminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: { announcement: { message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "title" of required type "String!" was not provided.');

    // add without message
    const res2 = await adminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: { announcement: { title: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "message" of required type "String!" was not provided.');

    // add without beginAt
    const res3 = await adminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: { announcement: { title: FAKE, message: FAKE, endAt: addDays(Date.now(), 5) } },
    });
    apolloExpect(res3, 'errorContaining', 'Field "beginAt" of required type "DateInput!" was not provided.');

    // add without endAt
    const res4 = await adminServer!.executeOperation({
      query: ADD_ANNOUNCEMENT,
      variables: { announcement: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 15) } },
    });
    apolloExpect(res4, 'errorContaining', 'Field "endAt" of required type "DateInput!" was not provided.');
  });
});
