/**
 * Route: Questions
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import questionController from '../../controllers/question';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = questionController;

/**
 * @route   GET api/questions
 * @desc    get all questions info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/questions/:id
 * @desc    get a single question detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/questions
   * @desc    add a new question
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/questions/:id
   * @desc    update a question
   */
  router.patch('/:id/:action', updateById);

  /**
   * @route   DELETE api/questions/:id
   * @desc    delete a question
   */
  router.delete('/:id', removeById);
}
export default router;
