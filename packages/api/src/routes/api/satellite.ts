/**
 * Route: Satellite
 *
 */

import { Router } from 'express';

import satelliteController from '../../controllers/satellite';

const router = Router();
const { seedComplete, seedRequest, sync, updateConfig } = satelliteController;

/**
 * @route   POST api/satellite/seedComplete
 * @desc    (Hub only) dump associated documents to JSON file for satellite to download
 */
router.post('/seedComplete', seedComplete);
router.post('/seedRequest', seedRequest);
router.patch('/sync', sync);
router.patch('/updateConfig', updateConfig);

export default router;
