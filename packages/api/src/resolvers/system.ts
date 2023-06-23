/**
 * Resolver: System
 *
 */

import systemController from '../controllers/system';

export default {
  Query: {
    serverInfo: systemController.getServerInfo,
    serverTime: () => Date.now(),
    ping: () => 'pong',
  },

  Mutation: {},
};
