/**
 * route files (core)
 *
 */

import type { Application } from 'express';

import configLoader from '../config/config-loader';
import analyticRoutes from './api/analytics';
import announcementRoutes from './api/announcements';
import assignmentRoutes from './api/assignments';
import authRoutes from './api/auth';
import authServiceRoutes from './api/auth-services';
import bookRoutes from './api/books';
import chatGroupsRoutes from './api/chat-groups';
import classroomRoutes from './api/classrooms';
import contactRoutes from './api/contacts';
import contentRoutes from './api/contents';
import districtRoutes from './api/districts';
import emailRoutes from './api/email';
import homeworkRoutes from './api/homeworks';
// import jobRoutes from './api/jobs'; // TODO:
import levelRoutes from './api/levels';
import logRoutes from './api/logs';
import passwordRoutes from './api/password';
import presignedUrlRoutes from './api/presigned-url';
import publisherRoutes from './api/publishers';
import questionRoutes from './api/questions';
import roleRoutes from './api/roles';
import schoolRoutes from './api/schools';
import subjectRoutes from './api/subjects';
import syncRoutes from './api/sync';
import systemRoutes from './api/systems';
import tagRoutes from './api/tags';
import tenantBindingRoutes from './api/tenant-binding';
import tenantRoutes from './api/tenants';
import tutorRankingRoutes from './api/tutor-rankings';
import tutorRoutes from './api/tutors';
import typographyRoutes from './api/typographies';
import userRoutes from './api/users';

// import webpushRoutes from './api/webpush';

export default (app: Application): void => {
  app.use('/api/analytics', analyticRoutes);
  app.use('/api/logs', logRoutes);

  if (configLoader.config.mode === 'HUB') {
    // apis available for teaching
    app.use('/api/announcements', announcementRoutes); // require auth() to access
    app.use('/api/books', bookRoutes);
    app.use('/api/chat-groups', chatGroupsRoutes); // require auth() to access
    app.use('/api/districts', districtRoutes);
    app.use('/api/levels', levelRoutes);
    app.use('/api/publishers', publisherRoutes);
    app.use('/api/schools', schoolRoutes);
    app.use('/api/subjects', subjectRoutes);
    app.use('/api/systems', systemRoutes);
    app.use('/api/tags', tagRoutes);
    app.use('/api/tenants', tenantRoutes);
    app.use('/api/typographies', typographyRoutes);

    if (configLoader.config.restfulFullAccess) {
      app.use('/api/assignments', assignmentRoutes);
      app.use('/api/auth', authRoutes);
      app.use('/api/auth-services', authServiceRoutes);
      app.use('/api/classrooms', classroomRoutes);
      app.use('/api/contacts', contactRoutes);
      app.use('/api/contents', contentRoutes);
      app.use('/api/emails', emailRoutes);
      app.use('/api/homeworks', homeworkRoutes);
      // app.use('/api/jobs', jobRoutes); //TODO
      app.use('/api/password', passwordRoutes);
      app.use('/api/presigned-urls', presignedUrlRoutes);
      app.use('/api/questions', questionRoutes);
      app.use('/api/roles', roleRoutes);
      app.use('/api/sync', syncRoutes);
      app.use('/api/tenant-binding', tenantBindingRoutes);
      app.use('/api/tutor-rankings', tutorRankingRoutes);
      app.use('/api/tutors', tutorRoutes);
      app.use('/api/users', userRoutes);
      // app.use('/api', webpushRoutes);
    }
  }

  // return 404 for all other API routes
  app.use('/api', () => {
    throw { statusCode: 404 };
  });
};
