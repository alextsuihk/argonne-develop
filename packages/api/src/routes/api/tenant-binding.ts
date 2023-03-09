/**
 * Route: TenantBinding
 *
 */

import { Router } from 'express';

import tenantBindingController from '../../controllers/tenant-binding';

const router = Router();
const { createToken, bind, unbind } = tenantBindingController;

/**
 * @route   POST api/tenants/bind
 * @desc    user binds himself to a tenant, or create a token
 */
router.post('/:action?', async (req, res, next) => {
  try {
    res.status(200).json({
      data:
        req.params.action === 'createToken'
          ? await createToken(req, {
              ...req.body,
              ...(Number(req.body.expiresIn) && { expiresIn: Number(req.body.expiresIn) }),
            })
          : await bind(req, req.body),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST api/tenants/unbind
 * @desc    tenant unbinds a user
 */
router.delete('/', async (req, res, next) => {
  try {
    res.status(200).json({ data: await unbind(req, req.body) });
  } catch (error) {
    next(error);
  }
});

export default router;
