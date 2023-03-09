/**
 * Route: Announcements
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import announcementController from '../../controllers/announcement';

const router = Router();
// const { createNew, findMany, findOneById, updateById, removeById } = announcementController;
const { createNew, findMany, findOneById, removeById } = announcementController;

/**
 * @route   GET api/announcements
 * @desc    get all announcements info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/announcements/:id
 * @desc    get a single announcement detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/announcements
   * @desc    add a new announcement
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/announcements/:id
   * @desc    update a announcement
   */
  // router.patch('/:id', updateById);

  /**
   * @route   DELETE api/announcements/:id
   * @desc    delete a announcement
   */
  router.delete('/:id', removeById);
}

export default router;
