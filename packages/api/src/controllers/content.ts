/**
 * Controller: Contents
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';

import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import type { JobDocument } from '../models/job';
import { queueJob } from '../models/job';
import token from '../utils/token';
import common from './common';

type CensorTask = NonNullable<JobDocument['censor']>;

const { MSG_ENUM } = LOCALE;

const { paginateSort, searchFilter, select } = common;
const { querySchema, optionalIdsSchema, tokenSchema } = yupSchema;

const CONTENT_IDS_TOKEN_PREFIX = 'CONTENT_IDS';
const PUBLIC = 'PUBLIC';

/**
 * Queue Task for censoring content
 */
export const censorContent = async (
  tenantId: NonNullable<CensorTask['tenantId']>,
  userLocale: NonNullable<CensorTask['userLocale']>,
  parent: NonNullable<CensorTask['parent']>,
  contentId: NonNullable<CensorTask['contentId']>,
) => queueJob({ task: 'censor', tenantId, userLocale, parent, contentId });

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
const find = async (req: Request, args: unknown): Promise<ContentDocument[]> => {
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

export const receiveContent = async (
  userId: Types.ObjectId,
  parent: string,
  data: string,
): Promise<ContentDocument> => {
  if (data.startsWith(CONTENT_PREFIX.URL)) {
    // TODO: read from minio, and save to new Content(), remove minio object
  }

  // non URL content
  return Content.create<Partial<ContentDocument>>({ parents: [parent], creator: userId, data });
};

/**
 * Sign ContentIds
 */
export const signContentIds = async (userId: Types.ObjectId | null, contents: Types.ObjectId[]) =>
  token.signStrings([CONTENT_IDS_TOKEN_PREFIX, userId?.toString() || PUBLIC, ...contents.map(c => c.toString())], 0);

export default { find, findMany };
