/**
 * Resolver: System
 *
 */

import systemController from '../controllers/system';

export default {
  Query: {
    serverInfo: systemController.getServerInfo,
    ping: () => 'pong',
    time: () => Date.now(),
  },

  Mutation: {},
};
