/**
 * Route: Tenants
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import tenantController from '../../controllers/tenant';

const router = Router();
const { findMany, postHandler, removeById, updateById } = tenantController;

/**
 * @route   GET api/tenants
 * @desc    get my tenants
 */
router.get('/', findMany);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/tenants
   * @desc    add a new tenant
   */
  router.post('/:action?', postHandler);

  /**
   * @route   PATCH api/tenants
   * @desc    update tenant, or sendTestEmail
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/tenants
   * @desc    delete a tenant
   */
  router.delete('/:id', removeById);
}

export default router;
