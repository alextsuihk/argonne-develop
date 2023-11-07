/**
 * Reset-Demo
 *
 * remove demo tenant (school), users, classroom, chatGroup, question, and all associated documents
 * re-create school, tenant, users
 *
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';

import configLoader from '../../config/config-loader';
import Assignment from '../../models/assignment';
import Chat from '../../models/chat';
import ChatGroup from '../../models/chat-group';
import type { ClassroomDocument } from '../../models/classroom';
import Classroom from '../../models/classroom';
import Content from '../../models/content';
import District from '../../models/district';
import Homework from '../../models/homework';
import Level from '../../models/level';
import Question from '../../models/question';
import type { SchoolDocument } from '../../models/school';
import School from '../../models/school';
import Subject from '../../models/subject';
import type { TenantDocument } from '../../models/tenant';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import storage, { client as minioClient, publicBucket } from '../../utils/storage';
import { randomString, schoolYear } from '../helper';
import log from '../log';

const { SCHOOL, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const OXFORD = 'OXFORD';

/**
 * Reset Demo
 */
export const resetDemo = async (): Promise<void> => {
  const tenant = await Tenant.findOne({ code: OXFORD }).lean();

  // remove old documents
  if (tenant) {
    const [chatGroups, classrooms, questions] = await Promise.all([
      ChatGroup.find({ tenant: tenant._id }).lean(),
      Classroom.find({ tenant: tenant._id }).lean(),
      Question.find({ tenant: tenant._id }).lean(),
    ]);

    const chatIds = [...chatGroups.map(c => c.chats), ...classrooms.map(c => c.chats)].flat() as Types.ObjectId[];
    const [assignments, chats] = await Promise.all([
      Assignment.find({ _id: { $in: classrooms.map(c => c.assignments).flat() } }).lean(),
      Chat.find({ _id: { $in: chatIds } }).lean(),
    ]);

    const [homeworks] = await Promise.all([
      Homework.find({ _id: { $in: assignments.map(a => a.homeworks).flat() } }).lean(),
    ]);

    await Promise.all([
      Tenant.deleteOne({ _id: tenant._id }),
      tenant.school && School.deleteOne({ _id: tenant.school }),
      User.deleteMany({ tenants: tenant._id }),

      ChatGroup.deleteMany({ _id: { $in: chatGroups } }),
      ...chatGroups
        .map(c => c.logoUrl)
        .filter((logoUrl): logoUrl is string => !!logoUrl)
        .map(async logoUrl => storage.removeObject(logoUrl)), // remove chatGroups' logoUrl if exists

      Classroom.deleteMany({ _id: { $in: classrooms } }),
      Assignment.deleteMany({ _id: { $in: assignments } }),
      Homework.deleteMany({ _id: { $in: homeworks } }),
      Question.deleteMany({ _id: { $in: questions } }),

      Chat.deleteMany({ _id: { $in: chatIds } }),

      Content.deleteMany({
        _id: {
          $in: [
            ...chats.map(chat => chat.contents).flat(),
            ...homeworks.map(h => h.contents).flat(),
            ...questions.map(q => [...q.contents, ...q.bids.map(b => b.contents).flat()]).flat(),
          ],
        },
      }),
    ]);
  }

  // re-create demo tenant, users,
  const [district, levels, teacherLevel, subjectMath, tutorTenant, logoImage] = await Promise.all([
    District.findOne({ 'name.enUS': 'Kwun Tong' }).lean(),
    Level.find({ code: /S[1-6]/ }).lean(),
    Level.findOne({ code: 'TEACHER' }).lean(),
    Subject.findOne({ 'name.enUS': /Math*/ }).lean(),
    Tenant.findTutor(),
    fsPromises.readFile(path.join(__dirname, 'images', 'oxford.png')),
  ]);

  const [firstLevel] = levels;
  if (!district || !teacherLevel || !firstLevel || !subjectMath)
    return log('error', 'resetDemo(), no valid district or invalid levels');

  const logoFilename = randomString('png');
  const name = { enUS: 'Oxford College', zhHK: '牛頭角津貼中學', zhCN: '牛津中学' };
  const logoUrl = `/${publicBucket}/${logoFilename}`;
  const website = 'https://www.ox.ac.uk/';

  const school = new School<Partial<SchoolDocument>>({
    code: OXFORD,
    name,
    district: district._id,
    phones: ['+852 12345678'],
    band: SCHOOL.BAND.UNSPECIFIC,
    logoUrl,
    website,
    funding: SCHOOL.FUNDING.UNSPECIFIC,
    gender: SCHOOL.FUNDING.UNSPECIFIC,
    religion: SCHOOL.RELIGION.UNSPECIFIC,
    levels: levels.map(l => l._id),
  });

  const { CHAT_GROUP, CLASSROOM, TUTOR } = TENANT.SERVICE;
  const newTenant = new Tenant<Partial<TenantDocument>>({
    flags: [TENANT.FLAG.DEMO],
    code: OXFORD,
    name,
    school: school._id,
    services: [CHAT_GROUP, CLASSROOM, TUTOR],
    logoUrl,
    website,
  });

  const SCHOOL_CLASSES = ['A', 'B'] as const;
  const genUsers = (count: number, schoolClass?: string) =>
    Array(count)
      .fill(0)
      .map(
        (_, idx) =>
          new User<Partial<UserDocument>>({
            tenants: schoolClass ? [newTenant._id, tutorTenant._id] : [newTenant._id],
            flags: Array.from(new Set([...DEFAULTS.USER.FLAGS, USER.FLAG.DEMO])),
            status: USER.STATUS.ACTIVE,
            name: schoolClass ? `Demo Student (${schoolClass}-${idx})` : `Demo Teacher ${idx}`,
            studentIds: [`${newTenant._id}#${schoolClass || 'T'}${String(idx + 1).padStart(5, '0')}`],
            emails: [],
            password: 'ABCD#1234',
            identifiedAt: new Date(),
            schoolHistories: [
              {
                year: schoolYear(),
                school: school._id,
                level: schoolClass ? teacherLevel._id : firstLevel!._id,
                ...(schoolClass && { schoolClass: `${firstLevel!.code.slice(-1)}-${schoolClass}` }),
                updatedAt: new Date(),
              },
            ],
          }),
      );

  const teachers = genUsers(2);
  const studentAs = genUsers(10, SCHOOL_CLASSES[0]);
  const studentBs = genUsers(10, SCHOOL_CLASSES[1]);

  const classrooms = SCHOOL_CLASSES.map(
    schoolClass =>
      new Classroom<Partial<ClassroomDocument>>({
        tenant: newTenant._id,
        level: firstLevel._id,
        subject: subjectMath._id,
        year: schoolYear(),
        schoolClass: `${firstLevel!.code.slice(-1)}-${schoolClass}`,
        title: `${firstLevel!.code.slice(-1)}-${schoolClass} ${subjectMath.name.enUS}`,
        room: 'Room 101',
        schedule: 'M-W-F 9:00-9:50',
        books: [],
        teachers: teachers.map(t => t._id),
        students: schoolClass === 'A' ? studentAs.map(s => s._id) : studentBs.map(s => s._id),
      }),
  );

  await Promise.all([
    User.create<Partial<UserDocument>>([...teachers, ...studentAs, ...studentBs]),
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    school.save(),
    newTenant.save(),

    Classroom.insertMany(classrooms, { includeResultMetadata: true }),
    log('info', `demo is reset, tenantId: ${newTenant._id}, schoolId: ${school._id}`),
  ]);
};
