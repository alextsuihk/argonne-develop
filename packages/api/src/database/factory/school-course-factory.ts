// TODO: TODO: to bulky, SchoolCourseDocument should occur onces at new()

/**
 * Factory: School-Course
 *
 * (for tenanted schools)
 * add valid subjects into model school's subject
 *
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Book from '../../models/book';
import School from '../../models/school';
import type { SchoolCourseDocument } from '../../models/school-course';
import SchoolCourse from '../../models/school-course';
import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import { idsToString, prob, randomId, schoolYear, shuffle } from '../../utils/helper';

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
    tenantAdmins: string[],
    school: string,
  ) =>
    new SchoolCourse<Partial<SchoolCourseDocument>>({
      status,
      school,
      year,
      rev,

      createdAt: faker.date.recent(90),
      createdBy: randomId(tenantAdmins),
      courses: schools
        .find(s => s._id.toString() === school)!
        .levels.map(level => ({
          level,
          subjects: subjects
            .filter(s => idsToString(s.levels).includes(level.toString()))
            .sort(shuffle)
            .slice(-5)
            .map(subject => ({
              subject: subject._id,
              ...(prob(0.3) && { alias: faker.lorem.slug(5) }),
              books: idsToString(
                books
                  .filter(
                    b =>
                      idsToString(b.subjects).includes(subject._id.toString()) &&
                      b.level.toString() === level.toString(),
                  )
                  .slice(0, 2),
              ),
            })),
        })),
    });

  const schoolCourses = tenants
    .map(tenant => [
      // fake last year publisher data
      fakeSchoolCourse(
        SCHOOL_COURSE.STATUS.PUBLISHED,
        schoolYear(-1),
        1,
        idsToString(tenant.admins),
        tenant.school!.toString(),
      ),
      // fake this year (multiple)
      ...Array(revCount)
        .fill(0)
        .map((_, idx) =>
          fakeSchoolCourse(
            idx + 1 === revCount ? SCHOOL_COURSE.STATUS.PUBLISHED : SCHOOL_COURSE.STATUS.DRAFT,
            schoolYear(),
            idx + 1,
            idsToString(tenant.admins),
            tenant.school!.toString(),
          ),
        ),
    ])
    .flat();

  await SchoolCourse.create(schoolCourses);
  return `(${chalk.green(schoolCourses.length)} schoolCourses created for ${chalk.green(tenants.length)} tenants)`;
};

export { fake };
