/**
 * Controller: Contents
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';

import type { ContentDocument, Id } from '../models/content';
import Content from '../models/content';
import type { CensorTask } from '../models/job';
import Job from '../models/job';
import token from '../utils/token';
import common from './common';

const { MSG_ENUM } = LOCALE;

const { paginateSort, searchFilter, select } = common;
const { querySchema, optionalIdsSchema, tokenSchema } = yupSchema;

const CONTENT_IDS_TOKEN_PREFIX = 'CONTENT_IDS';
const PUBLIC = 'PUBLIC';

/**
 * Queue Task for censoring content
 */
export const censorContent = async (
  tenantId: CensorTask['tenantId'],
  userId: CensorTask['userId'],
  userLocale: CensorTask['userLocale'],
  model: CensorTask['model'],
  parentId: CensorTask['parentId'],
  contentId: CensorTask['contentId'],
) => Job.queue({ type: 'censor', tenantId, userId, userLocale, model, parentId, contentId });

const findCommon = async (req: Request, args: unknown) => {
  const { ids, query, token: tok } = await querySchema.concat(optionalIdsSchema).concat(tokenSchema).validate(args);

  const [prefix, decodedUserId, ...contentIds] = await token.verifyStrings(tok);
  if (
    prefix !== CONTENT_IDS_TOKEN_PREFIX ||
    !contentIds.length ||
    !decodedUserId ||
    ![PUBLIC, req.userId].includes(decodedUserId)
  )
    throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const getIds = ids ? ids.filter(x => contentIds.includes(x)) : contentIds; // if ids are provided, get intersected contents
  return searchFilter<ContentDocument>([], { query }, { _id: { $in: getIds } });
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
    const options = paginateSort(req.query, { updatedAt: -1 });

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
export const signContentIds = async (userId: string | null, contents: Types.ObjectId[]) =>
  token.signStrings([CONTENT_IDS_TOKEN_PREFIX, userId || PUBLIC, ...contents.map(c => c.toString())], 0);

export default { find, findMany };
