/**
 * Route: Homeworks
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import homeworkController from '../../controllers/homework';

const router = Router();
// const { createNew, findMany, findOneById, updateById, removeById } = homeworkController;
const { findMany, findOneById, updateById } = homeworkController;

/**
 * @route   GET api/homeworks
 * @desc    get all homeworks info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/homeworks/:id
 * @desc    get a single homework detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   PATCH api/homeworks/:id
   * @desc    update a homework
   */
  router.patch('/:id/:action?', updateById);
}
export default router;
