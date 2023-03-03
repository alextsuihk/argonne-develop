/**
 * Route: Classrooms
 *
 *
 */

import { Router } from 'express';

import classroomController from '../../controllers/classroom';

const router = Router();
const { createNew, removeById, findMany, findOneById, updateById } = classroomController;

/**
 * @route   GET api/classrooms
 * @desc    get all chats info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/classrooms/:chat_id
 * @desc    get a single chat detail or new (unread) chat rooms
 */
router.get('/:id', findOneById);

/**
 * @route   POST api/classrooms
 * @desc    create a new (empty) chat
 */
router.post('/', createNew);

/**
 * @route   PATCH api/classrooms/:id/:action
 * @desc    append a chat, new member, mark chatContent read to chat
 */
router.patch('/:id/:action?', updateById);

/**
 * @route   DELETE api/classrooms/:id
 * @desc    delete a district
 */
router.delete('/:id', removeById);

export default router;
