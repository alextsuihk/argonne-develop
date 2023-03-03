/**
 * Route: Chat
 *
 */

import { Router } from 'express';

import chatController from '../../controllers/chat';

const router = Router();
const { createNew, findMany, findOneById, updateById } = chatController;

/**
 * @route   GET api/chats
 * @desc    get all chats info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/chats/:chat_id
 * @desc    get a single chat detail or new (unread) chat rooms
 */
router.get('/:id', findOneById);

/**
 * @route   POST api/chats
 * @desc    create a new (empty) chat
 */
router.post('/', createNew);

/**
 * @route   PATCH api/chats/:id/:action
 * @desc    append a chat, new member, mark chatContent read to chat
 */
router.patch('/:id/:action', updateById);

export default router;
