/**
 * Apollo TypeDefs (core)
 */

import analyticTypes from './analytic';
import announcementTypes from './announcement';
import assignmentTypes from './assignment';
import authTypes from './auth';
import bookTypes from './book';
import chatGroupTypes from './chat-group';
import classroomTypes from './classroom';
import contactTypes from './contact';
import contentTypes from './content';
import contributionTypes from './contribution';
import districtTypes from './district';
import homeworkTypes from './homework';
import jobTypes from './job';
import levelTypes from './level';
import passwordTypes from './password';
import presignedUrlTypes from './presigned-url';
import publisherTypes from './publisher';
import questionTypes from './question';
// import referralTypes from './referral'; // TODO
import roleTypes from './role';
import rootTypes from './root';
import satelliteTypes from './satellite';
import schoolTypes from './school';
import subjectTypes from './subject';
import systemTypes from './system';
import tagTypes from './tag';
import tenantTypes from './tenant';
import tenantBindingTypes from './tenant-binding';
import tutorTypes from './tutor';
import tutorInverseRankingTypes from './tutor-inverse-ranking';
import typographyTypes from './typography';
import userTypes from './user';

export default [
  rootTypes,
  analyticTypes,
  announcementTypes,
  assignmentTypes,
  authTypes,
  bookTypes,
  chatGroupTypes,
  contactTypes,
  contentTypes,
  contributionTypes,
  districtTypes,
  homeworkTypes,
  jobTypes,
  levelTypes,
  passwordTypes,
  presignedUrlTypes,
  publisherTypes,
  questionTypes,
  roleTypes,
  satelliteTypes,
  schoolTypes,
  subjectTypes,
  systemTypes,
  tagTypes,
  tenantBindingTypes,
  tenantTypes,
  classroomTypes,
  typographyTypes,
  tutorInverseRankingTypes,
  tutorTypes,
  userTypes,
];
