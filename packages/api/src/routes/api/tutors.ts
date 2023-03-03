/**
 * Route: Tutor
 *
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import tutorController from '../../controllers/tutor';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = tutorController;

/**
 * @route   GET api/tutors
 * @desc    get all tutors info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/tutors/:id
 * @desc    get a single tutor
 */
router.get('/:id', findOneById);

router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/tutors
   * @desc    add a new tutor
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/tutors/:id
   * @desc    update a tutor
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/tutors/:id
   * @desc    delete a tutor
   */
  router.delete('/:id', removeById);
}

export default router;
