export { default as LOCALE } from './generated-locale';
export type * from './validators'; // re-export all types
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
  'ACTIVITY', //
  'ANNOUNCEMENT', // primarily for tenantAdmin to sync creation/removal of customer announcement
  'ASSIGNMENT-HOMEWORK',
  'AUTH-RENEW-TOKEN', // renew token (include updating user)
  'AUTH-RELOAD', // reload auth from localStorage
  'AUTH-LOGIN', // new login session from other devices
  'CHAT-GROUP',
  'CLASSROOM',
  'CONTACT', // notify friend that name profile is updated (avatarUrl)
  'CONTACT-STATUS', // contact status is updated
  'IMPERSONATION', // notify staff where he is being impersonated (@ start)
  'JOB',
  'QUESTION',
  'TENANT',
  'TUTOR',
] as const;

export type Locale = {
  enUS: string;
  zhCN?: string;
  zhHK: string;
};
