/**
 * Task: Grade Assignment
 *
 */

import { LOCALE } from '@argonne/common';
import * as yup from 'yup';

import Assignment from '../models/assignment';
import { BookAssignment } from '../models/book';
import Classroom from '../models/classroom';
import Homework from '../models/homework';
import { notifySync } from '../utils/notify-sync';

const { ASSIGNMENT_HOMEWORK } = LOCALE.DB_ENUM;

// ASSIGNMENT_HOMEWORK.FLAG.AUTO_GRADE_CORRECT

const grade = async (args: unknown): Promise<string> => {
  const { assignmentId } = await yup.object({ assignmentId: yup.string().required() }).validate(args);

  const assignment = await Assignment.findById(assignmentId).lean();

  if (!assignment) throw `assignment ${assignmentId} not found`;
  if (assignment.bookAssignments.length) return 'Auto Grade presently ONLY supports bookAssignments';

  const [bookAssignments, classroom, homeworks] = await Promise.all([
    BookAssignment.find({ _id: { $in: assignment.bookAssignments } }).lean(),
    Classroom.findById(assignment.classroom).lean(),
    Homework.find({ _id: { $in: assignment.homeworks } }).lean(),
  ]);

  let gradedCorrect = 0;
  let gradedWrong = 0;

  await Promise.all(
    homeworks.map(homework => {
      const solution = bookAssignments[homework.assignmentIdx]?.solutions[homework.dynParamIdx || 0];
      if (solution) {
        const score = (assignment.maxScores && assignment.maxScores[homework.dynParamIdx || 0]) || 100;

        const correct =
          Number.isNaN(solution) && Number.isNaN(homework.answer)
            ? Math.abs(Number(solution) - Number(homework.answer)) / Number(solution) < 0.01 // if it is number and within 1%
            : solution === homework.answer;

        correct ? gradedCorrect++ : gradedWrong++;

        Homework.updateOne(
          { _id: homework },
          correct
            ? { $push: { flags: ASSIGNMENT_HOMEWORK.FLAG.AUTO_GRADE_CORRECT, scores: score } }
            : { $push: { flags: ASSIGNMENT_HOMEWORK.FLAG.AUTO_GRADE_WRONG, scores: 0 } },
        );
      }
    }),
  );

  if (classroom)
    await Promise.all([
      notifySync(
        'ASSIGNMENT',
        { tenantId: classroom.tenant, userIds: classroom.teachers },
        { assignmentIds: [assignment] },
      ),
      ...homeworks.map(async homework =>
        notifySync('HOMEWORK', { tenantId: classroom.tenant, userIds: [homework.user] }, { homeworkIds: [homework] }),
      ),
    ]);

  return `homework total: ${homeworks.length}, correct: ${gradedCorrect}, wrong: ${gradedWrong}`;
};

export default grade;
