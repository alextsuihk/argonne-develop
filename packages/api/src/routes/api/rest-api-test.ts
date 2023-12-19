/**
 * JEST Test: common API route test
 *
 * This file is a the common (DRY) for most common REST-ful API Test
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import request from 'supertest';

import app from '../../app';
import type { ConvertObjectIdToString } from '../../jest';
import { FAKE, FAKE_ID, prob } from '../../jest';
import type { BaseDocument } from '../../models/common';

type LooseAutocomplete<T extends string> = T | Omit<string, T>;

const { MSG_ENUM } = LOCALE;

/**
 * Create, Update & Delete
 *
 * @param route: API route
 * @param headers: optional header object
 * @param expectedMinFormat: expected Minimal Format of return docs
 * @param data: data to be written
 * @return created document
 */
const createUpdateDelete = async <T extends BaseDocument>(
  route: string,
  headers: Record<string, string | Types.ObjectId>,
  tasks: ({
    action: LooseAutocomplete<'create' | 'update' | 'delete'>;
    headers?: Record<string, unknown>;
    data: Record<string, unknown>;
  } & (
    | { expectedMinFormat: Partial<ConvertObjectIdToString<T>> }
    | { expectedResponse: { statusCode: number; data: Record<string, unknown> } }
    | { never?: never }
  ))[],
  options?: { overrideId?: string; skipAssertion?: boolean; skipDeleteCheck?: boolean },
): Promise<T | null> => {
  if (!options?.skipAssertion)
    expect.assertions(tasks.length * 3 + (!options?.skipDeleteCheck && tasks.some(t => t.action === 'delete') ? 3 : 0));

  let id = options?.overrideId;
  let doc: T | null = null;

  // iterate tasks
  for (const task of tasks) {
    const { action, data } = task;

    const [, extra] = action.split('#');

    const res = action.startsWith('create')
      ? await request(app)
          .post(extra ? `/api/${route}/${extra}` : `/api/${route}`)
          .send(data)
          .set(task.headers ?? headers)
      : action === 'delete'
        ? await request(app)
            .delete(`/api/${route}/${id!}`)
            .send(prob(0.5) ? { remark: FAKE } : {})
            .set(task.headers ?? headers)
        : action.startsWith('get')
          ? await request(app)
              .get(extra ? `/api/${route}/${extra}` : `/api/${route}`)
              .send(data)
              .set(task.headers ?? headers)
          : await request(app)
              .patch(action === 'update' ? `/api/${route}/${id}` : `/api/${route}/${id!}/${action}`)
              .send(data)
              .set(task.headers ?? headers);

    // console.log('restful debug [action, extra] >>> ', action, id, extra);

    expect(res.header['content-type']).toBe('application/json; charset=utf-8');

    if ('expectedResponse' in task) {
      expect(res.status).toBe(task.expectedResponse.statusCode);
      expect(res.body).toEqual(task.expectedResponse.data);
    } else {
      expect(res.status).toBe(action.includes('create') ? 201 : 200);
      'expectedMinFormat' in task
        ? expect(res.body).toEqual({ data: expect.objectContaining(task.expectedMinFormat) })
        : expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    }

    if (action === 'create') id = res.body.data?._id.toString(); // could be undefined when error is expected
    // if (action.startsWith('create')) doc = res.body.data;
    if (action !== 'delete') doc = res.body.data;

    if (action === 'delete' && !options?.skipDeleteCheck) {
      // check if delete is successful
      const deleteRes = await request(app)
        .get(`/api/${route}/${id}`)
        .set(task.headers ?? headers);
      expect(deleteRes.header['content-type']).toBe('application/json; charset=utf-8');
      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body).toEqual({ errors: [{ code: MSG_ENUM.NOT_FOUND }], statusCode: 404, type: 'plain' });
    }
  }

  return doc;
};

/**
 * Get By Id
 * @param route
 * @param headers
 * @param expectedMinFormat
 * @param id
 * @returns
 */
