/**
 * Route: Assignments
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import assignmentController from '../../controllers/assignment';

const router = Router();
// const { createNew, findMany, findOneById, updateById, removeById } = assignmentController;
const { createNew, findMany, findOneById, removeById, updateById } = assignmentController;

/**
 * @route   GET api/assignments
 * @desc    get all assignments info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/assignments/:id
 * @desc    get a single assignment detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/assignments
   * @desc    add a new assignment
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/assignments/:id
   * @desc    update a assignment
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/assignments/:id
   * @desc    delete a assignment
   */
  router.delete('/:id', removeById);
}
export default router;
