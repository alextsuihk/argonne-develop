/**
 * Route: Analytics
 *
 */

import { Router } from 'express';

import analyticController from '../../controllers/analytic';

const router = Router();

/**
 * @route   POST api/analytics/:task
 * @desc    analytics
 */
router.post('/:task', analyticController.createNew);

export default router;
