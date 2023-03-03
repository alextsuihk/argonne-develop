/**
 * Route: Tenants
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import tenantController from '../../controllers/tenant';

const router = Router();
const {
  createNew,
  findMany,
  sendTestEmail,
  tenantBindRestApi,
  tenantTokenRestApi,
  tenantUnbindRestApi,
  updateById,
  removeById,
} = tenantController;

/**
 * @route   GET api/tenants
 * @desc    get my tenants
 */
router.get('/', findMany);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   GET api/tenants/sendTestEmail
   * @desc    send test email
   */
  router.get('/sendTestEmail', async (req, res, next) => {
    try {
      res.status(200).json(await sendTestEmail(req, req.body));
    } catch (error) {
      next(error);
    }
  });

  /**
   * @route   POST api/tenants/bind
   * @desc    user binds himself to a tenant
   */
  router.post('/bind', tenantBindRestApi);

  /**
   * @route   POST api/tenants/unbind
   * @desc    tenant unbinds a user
   */
  router.post('/unbind', tenantUnbindRestApi);

  /**
   * @route   POST api/tenants/token
   * @desc    generate a token for user to bind
   */
  router.post('/token', tenantTokenRestApi);

  /**
   * @route   POST api/tenants
   * @desc    add a new tenant
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/tenants
   * @desc    update a tenant name or (bind & unbind)
   */
  router.patch('/:id/:action?', updateById);

  /**
   * @route   DELETE api/tenants
   * @desc    delete a tenant
   */
  router.delete('/:id', removeById);
}

export default router;
