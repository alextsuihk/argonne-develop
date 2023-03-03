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
import User from '../../models/user';
import { idsToString, prob, schoolYear, shuffle } from '../../utils/helper';

const { SCHOOL_COURSE, TENANT } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param revCount: number of rev to generate (per school)
 */
const fake = async (revCount = 2): Promise<string> => {
  const [{ alexId }, books, subjects, tenants] = await Promise.all([
    User.findSystemAccountIds(),
    Book.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({
      school: { $exists: true },
      services: TENANT.SERVICE.CLASSROOM,
      deletedAt: { $exists: false },
    }).lean(),
  ]);

  const schools = await School.find({ _id: { $in: tenants.map(t => t.school) }, deletedAt: { $exists: false } });
  if (!subjects.length) throw new Error('Subject Collection is empty');

  const schoolCourses = tenants
    .map(tenant =>
      Array(revCount)
        .fill(0)
        .map(
          (_, idx) =>
            new SchoolCourse<Partial<SchoolCourseDocument>>({
              status: revCount === idx + 1 ? SCHOOL_COURSE.STATUS.DRAFT : SCHOOL_COURSE.STATUS.PUBLISHED,

              school: tenant.school!,
              year: schoolYear(0),

              rev: idx + 1,
              createdAt: faker.date.recent(90),
              createdBy: tenant.admins[0]!.toString() || alexId,
              courses: schools
                .find(s => s._id.toString() === tenant.school!.toString())!
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
            }),
        ),
    )
    .flat();

  await SchoolCourse.create(schoolCourses);
  return `(${chalk.green(schoolCourses.length)} schoolCourses created for ${chalk.green(schools.length)} schools)`;
};

export { fake };
