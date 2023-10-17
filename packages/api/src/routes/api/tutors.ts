/**
 * Route: Tutor
 *
 *
 */

import { Router } from 'express';

import tutorController from '../../controllers/tutor';

const router = Router();

/**
 * @route   GET api/tutors
 * @desc    get all tutors info (querystring might apply)
 */
router.get('/', tutorController.findMany);

/**
 * @route   GET api/tutors/:id
 * @desc    get a single tutor
 */
router.get('/:id', tutorController.findOneById);

/**
 * @route   PATCH api/tutors/:action?
 * @desc    update tutor
 */
router.patch('/:action?', tutorController.upsertHandler);

export default router;
