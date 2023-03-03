/**
 * Route: Tutor-Ranking
 *
 */

import { Router } from 'express';

import tutorRankingController from '../../controllers/tutor-ranking';

const router = Router();
const { findMany, findOneById } = tutorRankingController;

/**
 * @route   GET api/tutor-rankings
 * @desc    get all tutor-rankings info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/tutor-rankings/:id
 * @desc    get a single tutorRanking detail
 */
router.get('/:id', findOneById);

export default router;
