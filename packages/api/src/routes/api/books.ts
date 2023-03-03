/**
 * Route: Books
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import bookController from '../../controllers/book';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = bookController;

/**
 * @route   GET api/books
 * @desc    get All books (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/books/:id
 * @desc    get a single book detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/books
   * @desc    add a new book
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/books/:id/:action?
   * @desc    update book (action: addSchool/removeSchool, addRevision, updateRevision)
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/books/:id
   * @desc    delete a book
   */
  router.delete('/:id', removeById);
}

export default router;
