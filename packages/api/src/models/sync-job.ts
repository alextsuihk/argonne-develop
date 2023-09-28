/**
 * Model: Sync (satellite)
 *
 */

import { NOTIFY_EVENTS } from '@argonne/common';
import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
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

export type { Id } from './common';

// export type Notify = { userIds: (string | Types.ObjectId)[]; event: (typeof NOTIFY_EVENTS)[number]; msg?: string };

export type SatelliteSeedData = {
  activities: (ActivityDocument & Id)[];
  announcements: (AnnouncementDocument & Id)[];
  assignments: (AssignmentDocument & Id)[];
  bookAssignments: (BookAssignmentDocument & Id)[];
  books: (BookDocument & Id)[];

  chatGroups: (ChatGroupDocument & Id)[];
  chats: (ChatDocument & Id)[];
  classrooms: (ClassroomDocument & Id)[];
  contributions: (ContributionDocument & Id)[];

  districts: (DistrictDocument & Id)[];
  homeworks: (HomeworkDocument & Id)[];
  levels: (LevelDocument & Id)[];
  publishers: (PublisherDocument & Id)[];

  questions: (QuestionDocument & Id)[];
  schoolCourses: (SchoolCourseDocument & Id)[];
  schools: (SchoolDocument & Id)[];
  subjects: (SubjectDocument & Id)[];
  tags: (TagDocument & Id)[];

  tenants: (TenantDocument & Id)[];
  typographies: (TypographyDocument & Id)[];
  users: (UserDocument & Id)[];

  contentsTokens: string[];
  minioServerUrl: string;
};

type CollectionKey =
  | Exclude<keyof SatelliteSeedData, 'contentsTokens' | 'minioServerUrl'>
  | 'contents' // 'contents' primarily for updating flags
  | 'jobs'
  | 'tutors' // for sync with school tenant satellite
  | 'tutorRanking';

export type SyncBulkWrite<T extends BaseDocument> = (
  | { insertMany: { documents: (T & Id)[] } }
  | { insertOne: { document: T & Id } }
  | { replaceOne: { filter: FilterQuery<T>; replacement: T; upsert?: boolean } }
  | { updateMany: { filter: FilterQuery<T>; update: UpdateQuery<T>; upsert?: boolean } }
  | { updateOne: { filter: FilterQuery<T>; update: UpdateQuery<T>; upsert?: boolean } }
)[];

export interface SyncJobDocument extends BaseDocument {
  tenant: Types.ObjectId;
  notify: { userIds: (string | Types.ObjectId)[]; event: (typeof NOTIFY_EVENTS)[number]; msg?: string } | null;
  sync: {
    // db?: Partial<Record<CollectionKey, mongoose.mongo.AnyBulkWriteOperation<any>[]>>; // inspired by mongo bulkWrite, same (similar signature without casting OjectId, ObjectId is converted to plain by axios)
    bulkWrite?: Partial<Record<CollectionKey, SyncBulkWrite<any>>>; // eslint-disable-line @typescript-eslint/no-explicit-any
    contentsToken?: string;
    minio?: { serverUrl: string; addObjects?: string[]; removeObjects?: string[] };
    extra?: { revokeAllTokensByUserId: string };
  } | null;

  attempt: number;
  completedAt?: Date;
  result?: string; // JSON.stringify
}

const { DEFAULTS } = configLoader;

export const SYNC_JOB_CHANNEL = 'JOB';

const syncJobSchema = new Schema<SyncJobDocument>(
  {
    ...baseDefinition,
    tenant: { type: Schema.Types.ObjectId, index: true },

    notify: Schema.Types.Mixed,
    sync: Schema.Types.Mixed,

    attempt: { type: Number, default: 0 }, // 0: just queued, not yet attempt to execute
    completedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.SYNC_JOB },
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const SyncJob = model<SyncJobDocument>('SyncJob', syncJobSchema);
export default SyncJob;
