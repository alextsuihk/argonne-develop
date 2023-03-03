/**
 * Route: Sync
 *
 */

import { Router } from 'express';

import syncController from '../../controllers/sync';

const router = Router();
const { create, update } = syncController;

/**
 * @route   PATCH api/sync
 * @desc    receive patches & updates
 */
router.patch('/', update);

/**
 * @route   POST api/sync
 * @desc    (Hub only) request to send databases to satellite
 */
router.post('/', create);

export default router;
