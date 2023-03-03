/**
 * Route: Schools
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import schoolController from '../../controllers/school';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = schoolController;

/**
 * @route   GET api/schools
 * @desc    get all schools info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/schools/:id
 * @desc    get a single school detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/schools
   * @desc    add a new school
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/schools/:id/:action?
   * @desc    update school
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/schools/:id
   * @desc    delete a school
   */
  router.delete('/:id', removeById);
}

export default router;
