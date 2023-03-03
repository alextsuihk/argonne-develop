/**
 * Apollo Resolvers (core)
 */

// import type { IResolvers } from 'graphql-tools';
import analyticResolvers from './analytic';
import announcementResolvers from './announcement';
import assignmentResolvers from './assignment';
import authResolvers from './auth';
import bookResolvers from './book';
import chatResolvers from './chat';
import chatGroupResolvers from './chat-group';
import classroomResolvers from './classroom';
import contactResolvers from './contact';
import districtResolvers from './district';
import levelResolvers from './level';
import passwordResolvers from './password';
import presignedUrlResolvers from './presigned-url';
import publisherResolvers from './publisher';
import questionResolvers from './question';
import roleResolvers from './role';
import rootResolvers from './root';
import schoolResolvers from './school';
import subjectResolvers from './subject';
import systemResolvers from './system';
import tagResolvers from './tag';
import tenantResolvers from './tenant';
import tutorResolvers from './tutor';
import tutorRankingResolvers from './tutor-ranking';
import typographyResolvers from './typography';
import userResolvers from './user';

export default [
  rootResolvers,
  analyticResolvers,
  announcementResolvers,
  assignmentResolvers,
  authResolvers,
  bookResolvers,
  chatGroupResolvers,
  chatResolvers,
  classroomResolvers,
  contactResolvers,
  districtResolvers,
  levelResolvers,
  passwordResolvers,
  presignedUrlResolvers,
  publisherResolvers,
  questionResolvers,
  roleResolvers,
  schoolResolvers,
  systemResolvers,
  subjectResolvers,
  tagResolvers,
  tenantResolvers,
  typographyResolvers,
  tutorRankingResolvers,
  tutorResolvers,
  userResolvers,
];
