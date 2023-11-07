/**
 * Common Useful Helpers
 */

import dns from 'node:dns';

import mongoose from 'mongoose';

import type { UserDocument } from '../models/user';

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
 * Get the latest schoolHistory
 */
export const latestSchoolHistory = (schoolHistories: UserDocument['schoolHistories']) =>
  schoolHistories[0] && {
    year: schoolHistories[0].year,
    school: schoolHistories[0].school.toString(),
    level: schoolHistories[0].level.toString(),
    ...(schoolHistories[0].schoolClass && { schoolClass: schoolHistories[0].schoolClass }),
    updatedAt: schoolHistories[0].updatedAt,
  };

/**
 * generate a new mongo ID or convert string to mongo ID
 */
export const mongoId = (id?: string) =>
  mongoose.isObjectIdOrHexString(id) ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId();

/**
 * Probability (0 - 1.0)
 */
export const prob = (x: number): boolean => Math.random() > 1 - x;

/**
 * Randomly pick one element from array
 */
export const randomItem = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;

/**
 * Randomly multiple elements from array
 */
export const randomItems = <T>(items: T[], count: number) => items.sort(shuffle).slice(0, count);

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
 * Sleep (in milliseconds)
 */
export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Terminate application
 */
export const terminate = (message: string): never => {
  /* eslint-disable-next-line no-console */
  console.error(message);
  process.exit(1);
};
