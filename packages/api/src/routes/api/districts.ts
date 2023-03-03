/**
 * Route: Districts
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import districtController from '../../controllers/district';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = districtController;

/**
 * @route   GET api/districts
 * @desc    get all districts info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/districts/:id
 * @desc    get a single district detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/districts
   * @desc    add a new district
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/districts/:id
   * @desc    update a district
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/districts/:id
   * @desc    delete a district
   */
  router.delete('/:id', removeById);
}
export default router;
