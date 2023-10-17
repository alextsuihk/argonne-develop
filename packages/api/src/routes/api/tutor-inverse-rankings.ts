/**
 * Route: Tutor-Inverse-Ranking
 *
 */

import { Router } from 'express';

import tutorInverseRankingController from '../../controllers/tutor-inverse-ranking';

const router = Router();
const { findMany, findOneById } = tutorInverseRankingController;

/**
 * @route   GET api/tutor-inverse-rankings
 * @desc    get all tutor-inverse-rankings info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/tutor-inverse-rankings/:id
 * @desc    get a single tutor-inverse-ranking detail
 */
router.get('/:id', findOneById);

export default router;
