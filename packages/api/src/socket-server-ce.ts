/**
 * Emit Message to all socket clients of a SINGLE User
 */
const emit = (_: string[], __: unknown, ___?: unknown): void => {
  // FEATURE NOT SUPPORTED IN COMMUNITY-EDITION
};

/**
 * List socket client of an user (or all users)
 */
const listSockets = async (_?: unknown): Promise<string[]> => [];

/**
 * Start Socket.io Server
 */
const start = (_: unknown): void => {
  // FEATURE NOT SUPPORTED IN COMMUNITY-EDITION
};

/**
 * Shut down Socket.io Server (Community Mode)
 */
const stop = (_?: () => void): void => {
  // FEATURE NOT SUPPORTED IN COMMUNITY-EDITION
};

export default { emit, listSockets, start, stop };
