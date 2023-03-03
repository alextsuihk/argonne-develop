/**
 * Upload: send log message to external server
 *
 */

import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { addSeconds } from 'date-fns';
import { Client } from 'minio';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import Upload from '../models/presigned-url';
import { randomString } from './helper';
export type { BucketItem } from 'minio';

export type PresignedUrl = { url: string; expiry: number };

const { MSG_ENUM } = LOCALE;
const { config, DEFAULTS } = configLoader;
const { minio } = config.server;
const { endPoint, port, useSSL, accessKey, secretKey } = minio;

export const { privateBucket, publicBucket } = minio;
export const buckets = [privateBucket, publicBucket];

export const REGION = 'us-east-1';

export const client = new Client({ endPoint, port, useSSL, accessKey, secretKey }); // export for jest

/**
 * Fetch from external URL to local storage (minio)
 */
const fetchToLocal = async (url: string, bucketType: 'private' | 'public' = 'public'): Promise<string> => {
  const { data } = await axios.get<Blob>(url, { responseType: 'blob' });
  const image = URL.createObjectURL(new Blob([data]));

  console.log('fetchToLocal(), need to check file extension, NOT always PNG');

  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;
  const objectName = randomString('png');
  await client.putObject(bucketName, objectName, image);

  return `/${bucketName}/${objectName}`;
};

/**
 * Generate presignedUrl (for upload)
 */
const presignedPutObject = async (bucketType: string, ext: string, userId: string): Promise<PresignedUrl> => {
  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;
  if (!(await client.bucketExists(bucketName))) throw { statusCode: 500, code: MSG_ENUM.MINIO_ERROR };

  const objectName = randomString(ext);
  const expiry = DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY;
  const [presignedUrl] = await Promise.all([
    client.presignedPutObject(bucketName, objectName, expiry),
    Upload.create({
      user: userId,
      url: `/${bucketName}/${objectName}`,
      expireAt: addSeconds(Date.now(), DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY + 5),
    }),
  ]);

  return { url: presignedUrl, expiry };
};

/**
 * Remove Object if not validated
 * (in case user requested a presigned-Put-Url, abort after uploading file)
 */
const removeExpiredObjects = async (): Promise<void> => {
  const storageObjects = await Upload.find({ expireAt: { $gt: new Date() } }).lean();

  await Promise.all([
    Upload.deleteMany({ _id: { $in: storageObjects } }),
    new Promise<void>(resolve =>
      client.removeObjects(
        privateBucket,
        storageObjects
          .filter(obj => obj.url.startsWith(`/${privateBucket}/`))
          .map(obj => obj.url.replace(`/${privateBucket}/`, '')),
        _ => resolve(),
      ),
    ),
    new Promise<void>(resolve =>
      client.removeObjects(
        publicBucket,
        storageObjects
          .filter(obj => obj.url.startsWith(`/${publicBucket}/`))
          .map(obj => obj.url.replace(`/${publicBucket}/`, '')),
        _ => resolve(),
      ),
    ),
  ]);
};

/**
 * Remove Object from Minio
 */
const removeObject = async (url: string): Promise<void> => {
  const [bucketName, ...rest] = url.split('/').slice(1);
  if (!bucketName || !rest.length || !buckets.includes(bucketName)) return;

  try {
    await client.removeObject(bucketName, rest.join('/'));
  } catch (error) {
    throw { statusCode: 500, code: MSG_ENUM.MINIO_ERROR };
  }
};

/**
 * Generate a presigned Url for download
 */
export const signUrls = async (urls: string[]): Promise<string[]> =>
  Promise.all(
    urls.map(async url => {
      if (!url.startsWith('/')) return url; // just return original url is not a relative path (non-managed storage url)

      const [bucketName, ...rest] = url.split('/').slice(1);

      switch (bucketName) {
        case publicBucket:
          return `${minio.serverUrl}${url}`;
        case privateBucket:
          return client.presignedGetObject(bucketName, rest.join('/'), DEFAULTS.STORAGE.PRESIGNED_URL_GET_EXPIRY);
        default:
          return `${minio.serverUrl}/${publicBucket}/error.png`;
      }
    }),
  );

/**
 * Validate Object Exists
 * if exists (is valid), remove Upload document
 *
 * @param url (e.g. /bucketName/objectName)
 */
const validateObject = async (url: string, userId: string | Types.ObjectId, skipCheck = false): Promise<void> => {
  const [bucketName, ...rest] = url.split('/').slice(1) ?? [];

  if (!bucketName || !rest.length || !buckets.includes(bucketName))
    throw { statusCode: 500, code: MSG_ENUM.USER_INPUT_ERROR };

  try {
    if (!skipCheck) {
      const storageObject = await Upload.findOneAndDelete({ user: userId, url }).lean();
      if (!storageObject) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    }
    await client.statObject(bucketName, rest.join('/'));
  } catch (error) {
    throw { statusCode: 422, code: MSG_ENUM.MINIO_ERROR };
  }
};

export default {
  fetchToLocal,
  presignedPutObject,
  removeExpiredObjects,
  removeObject,
  signUrls,
  validateObject,
};