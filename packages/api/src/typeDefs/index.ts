/**
 * Apollo TypeDefs (core)
 */

import analyticTypes from './analytic';
import announcementTypes from './announcement';
import assignmentTypes from './assignment';
import authTypes from './auth';
import bookTypes from './book';
import chatTypes from './chat';
import chatGroupTypes from './chat-group';
import classroomTypes from './classroom';
import contactTypes from './contact';
import contributionTypes from './contribution';
import districtTypes from './district';
import emailTypes from './email';
import levelTypes from './level';
import passwordTypes from './password';
import presignedUrlTypes from './presigned-url';
import publisherTypes from './publisher';
import questionTypes from './question';
// import referralTypes from './referral'; // TODO
import roleTypes from './role';
import rootTypes from './root';
import schoolTypes from './school';
import subjectTypes from './subject';
import systemTypes from './system';
import tagTypes from './tag';
import tenantTypes from './tenant';
import tenantBindingTypes from './tenant-binding';
import tutorTypes from './tutor';
import tutorRankingTypes from './tutor-ranking';
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
  chatTypes,
  contactTypes,
  contributionTypes,
  districtTypes,
  emailTypes,
  levelTypes,
  passwordTypes,
  presignedUrlTypes,
  publisherTypes,
  questionTypes,
  roleTypes,
  schoolTypes,
  subjectTypes,
  systemTypes,
  tagTypes,
  tenantBindingTypes,
  tenantTypes,
  classroomTypes,
  typographyTypes,
  tutorRankingTypes,
  tutorTypes,
  userTypes,
];
