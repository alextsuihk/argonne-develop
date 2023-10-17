/**
 * PresignedUrl: send log message to external server
 *
 */

import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { addSeconds } from 'date-fns';
import mime from 'mime';
import { Client } from 'minio';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import type { PresignedUrlDocument } from '../models/presigned-url';
import PresignedUrl from '../models/presigned-url';
import { randomString } from './helper';
import log from './log';
export type { BucketItem } from 'minio';

export type PresignedUrlWithExpiry = { url: string; expiry: number };
type BucketType = 'public' | 'private';

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
const downloadFromUrlAndSave = async (url: string, bucketType: BucketType = 'public') => {
  try {
    console.log('downloadFromUrlAndSave(): try to use stream, facebook avatar is not a file');
    const { data, headers } = await axios.get<Blob>(url, { timeout: DEFAULTS.AXIOS_TIMEOUT, responseType: 'blob' });
    const image = URL.createObjectURL(new Blob([data]));

    console.log('downloadFromUrlAndSave(), need to check file extension, NOT always PNG');

    const bucketName = bucketType === 'private' ? privateBucket : publicBucket;

    const defaultExt = 'PnG'; // TODO: change it later to 'png'
    const ext = mime.getExtension(headers['Content-Type']?.toString() || defaultExt) || defaultExt;
    const objectName = randomString(ext);

    console.log(`downloadFromUrlAndSave(), objectName: /${bucketName}/${objectName}`);

    await client.putObject(bucketName, objectName, image);
    return objectName;
  } catch (error) {
    return null;
  }
};

/**
 * Generate presignedUrl (for upload)
 */
const presignedPutObject = async (
  bucketType: BucketType,
  ext: string,
  userId: Types.ObjectId,
): Promise<PresignedUrlWithExpiry> => {
  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;
  if (!(await client.bucketExists(bucketName))) throw { statusCode: 500, code: MSG_ENUM.MINIO_ERROR };

  const objectName = randomString(ext);
  const expiry = DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY;
  const [presignedUrl] = await Promise.all([
    client.presignedPutObject(bucketName, objectName, expiry),
    PresignedUrl.create<Partial<PresignedUrlDocument>>({
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
  const storageObjects = await PresignedUrl.find({ expireAt: { $gt: new Date() } }).lean();

  await Promise.all([
    PresignedUrl.deleteMany({ _id: { $in: storageObjects } }),
    new Promise<void>(resolve =>
      client.removeObjects(
        privateBucket,
        storageObjects
          .filter(obj => obj.url.startsWith(`/${privateBucket}/`))
          .map(obj => obj.url.replace(`/${privateBucket}/`, '')),
        () => resolve(),
      ),
    ),
    new Promise<void>(resolve =>
      client.removeObjects(
        publicBucket,
        storageObjects
          .filter(obj => obj.url.startsWith(`/${publicBucket}/`))
          .map(obj => obj.url.replace(`/${publicBucket}/`, '')),
        () => resolve(),
      ),
    ),
  ]);
};

/**
 * Remove Object from Minio
 */
const removeObject = async (url: string): Promise<string | false> => {
  const [bucketName, ...rest] = url.split('/').slice(1);
  if (!bucketName || !rest.length || !buckets.includes(bucketName)) return false;

  try {
    await client.removeObject(bucketName, rest.join('/'));
    return url;
  } catch (error) {
    await log('error', `fail to removeObject ${url}`);
    return false;
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
          return url; // non minio path
      }
    }),
  );

/**
 * Validate Object Exists
 * if exists (is valid), remove PresignedUrl document
 *
 * @param url (e.g. /bucketName/objectName)
 */
const validateObject = async (url: string, userId: Types.ObjectId, skipCheck = false): Promise<string> => {
  const [bucketName, ...rest] = url.split('/').slice(1) ?? [];

  if (!bucketName || !rest.length || !buckets.includes(bucketName))
    throw { statusCode: 500, code: MSG_ENUM.USER_INPUT_ERROR };

  try {
    const [deleteResult] = await Promise.all([
      !skipCheck && PresignedUrl.deleteOne({ user: userId, url }),
      client.statObject(bucketName, rest.join('/')),
    ]);

    if (deleteResult && !deleteResult.deletedCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return url;
  } catch (error) {
    throw { statusCode: 422, code: MSG_ENUM.MINIO_ERROR };
  }
};

export default {
  downloadFromUrlAndSave,
  presignedPutObject,
  removeExpiredObjects,
  removeObject,
  signUrls,
  validateObject,
};