const getById = async <T>(
  route: string,
  headers: Record<string, string | Types.ObjectId>,
  expectedMinFormat: Record<string, unknown>,
  { id, skipAssertion }: { id: string; skipAssertion?: boolean },
): Promise<T> => {
  if (!skipAssertion) expect.assertions(3);

  const res = await request(app).get(`/api/${route}/${id}`).set(headers);
  expect(res.body).toEqual({ data: expect.objectContaining(expectedMinFormat) });
  expect(res.header['content-type']).toBe('application/json; charset=utf-8');
  expect(res.status).toBe(200);

  return res.body.data;
};

/**
 * Get a Non-Existing Document
 *
 * @param route: API route
 * @param headers: optional header object
 * @param id
 */
const getByIdNonExisting = async (
  route: string,
  headers: Record<string, string | Types.ObjectId>,
  id: string,
): Promise<void> => {
  expect.assertions(3);

  const res = await request(app).get(`/api/${route}/${id}`).set(headers);
  expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.NOT_FOUND }], statusCode: 404, type: 'plain' });
  expect(res.header['content-type']).toBe('application/json; charset=utf-8');
  expect(res.status).toBe(404);
};

/**
 * Get Many
 *
 * @param route: API route
 * @param headers: optional header object
 * @param expectedMinFormat: expected Minimal Format of return docs
 * @return array of query docs
 */
const getMany = async <T>(
  route: string,
  headers: Record<string, string | Types.ObjectId>,
  expectedMinFormat: Record<string, unknown>,
  options: { skipMeta?: boolean; testGetById?: boolean; testInvalidId?: boolean; testNonExistingId?: boolean },
): Promise<T[]> => {
  const { skipMeta, testGetById, testInvalidId, testNonExistingId } = options;
  expect.assertions(3 + (testGetById ? 3 : 0) + (testInvalidId ? 3 : 0) + (testNonExistingId ? 3 : 0));

  const res = await request(app).get(`/api/${route}`).set(headers);
  const allDocs = res.body.data;

  const expectedData = Object.keys(expectedMinFormat).length
    ? expect.arrayContaining([expect.objectContaining(expectedMinFormat)])
    : [];
  expect(res.body).toEqual(
    skipMeta
      ? { data: expectedData }
      : {
          meta: {
            limit: expect.any(Number),
            skip: expect.any(Number),
            sort: expect.any(Object),
            total: expect.any(Number),
          },
          data: expectedData,
        },
  );
  expect(res.header['content-type']).toBe('application/json; charset=utf-8');
  expect(res.status).toBe(200);

  if (testGetById) {
    if (!allDocs.length) throw `rest-api-test.ts:${route} getMany() return empty array`;
    const _id = allDocs[Math.floor(Math.random() * allDocs.length)]._id as string;

    const getByIdRes = await request(app).get(`/api/${route}/${_id}`).set(headers);
    expect(getByIdRes.body).toEqual({ data: expect.objectContaining({ ...expectedMinFormat, _id }) });
    expect(getByIdRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(getByIdRes.status).toBe(200);
  }

  if (testInvalidId) {
    const invalidIdRes = await request(app).get(`/api/${route}/INVALID-ID`).set(headers);
    expect(invalidIdRes.body).toEqual({ errors: [{ code: MSG_ENUM.NOT_FOUND }], statusCode: 404, type: 'plain' });
    expect(invalidIdRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(invalidIdRes.status).toBe(404);
  }

  if (testNonExistingId) {
    const nonExistingIdRes = await request(app).get(`/api/${route}/${FAKE_ID}`).set(headers);
    expect(nonExistingIdRes.body).toEqual({ errors: [{ code: MSG_ENUM.NOT_FOUND }], statusCode: 404, type: 'plain' });
    expect(nonExistingIdRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(nonExistingIdRes.status).toBe(404);
  }

  // return the array of query data back
  return allDocs;
};

/**
 * Get all/one Unauthenticated
 *
 * @param route: API route
 * @param headers: optional header object
 */
const getUnauthenticated = async (route: string, headers: Record<string, string | Types.ObjectId>): Promise<void> => {
  expect.assertions(3);

  const res = await request(app).get(`/api/${route}`).set(headers);
  expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR }], statusCode: 401, type: 'plain' });
  expect(res.header['content-type']).toBe('application/json; charset=utf-8');
  expect(res.status).toBe(401);
};

export default {
  createUpdateDelete,
  getById,
  getByIdNonExisting,
  getMany,
  getUnauthenticated,
};
