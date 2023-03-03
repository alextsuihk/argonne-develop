/**
 * Route: Publishers
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import publisherController from '../../controllers/publisher';

const router = Router();
const { createNew, findMany, findOneById, updateById, removeById } = publisherController;

/**
 * @route   GET api/publishers
 * @desc    get all publishers info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/publishers/:id
 * @desc    get a single publisher detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/publishers
   * @desc    add a new publisher
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/publishers/:id/:action?
   * @desc    update publisher
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/publishers/:id
   * @desc    delete a publisher
   */
  router.delete('/:id', removeById);
}

export default router;
