/**
 * Route: Typographies
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import typographyController from '../../controllers/typography';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = typographyController;

/**
 * @route   GET api/typographies
 * @desc    get All typographies (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/typographies/:id
 * @desc    get a single typography detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/typographies
   * @desc    add a new typography
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/typographies/:id
   * @desc    update typography
   *
   * ! Note: CANNOT change group nor key, updated title & content are pushed to top of revisions
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/typographies/:id
   * @desc    delete a typography
   */
  router.delete('/:id', removeById);
}

export default router;
