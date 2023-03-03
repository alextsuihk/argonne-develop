/**
 * Common Useful Helpers
 */

import dns from 'node:dns';

import type { LeanDocument, Types } from 'mongoose';
import { Document } from 'mongoose';

/**
 * Check if text string contains UTF-8 (unicode)
 */
export const containUtf8 = (text: string): boolean => text !== text.replace(/[^\x20-\x7E]+/g, '');

/**
 * DNS Lookup
 */
export const dnsLookup = async (url: string) =>
  new Promise<string>(resolve => dns.lookup(url, (_err, address, _family) => resolve(address)));

/**
 * Convert ObjectId[] | Document[] to string[]
 */
export const idsToString = <T extends Document>(items: (string | Types.ObjectId | T | LeanDocument<T>)[]): string[] =>
  items.map(item => (typeof item === 'string' ? item : item._id.toString()));

/**
 * Probability (0 - 1.0)
 */
export const prob = (x: number): boolean => Math.random() > 1 - x;

/**
 * Randomly Pick one from string[] or Pick one ID from Document[]
 */
export const randomId = <T extends Document>(items: (string | Types.ObjectId | T | LeanDocument<T>)[]) =>
  idsToString(items)[Math.floor(Math.random() * items.length)]?.toString();

/**
 * Generate a random string with optional timestamp (prefix) & file extension
 *
 * @param ext optional file extension
 * @returns random string
 */
export const randomString = (ext?: string): string => {
  const random = () => Math.random().toString(36).slice(2);
  const prefix = `${Date.now().toString(36)}-${random()}-${random()}`;
  return ext ? `${prefix}.${ext.toLowerCase()}` : prefix;
};

/**
 * Calculate schoolYea string
 * adjust: -1 (last), 0 (current) , 1 (next)
 */
export const schoolYear = (adjust = 0) => {
  const now = new Date();
  const currentYear = now.getFullYear() + adjust;
  return now.getMonth() >= 8 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
};

export const shuffle = (): number => Math.random() - 0.5;

/**
 * Terminate application
 */
export const terminate = (message: string): never => {
  /* eslint-disable-next-line no-console */
  console.error(message);
  process.exit(1);
};
