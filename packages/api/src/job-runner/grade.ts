/**
 * Task: Grade Assignment
 *
 * !note: execute in hub-mode only, and sync back to satellite
 */

import { LOCALE } from '@argonne/common';
import type { Types, UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import type { AssignmentDocument } from '../models/assignment';
import Assignment from '../models/assignment';
import { BookAssignment } from '../models/book';
import Classroom from '../models/classroom';
import type { HomeworkDocument } from '../models/homework';
import Homework from '../models/homework';
import type { Task } from '../models/job';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';

const { ASSIGNMENT_HOMEWORK } = LOCALE.DB_ENUM;

const grade = async (task: Task): Promise<string> => {
  if (task.type !== 'grade' || configLoader.config.mode === 'SATELLITE') return 'IMPOSSIBLE';

  const assignment = await Assignment.findByIdAndUpdate(task.assignmentId, { updatedAt: new Date() }).lean(); // touch updatedAt to trigger re-fetch
  if (!assignment) throw `Assignment ${task.assignmentId} not found`;
  if (assignment.bookAssignments.length) return 'Auto Grade presently ONLY supports bookAssignments';

  const [bookAssignments, classroom, homeworks] = await Promise.all([
    BookAssignment.find({ _id: { $in: assignment.bookAssignments } }).lean(),
    Classroom.findById(assignment.classroom).lean(),
    Homework.find({ _id: { $in: assignment.homeworks } }).lean(),
  ]);

  if (!classroom) return `Classroom is valid (${assignment._id}-${assignment.classroom})`;

  let gradedCorrect = 0;
  let gradedWrong = 0;

  const homeworkFilterUpdates: { _id: Types.ObjectId; update: UpdateQuery<HomeworkDocument> }[] = homeworks.map(
    homework => {
      const solution = bookAssignments[homework.assignmentIdx]?.solutions[homework.dynParamIdx || 0];
      if (!solution) return { _id: homework._id, update: { updatedAt: new Date() } };

      const score = (assignment.maxScores && assignment.maxScores[homework.dynParamIdx || 0]) || 100;
      const correct =
        Number.isNaN(Number(solution)) && Number.isNaN(Number(homework.answer))
          ? solution === homework.answer
          : Math.abs(Number(solution) - Number(homework.answer)) / Number(solution) < 0.01; // if it is number and within 1%

      correct ? gradedCorrect++ : gradedWrong++;

      return {
        _id: homework._id,
        update: correct
          ? { $push: { flags: ASSIGNMENT_HOMEWORK.FLAG.AUTO_GRADE_CORRECT, scores: score } }
          : { $push: { flags: ASSIGNMENT_HOMEWORK.FLAG.AUTO_GRADE_WRONG, scores: 0 } },
      };
    },
  );

  await Promise.all([
    ...homeworkFilterUpdates.map(async ({ _id, update }) => Homework.updateOne({ _id }, update)),

    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, ...classroom.students], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: task.assignmentId }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<AssignmentDocument>,

          homeworks: homeworkFilterUpdates.map(({ _id, update }) => ({
            updateOne: { filter: { _id }, update },
          })) satisfies BulkWrite<HomeworkDocument>,
        },
      },
    ),
  ]);

  return `homework total: ${homeworks.length}, correct: ${gradedCorrect}, wrong: ${gradedWrong}`;
};

export default grade;
