/**
 * Route: Internal System Monitor
 *
 */

import { Router } from 'express';

import systemController from '../../controllers/system';

const router = Router();

/**
 * @route   GET api/systems/:action
 * @desc    get :action
 */
router.get('/:action', systemController.getAction);

export default router;
