// WIP: untested

/**
 * Controller: Tutor-Ranking
 *
 * rankingController is primary for tutor to see average ranking scores from individual students
 *
 * note: _id is referred to studentId
 */

import { yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import type { Id, TutorRankingDocument } from '../models/tutor-ranking';
import TutorRanking from '../models/tutor-ranking';
import common from './common';

type AverageRanking = Pick<TutorRankingDocument & Id, '_id' | 'correctness' | 'explicitness' | 'punctuality'>;

const { auth, hubModeOnly, paginateSort } = common;
const { idSchema } = yupSchema;

/**
 * Return Average Ranking (from students) to tutors
 */
const find = async (req: Request): Promise<AverageRanking[]> => {
  hubModeOnly();
  const { userId } = auth(req);

  return TutorRanking.aggregate<AverageRanking>([
    { $match: { tutor: new mongoose.Types.ObjectId(userId) } },
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

    const agg = TutorRanking.aggregate<AverageRanking>([
      { $match: { tutor: new mongoose.Types.ObjectId(userId) } },
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

  const tutorRankings = await TutorRanking.aggregate<AverageRanking>([
    { $match: { tutor: new mongoose.Types.ObjectId(userId), student: new mongoose.Types.ObjectId(id) } },
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
