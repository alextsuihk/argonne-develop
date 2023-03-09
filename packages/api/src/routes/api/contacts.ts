/**
 * Route: Contacts
 *
 */

import { Router } from 'express';

import contactController from '../../controllers/contact';

const router = Router();
const { createNew, findMany, findOneById, removeById, updateById } = contactController;

/**
 * @route   GET api/contacts
 * @desc    get my contacts
 */
router.get('/', findMany);

/**
 * @route   GET api/contacts/:id
 * @desc    get a single contact detail
 */
router.get('/:id', findOneById);

/**
 * @route   POST api/contacts
 * @desc    add a new contact or generate a token for making friend(s)
 */
router.post('/:action?', createNew);

/**
 * @route   PATCH api/contacts/:id
 * @desc    update a contact name
 */
router.patch('/:id', updateById);

/**
 * @route   DELETE api/contacts/:id
 * @desc    delete a contact
 */
router.delete('/:id', removeById);

export default router;
