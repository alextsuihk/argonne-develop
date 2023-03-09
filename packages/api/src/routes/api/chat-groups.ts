/**
 * Route: Chat-Group
 *
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import chatGroupController from '../../controllers/chat-group';

const router = Router();
const { createNew, findMany, findOneById, updateById } = chatGroupController;

/**
 * @route   GET api/chat-groups
 * @desc    get all chats info (querystring might apply)
 */
router.get('/', findMany);

/**
 * @route   GET api/chat-groups/:chat_id
 * @desc    get a single chat detail or new (unread) chat rooms
 */
router.get('/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/chat-groups/:to
   * @desc    create a new (empty) chat
   */
  router.post('/:to?', createNew);

  /**
   * @route   PATCH api/chat-groups/:id/:action
   * @desc    append a chat, new member, mark chatContent read to chat
   */
  router.patch('/:id/:action?', updateById);
}

export default router;
