// Helper functions for checking NODE environment

export const nodeEnv = process.env.NODE_ENV ?? 'development';

export const isDevMode = nodeEnv === 'development';
export const isProdMode = nodeEnv === 'production';
export const isStagingMode = nodeEnv === 'staging';
export const isTestMode = nodeEnv === 'test';
