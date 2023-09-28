/**
 * Cipher & Decipher
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';

import configLoader from '../config/config-loader';

const { config } = configLoader;

const ALGORITHM = 'aes-192-cbc';
/**
 * Cipher Data
 */
export const dataCipher = async (data: string, secret = config.jwtSecret) => {
  const key = await new Promise<Buffer>(resolve => scrypt(secret, 'salt', 24, (_, key) => resolve(key)));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  return `${iv.toString('hex')}#${cipher.update(data, 'utf8', 'hex') + cipher.final('hex')}`; // cipher the data
};

/**
 * Decipher Data
 */
export const dataDecipher = async (data: string, secret = config.jwtSecret) => {
  const [iv, encrypted] = data.split('#');
  if (!iv || !encrypted) return null;

  const key = await new Promise<Buffer>(resolve => scrypt(secret, 'salt', 24, (_, key) => resolve(key)));
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
};
