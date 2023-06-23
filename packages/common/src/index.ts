import type { Types } from 'mongoose';

export { default as LOCALE } from './generated-locale';
export type { Query } from './validators';
export * as yupSchema from './validators';

export const CONTENT_PREFIX = {
  BLOCKED: '###BLOCKED###',
  PLAIN: '###PLAIN###',
  MP4: '###MP4###',
  RECALLED: '###RECALLED###',
  URL: '###URL###',
  MULTI_PARTS: '###MULTI_PARTS###',
};

export const NOTIFY_EVENTS = [
  'ADVERTISEMENT',
  'ANNOUNCEMENT',
  'RENEW-TOKEN', // renew token
  'LOAD-AUTH', // reload auth from localStorage
  'CHAT-GROUP',
  'CLASSROOM',
  'CONTACT', // notify friend that name profile is updated (avatarUrl)
  'CONTACT-STATUS', // contact status is updated
  'CORE', // all base collections: such as district, level, (selected) school, etc
  'HOMEWORK',
  'IMPERSONATION', // notify staff where he is being impersonated (@ start)
  'LOGIN', // new login session from other devices
  'ACTIVITY', //
  'ASSIGNMENT',
  'CLASSROOM',
  'HOMEWORK',
  'JOB',
  'QUESTION',
  'TUTOR',
  '_SYNC-ONLY', // sync satellite ONLY without notify user(s)
] as const;

// type definitions for notify (socket.io) & satellite sync
export type DocumentSync = {
  announcementIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  assignmentIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  bookIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  bookAssignmentIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  bidIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  chatGroupIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  chatIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  classroomIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  contentIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  contributionIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  districtIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  homeworkIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  jobIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  levelIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  publisherIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  questionIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  rankingIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  schoolIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  subjectIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  tagIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  tenantIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  tutorIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  typographyIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];
  userIds?: (string | Types.ObjectId | { _id: Types.ObjectId })[];

  minioAddItems?: string[]; // download from urls[] and save to local minio
  minioRemoveItems?: string[]; // remove object from minio
};

export type Locale = {
  enUS: string;
  zhCN?: string;
  zhHK: string;
};

export type RedirectAction = {
  url: string;
  token?: string;
  expireAt?: Date;
};

// export const DELETED_LOCALE = { enUS: '<Record Deleted>', zhCN: '<已被删除>', zhHK: '<已被刪除>' };
// export const DELETED = DELETED_LOCALE.enUS;
