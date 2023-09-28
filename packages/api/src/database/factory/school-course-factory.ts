/**
 * Factory: School-Course
 *
 * (for tenanted schools)
 * add valid subjects into model school's subject
 *
 *
 * ! ISSUE: book-factory is executed later, therefore courses.subjects.books would be empty []
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { Types } from 'mongoose';

import Book from '../../models/book';
import School from '../../models/school';
import type { SchoolCourseDocument } from '../../models/school-course';
import SchoolCourse from '../../models/school-course';
import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import { prob, randomItem, randomItems, schoolYear } from '../../utils/helper';

const { SCHOOL_COURSE, TENANT } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param revCount: number of rev to generate (per school)
 */
const fake = async (codes: string[], revCount = 2): Promise<string> => {
  const [books, schools, subjects, tenants] = await Promise.all([
    Book.find({ deletedAt: { $exists: false } }).lean(),
    School.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({
      school: { $exists: true },
      services: TENANT.SERVICE.CLASSROOM,
      ...(codes.length && { code: { $in: codes } }),
      deletedAt: { $exists: false },
    }).lean(),
  ]);

  const fakeSchoolCourse = (
    status: (typeof LOCALE.DB_TYPE.SCHOOL_COURSE.STATUS)[number],
    year: string,
    rev: number,
    tenantAdmins: Types.ObjectId[],
    school: Types.ObjectId,
  ) =>
    new SchoolCourse<Partial<SchoolCourseDocument>>({
      status,
      school,
      year,
      rev,

      createdAt: faker.date.recent(90),
      createdBy: randomItem(tenantAdmins),
      courses: schools
        .find(s => s._id.equals(school))!
        .levels.map(level => ({
          level,
          subjects: randomItems(
            subjects.filter(s => s.levels.some(l => l.equals(level))),
            5,
          ).map(subject => ({
            _id: subject._id,
            ...(prob(0.3) && { alias: faker.lorem.slug(5) }),
            books: randomItems(
              books.filter(b => b.subjects.some(s => s.equals(subject._id)) && b.level.equals(level)),
              2,
            ).map(b => b._id),
          })),
        })),
    });

  const schoolCourses = tenants
    .map(tenant => [
      // fake last year publisher data
      fakeSchoolCourse(SCHOOL_COURSE.STATUS.PUBLISHED, schoolYear(-1), 1, tenant.admins, tenant.school!), // TODO

      // fake this year (multiple)
      ...Array(revCount)
        .fill(0)
        .map((_, idx) =>
          fakeSchoolCourse(
            idx + 1 === revCount ? SCHOOL_COURSE.STATUS.PUBLISHED : SCHOOL_COURSE.STATUS.DRAFT,
            schoolYear(),
            idx + 1,
            tenant.admins,
            tenant.school!,
          ),
        ),
    ])
    .flat();

  await SchoolCourse.insertMany<Partial<SchoolCourseDocument>>(schoolCourses, { rawResult: true });
  return `(${chalk.green(schoolCourses.length)} schoolCourses created for ${chalk.green(tenants.length)} tenants)`;
};

export { fake };
