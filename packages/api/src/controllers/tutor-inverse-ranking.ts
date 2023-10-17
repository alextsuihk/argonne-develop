/**
 * Controller: Tutor-Inverse-Ranking
 *
 * rankingController is primary for tutor to see average ranking scores given by individual students
 *
 * note: _id is referred to studentId
 */

import { yupSchema } from '@argonne/common';
import { subDays } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { QuestionDocument } from '../models/question';
import Question from '../models/question';
import { mongoId } from '../utils/helper';
import common from './common';

type AverageRanking = Pick<QuestionDocument, '_id' | 'correctness' | 'explicitness' | 'punctuality'>;

const { auth, hubModeOnly, paginateSort } = common;
const { DEFAULTS } = configLoader;
const { idSchema } = yupSchema;

/**
 * Return Average Ranking (from students) to tutors
 */
const find = async (req: Request): Promise<AverageRanking[]> => {
  hubModeOnly();
  const { userId } = auth(req);

  return Question.aggregate<AverageRanking>([
    { $match: { tutor: userId, updatedAt: { $gte: subDays(Date.now(), DEFAULTS.TUTOR.RANKING.ANALYSIS_DAY) } } },
    { $sort: { student: 1, createdAt: -1 } },
    { $limit: DEFAULTS.TUTOR.RANKING.ANALYSIS_MAX },
    {
      $group: {
        _id: '$student',
        correctness: { $avg: '$correctness' },
        explicitness: { $avg: '$explicitness' },
        punctuality: { $avg: '$punctuality' },
      },
    },
  ]);
};

/**
 * Find Multiple AverageRanking with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  hubModeOnly();
  const { userId } = auth(req);

  try {
    const { limit, skip, sort } = paginateSort(req.query, { _id: 1 });

    const agg = Question.aggregate<AverageRanking>([
      { $match: { tutor: userId, updatedAt: { $gte: subDays(Date.now(), DEFAULTS.TUTOR.RANKING.ANALYSIS_DAY) } } },
      { $sort: { student: 1, createdAt: -1 } },
      { $limit: DEFAULTS.TUTOR.RANKING.ANALYSIS_MAX },
      {
        $group: {
          _id: '$student',
          correctness: { $avg: '$correctness' },
          explicitness: { $avg: '$explicitness' },
          punctuality: { $avg: '$punctuality' },
        },
      },
    ]);

    const [all, rankings] = await Promise.all([agg, agg.skip(skip).limit(limit).sort(sort)]);

    res.status(200).json({ meta: { total: all.length, limit, skip, sort }, data: rankings });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One (studentId) by ID
 */
const findOne = async (req: Request, args: unknown): Promise<AverageRanking | null> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id } = await idSchema.validate(args);

  const tutorRankings = await Question.aggregate<AverageRanking>([
    {
      $match: {
        tutor: userId,
        student: mongoId(id),
        updatedAt: { $gte: subDays(Date.now(), DEFAULTS.TUTOR.RANKING.ANALYSIS_DAY) },
      },
    },
    { $sort: { student: 1, createdAt: -1 } },
    { $limit: DEFAULTS.TUTOR.RANKING.ANALYSIS_MAX },
    {
      $group: {
        _id: '$student',
        correctness: { $avg: '$correctness' },
        explicitness: { $avg: '$explicitness' },
        punctuality: { $avg: '$punctuality' },
      },
    },
  ]);

  return tutorRankings[0] ?? null;
};

/**
 * Find One (studentId) by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const ranking = await findOne(req, { id: req.params.id });
    ranking ? res.status(200).json({ data: ranking }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

export default { find, findMany, findOne, findOneById };
