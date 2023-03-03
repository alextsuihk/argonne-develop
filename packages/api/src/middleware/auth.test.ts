// [EOL] logic change: middleware/auth.ts:decodeHeader() does not throw error for JWT decode error

/**
 * JEST Test: Auth Middleware
 *
 */

import { LOCALE } from '@argonne/common';
import type { Request, Response } from 'express';
import type { LeanDocument } from 'mongoose';

import { jestSetup, jestTeardown } from '../jest';
import type { UserDocument } from '../models/user';
import token from '../utils/token';
import { decodeHeader } from './auth';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Auth Middleware Test', () => {
  let normalUser: LeanDocument<UserDocument> | null;

  beforeAll(async () => {
    ({ normalUser } = await jestSetup(['normal'], { apollo: true }));
  });
  afterAll(jestTeardown);
  /**
   * Mock Request & Response
   */
  const mockRequest = (
    query: Record<string, string>,
    params: Record<string, string>,
    headers: Record<string, string>,
  ) =>
    ({
      query,
      params,
      get: (name: string) => headers[name],
    } as Request); // cast as an express request mock object

  const mockResponse = () => {
    const res: { status?: unknown; json?: unknown } = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response; // cast as express response
  };

  test('should pass with valid JWT token', async () => {
    expect.assertions(3);

    const { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt } = await token.generate(
      normalUser!,
      { expiresIn: 5, force: true, ua: 'jest', ip: 'jest (invalid-ip)' }, // force-ful login because of IP conflict
    );

    if (accessToken && accessTokenExpireAt && refreshToken && refreshTokenExpireAt) {
      const req = mockRequest({}, {}, { Authorization: `Bearer ${accessToken}` });
      const res = mockResponse();
      const next = jest.fn();

      await decodeHeader(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      expect(req).toEqual(
        expect.objectContaining({
          ua: expect.any(String),
          isMobile: expect.any(Boolean),
          userFlags: expect.any(Array),
          userId: expect.any(String),
          userLocale: expect.any(String),
          userName: expect.any(String),
          userRoles: expect.any(Array),
          userScopes: expect.any(Array),
          userTenants: expect.any(Array), // book publishers have no tenants
        }),
      );

      await token.revokeCurrent(normalUser!._id, refreshToken); // logout (revoke token)
    }
  });

  test('should pass without populating userId if no authorization header', async () => {
    expect.assertions(2);

    const req = mockRequest({}, {}, {}); // not passing header.Authorization
    const res = mockResponse();
    const next = jest.fn();

    await decodeHeader(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  //! logic has changed: 'Bearer '.replace('Bearer ', '') is falsy
  // test('should pass without populating userId if no JWT token', async () => {
  //   expect.assertions(2);

  //   const req = mockRequest({}, {}, { Authorization: 'Bearer ' }); // not attaching token
  //   const res = mockResponse();
  //   const next = jest.fn();

  //   await decodeHeader(req, res, next);
  //   expect(next).toHaveBeenCalledTimes(1);
  //   expect(next).toHaveBeenCalledWith({ code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR, statusCode: 401 });
  // });

  test('should pass without populating userId if signing with a "fake JWT secret', async () => {
    expect.assertions(2);

    const accessToken = await token.sign({ id: 'invalid-userId' }, '5s', 'fakeJwtSecret'); // generate a accessToken with fake-JWT-secret

    const req = mockRequest({}, {}, { Authorization: `Bearer ${accessToken}` });
    const res = mockResponse();
    const next = jest.fn();

    await decodeHeader(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR, statusCode: 401 });
  });

  test('should throw an error if accessToken expires', async () => {
    expect.assertions(2);

    // generate a JWT accessToken (both accessToken & refreshToken expire in 1second)
    const { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt } = await token.generate(normalUser!, {
      expiresIn: 1,
      force: true,
      ua: 'jest',
      ip: 'jest IP',
    });

    if (accessToken && accessTokenExpireAt && refreshToken && refreshTokenExpireAt) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // wait 2secs for accessToken to expire

      const req = mockRequest({}, {}, { Authorization: `Bearer ${accessToken}` });
      const res = mockResponse();
      const next = jest.fn();

      await decodeHeader(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith({ statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR });

      await token.revokeCurrent(normalUser!._id, refreshToken); // logout (revoke token)
    }
  });

  test('should throw an error if invalid token is provided', async () => {
    expect.assertions(2);

    const req = mockRequest({}, {}, { Authorization: 'Bearer INVALID-TOKEN' });
    const res = mockResponse();
    const next = jest.fn();

    await decodeHeader(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR });
  });
});