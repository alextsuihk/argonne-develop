/**
 * Controller: Contents
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';

import type { ContentDocument, Id } from '../models/content';
import Content from '../models/content';
import token from '../utils/token';
import common from './common';

const { MSG_ENUM } = LOCALE;

const { auth, paginateSort, searchFilter, select } = common;
const { querySchema, tokenSchema } = yupSchema;

const CONTENT_IDS_TOKEN_PREFIX = 'CONTENT_IDS';
export const PUBLIC = 'PUBLIC';

const findCommon = async (req: Request, args: unknown) => {
  const { userId } = auth(req);
  const { query, token: tok } = await querySchema.concat(tokenSchema).validate(args);

  const [prefix, decodedUserId, ...contentIds] = await token.verifyStrings(tok);
  if (
    prefix !== CONTENT_IDS_TOKEN_PREFIX ||
    !contentIds.length ||
    !decodedUserId ||
    ![PUBLIC, userId].includes(decodedUserId)
  )
    throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  return searchFilter<ContentDocument>([], { query }, { _id: { $in: contentIds } });
};

/**
 * Find Multiple Contents (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(ContentDocument & Id)[]> => {
  const filter = await findCommon(req, args);
  return Content.find(filter, select()).lean();
};

/**
 * Find Multiple Contents with queryString (RESTful)
 */
const findMany: RequestHandler<{ token: string }> = async (req, res, next) => {
  try {
    const filter = await findCommon(req, { query: req.query, token: req.params.token });
    const options = paginateSort(req.query, { updatedAt: 1 });

    const [total, contents] = await Promise.all([
      Content.countDocuments(filter),
      Content.find(filter, select(), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: contents });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign ContentIds
 */
export const signContentIds = async (userId: string, contentIds: string[]) =>
  token.signStrings([CONTENT_IDS_TOKEN_PREFIX, userId, ...contentIds]);

export default { find, findMany };
