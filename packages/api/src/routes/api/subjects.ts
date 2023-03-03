/**
 * Route: Subjects
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import subjectController from '../../controllers/subject';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = subjectController;

/**
 * @route   GET api/subjects
 * @desc    get all subjects info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/subjects/:id
 * @desc    get a single subject detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/subjects
   * @desc    add a new subject
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/subjects/:id/:action?
   * @desc    update subject or subject admin (action: addLevel/removeLevel)
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/subjects/:id
   * @desc    delete a subject
   */
  router.delete('/:id', removeById);
}

export default router;
