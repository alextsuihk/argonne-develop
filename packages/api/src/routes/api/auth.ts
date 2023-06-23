/**
 * Route: auth
 *
 */

import { Router } from 'express';

import authController from '../../controllers/auth';

const router = Router();

/**
 * @route   GET api/auth/:action
 * @desc    consolidate all GET requests to single requestHandler
 */
router.get('/:action', authController.getAction);

/**
 * @route   POST api/auth/:action
 * @desc    consolidate all POST requests to single requestHandler
 */
router.post('/:action', authController.postAction);

/**
 * @route   PATCH api/auth/:action
 * @desc    update authUser
 */
router.patch('/:action?', authController.updateById);

//! Note: code below is old approach, moving logic into authController

/**
 * @route   GET api/auth/loginWithToken
 * @desc    authenticate user (with token) & return token & user-info
 * !Note: GET is used for sharing link thru email, sms, etc
 */
// router.post('/loginWithToken', authController.loginWithTokenRestApi);

/**
 * @route   POST api/auth/impersonate
 * @desc    impersonate & return JWT
 */
// router.post('/impersonate', authController.impersonateStartRestApi);

/**
 * @route   DELETE api/auth/impersonate
 * @desc    stop impersonation
 */
// router.delete('/impersonate', authController.impersonateStopRestApi);

/**
 * @route   POST api/auth/login
 * @desc    authenticate user & return token & user-info
 */
// router.post(
//   '/login',
//   // ! keep express-validator code below for reference
//   // [
//   //   check('email', msgCode.INPUT_EMAIL_REQUIREMENT).trim().normalizeEmail().isEmail(),
//   //   check('password', msgCode.INPUT_PASSWORD_IS_REQUIRED).exists(),
//   // ],
//   // guest,
//   authController.loginRestApi,
// );

/**
 * @route   POST api/auth/loginToken
 * @desc    generate one-time login token
 * !Note: GET is used for sharing link thru email, sms, etc
 */
// router.post('/loginToken', authController.loginTokenRestApi);

/**
 * @route   POST api/auth/logout
 * @desc    logout
 */
// router.post('/logout', authController.logoutRestApi);

/**
 * @route   POST api/auth/logoutOthers
 * @desc    logout other devices except this device
 */
// router.post('/logoutOthers', authController.logoutOtherRestApi);

/**
 * @route   POST api/auth/oauth2
 * @desc    register, Login using OAuth2
 */
// router.post('/oauth2', authController.oAuth2RestApi);

/**
 * @route   DELETE api/auth/oauth2
 * @desc    connected OAuth2 to logged-in user
 */
// router.patch('/oauth2', authController.oAuth2LinkRestApi);

/**
 * @route   DELETE api/auth/oauth2
 * @desc    disconnect user from OAuth2
 */
// router.delete('/oauth2', authController.oAuth2UnlinkRestApi);

/**
 * @route   POST api/auth/register
 * @desc    register user
 */
// router.post(
//   '/register',
//   // ! keep express-validator code below for reference
//   // [
//   //   check('name', msgCode.INPUT_NAME_REQUIREMENT).exists().trim(),
//   //   check('email', msgCode.INPUT_EMAIL_REQUIREMENT).trim().normalizeEmail().isEmail(),
//   //   check('password', msgCode.INPUT_PASSWORD_REQUIREMENT)
//   //     .isLength({ min: 6 })
//   //     .matches(/^[a-zA-Z0-9_/#]+$/, 'i'),
//   // ],
//   // guest,
//   authController.registerRestApi,
// );

/**
 * @route   POST api/auth/deregister
 * @desc    soft-delete user
 */
// router.delete('/register', authController.deregisterRestApi);

/**
 * @route   POST api/auth/renew
 * @desc    renew access token
 */
// router.post('/renewToken', authController.renewTokenRestApi);

export default router;
