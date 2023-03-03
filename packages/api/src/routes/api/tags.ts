/**
 * Route: Tags
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import tagController from '../../controllers/tag';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = tagController;

/**
 * @route   GET api/tags
 * @desc    get all tags info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/tags/:id
 * @desc    get a single tag detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/tags
   * @desc    add a new tag
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/tags/:id
   * @desc    update a tag
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/tags/:id
   * @desc    delete a tag
   */
  router.delete('/:id', removeById);
}

export default router;
