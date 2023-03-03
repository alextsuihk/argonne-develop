import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  setupFilesAfterEnv: ['jest-extended/all'],
  testTimeout: 15 * 1000,
  collectCoverageFrom: ['**/src/**'],
  transform: {
    '^.+\\.ts?$': ['ts-jest', { isolatedModules: true }],
  },
  maxWorkers: '25%', // reserve portion of CPU for O/S & docker containers
  verbose: true,
  testPathIgnorePatterns: [],
};

export default config;
