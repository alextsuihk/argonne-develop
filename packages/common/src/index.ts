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
  'AD',
  'RE-AUTH', // renew token
  'LOAD-AUTH', // reload auth from localStorage
  'CHAT',
  'CHAT-GROUP',
  'CLASSROOM',
  'CONTACT', // notify friend that name profile is updated (avatarUrl)
  'CONTACT_STATUS', // contact status is updated
  'CORE', // all base collections: such as district, level, (selected) school, etc
  'IMPERSONATION', // notify staff where he is being impersonated (@ start)
  'LOGIN', // new login session from other devices
  'ACTIVITY', //
  'ASSIGNMENT',
  'CLASSROOM',
  'HOMEWORK',
  'JOB',
  'JOIN',
  'QUESTION',
  'TUTOR',
] as const;

// type definitions for notify (socket.io) & satellite sync
export type DocumentSync = {
  announcementIds?: string[];
  assignmentIds?: string[];
  bookIds?: string[];
  bookAssignmentIds?: string[];
  chatGroupIds?: string[];
  chatIds?: string[];
  classroomIds?: string[];
  contentIds?: string[];
  contributionIds?: string[];
  districtIds?: string[];
  homeworkIds?: string[];
  jobIds?: string[];
  levelIds?: string[];
  publisherIds?: string[];
  questionIds?: string[];
  rankingIds?: string[];
  schoolIds?: string[];
  subjectIds?: string[];
  tagIds?: string[];
  tenantIds?: string[];
  tutorIds?: string[];
  typographyIds?: string[];
  userIds?: string[];

  minioAddItems?: string[]; // download from urls[] and save to local minio
  minioRemoveItems?: string[]; // remove object from minio

  userNetworkStatus?: string; // use with users (in case of socket.io joining/leaving)
  msg?: string;
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
