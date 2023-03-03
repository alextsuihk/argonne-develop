/**
 * Route: Levels
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import levelController from '../../controllers/level';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = levelController;

/**
 * @route   GET api/levels
 * @desc    get all levels info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/levels/:id
 * @desc    get a single level detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/levels
   * @desc    add a new level
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/levels/:id
   * @desc    update a level
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/levels/:id
   * @desc    delete a level
   */
  router.delete('/:id', removeById);
}

export default router;
