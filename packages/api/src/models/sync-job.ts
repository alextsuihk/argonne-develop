/**
 * Model: Sync (satellite)
 *
 * Schema.Types.Mixed", we need to union {notify: Notify; sync: Sync}
 *
 */

import { NOTIFY_EVENTS } from '@argonne/common';
import type { FilterQuery, InferSchemaType, Types, UpdateQuery } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { ActivityDocument } from './activity';
import type { AnnouncementDocument } from './announcement';
import type { AssignmentDocument } from './assignment';
import type { BookAssignmentDocument, BookDocument } from './book';
import type { ChatDocument } from './chat';
import type { ChatGroupDocument } from './chat-group';
import type { ClassroomDocument } from './classroom';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';
import type { ContributionDocument } from './contribution';
import type { DistrictDocument } from './district';
import type { HomeworkDocument } from './homework';
import type { LevelDocument } from './level';
import type { PublisherDocument } from './publisher';
import type { QuestionDocument } from './question';
import type { SchoolDocument } from './school';
import type { SchoolCourseDocument } from './school-course';
import type { SubjectDocument } from './subject';
import type { TagDocument } from './tag';
import type { TenantDocument } from './tenant';
import type { TypographyDocument } from './typography';
import type { UserDocument } from './user';

export type SatelliteSeedData = {
  activities: ActivityDocument[];
  announcements: AnnouncementDocument[];
  assignments: AssignmentDocument[];
  bookAssignments: BookAssignmentDocument[];
  books: BookDocument[];

  chatGroups: ChatGroupDocument[];
  chats: ChatDocument[];
  classrooms: ClassroomDocument[];
  contributions: ContributionDocument[];

  districts: DistrictDocument[];
  homeworks: HomeworkDocument[];
  levels: LevelDocument[];
  publishers: PublisherDocument[];

  questions: QuestionDocument[];
  schoolCourses: SchoolCourseDocument[];
  schools: SchoolDocument[];
  subjects: SubjectDocument[];
  tags: TagDocument[];

  tenants: TenantDocument[];
  typographies: TypographyDocument[];
  users: UserDocument[];

  contentsTokens: string[];
  minioServerUrl: string;
};

export type SyncBulkWrite<T extends BaseDocument> = (
  | { insertMany: { documents: T[] } }
  | { insertOne: { document: T } }
  | { replaceOne: { filter: FilterQuery<T>; replacement: T; upsert?: boolean } }
  | { updateMany: { filter: FilterQuery<T>; update: UpdateQuery<T>; upsert?: boolean } }
  | { updateOne: { filter: FilterQuery<T>; update: UpdateQuery<T>; upsert?: boolean } }
)[];

type Notify = { userIds: Types.ObjectId[]; event: (typeof NOTIFY_EVENTS)[number]; msg?: string } | null;
type CollectionKey =
  | Exclude<keyof SatelliteSeedData, 'contentsTokens' | 'minioServerUrl'>
  | 'contents' // 'contents' primarily for updating flags
  | 'jobs';
type Sync = {
  // db?: Partial<Record<CollectionKey, mongoose.mongo.AnyBulkWriteOperation<any>[]>>; // inspired by mongo bulkWrite, same (similar signature without casting OjectId, ObjectId is converted to plain by axios)
  bulkWrite?: Partial<Record<CollectionKey, SyncBulkWrite<any>>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  contentsToken?: string;
  minio?: { serverUrl: string; addObjects?: string[]; removeObjects?: string[] };
  extra?: { revokeAllTokensByUserId: Types.ObjectId };
} | null;

const { DEFAULTS } = configLoader;

export const SYNC_JOB_CHANNEL = 'JOB';

const syncJobSchema = new Schema(
  {
    ...baseDefinition,
    tenant: { type: Schema.Types.ObjectId, required: true, index: true },

    notify: Schema.Types.Mixed,
    sync: Schema.Types.Mixed,

    attempt: { type: Number, default: 0 }, // 0: just queued, not yet attempt to execute
    completedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.SYNC_JOB },
    result: String, // JSON.stringify
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const SyncJob = model('SyncJob', syncJobSchema);
export type SyncJobDocument = Omit<InferSchemaType<typeof syncJobSchema>, 'notify' | 'sync'> &
  Id & { notify: Notify; sync: Sync };
export default SyncJob;
