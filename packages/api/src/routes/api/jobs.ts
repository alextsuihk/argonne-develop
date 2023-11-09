/**
 * Route: Jobs
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import jobController from '../../controllers/job';

const router = Router();
const { findMany, findOneById, removeById } = jobController;

/**
 * @route   GET api/jobs
 * @desc    get all jobs info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/jobs/:id
 * @desc    get a single job detail
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   DELETE api/jobs/:id
   * @desc    delete a job
   */
  router.delete('/:id', removeById);
}
export default router;
