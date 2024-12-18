/**
 * Apollo Resolvers (core)
 */

// import type { IResolvers } from 'graphql-tools';
import analyticResolvers from './analytic';
import announcementResolvers from './announcement';
import assignmentResolvers from './assignment';
import authResolvers from './auth';
import bookResolvers from './book';
import chatGroupResolvers from './chat-group';
import classroomResolvers from './classroom';
import contactResolvers from './contact';
import contentResolvers from './content';
import districtResolvers from './district';
import homeworkResolvers from './homework';
import jobResolvers from './job';
import levelResolvers from './level';
import passwordResolvers from './password';
import presignedUrlResolvers from './presigned-url';
import publisherResolvers from './publisher';
import questionResolvers from './question';
import roleResolvers from './role';
import rootResolvers from './root';
import satelliteResolvers from './satellite';
import schoolResolvers from './school';
import subjectResolvers from './subject';
import systemResolvers from './system';
import tagResolvers from './tag';
import tenantResolvers from './tenant';
import tenantBindingResolvers from './tenant-binding';
import tutorResolvers from './tutor';
import tutorInverseRankingResolvers from './tutor-inverse-ranking';
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
  classroomResolvers,
  contactResolvers,
  contentResolvers,
  districtResolvers,
  homeworkResolvers,
  jobResolvers,
  levelResolvers,
  passwordResolvers,
  presignedUrlResolvers,
  publisherResolvers,
  questionResolvers,
  roleResolvers,
  satelliteResolvers,
  schoolResolvers,
  subjectResolvers,
  systemResolvers,
  tagResolvers,
  tenantBindingResolvers,
  tenantResolvers,
  typographyResolvers,
  tutorInverseRankingResolvers,
  tutorResolvers,
  userResolvers,
];
