/**
 * Update Ranking info in TutorDocuments (from recent questions)
 */

import { subDays } from 'date-fns';

import configLoader from '../../config/config-loader';
import Question, { QuestionDocument } from '../../models/question';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';

const { DEFAULTS } = configLoader;

export const updateTutorRanking = async () => {
  const tutors = await Tutor.find({
    deletedAt: { $exists: false },
    idx: { $mod: [31, new Date().getDate() - 1] },
  }).lean();

  for (const tutor of tutors) {
    const questions: Pick<QuestionDocument, 'level' | 'subject' | 'correctness' | 'explicitness' | 'punctuality'>[] =
      await Question.find(
        {
          tutor: tutor._id,
          updatedAt: { $gte: subDays(Date.now(), DEFAULTS.TUTOR.RANKING.ANALYSIS_DAY) },
        },
        'level subject correctness explicitness punctuality',
        { limit: DEFAULTS.TUTOR.RANKING.ANALYSIS_MAX, sort: { createdAt: -1 } },
      ).lean();

    const pairs: TutorDocument['rankings'] = [];
    tutor.specialties.forEach(({ level, subject }) => {
      if (pairs.some(pair => !pair.level.equals(level) && !pair.subject.equals(subject)))
        pairs.push({ level, subject });
    });

    const rankings: TutorDocument['rankings'] = pairs.map(({ level, subject }) => {
      //
      const associatedQuestions = questions.filter(q => q.level.equals(level) && q.subject.equals(subject));

      const correctness = associatedQuestions.map(q => q.correctness).filter((v): v is number => !!v);
      const explicitness = associatedQuestions.map(q => q.explicitness).filter((v): v is number => !!v);
      const punctuality = associatedQuestions.map(q => q.punctuality).filter((v): v is number => !!v);

      return {
        level,
        subject,
        ...(correctness.length > DEFAULTS.TUTOR.RANKING.ANALYSIS_MIN && {
          correctness: correctness.reduce((a, c) => a + c, 0) / correctness.length,
        }),
        ...(explicitness.length > DEFAULTS.TUTOR.RANKING.ANALYSIS_MIN && {
          explicitness: explicitness.reduce((a, c) => a + c, 0) / explicitness.length,
        }),
        ...(punctuality.length > DEFAULTS.TUTOR.RANKING.ANALYSIS_MIN && {
          punctuality: punctuality.reduce((a, c) => a + c, 0) / punctuality.length,
        }),
      };
    });

    await Tutor.updateOne({ _id: tutor._id }, { rankings });
    await new Promise<void>(resolve => setTimeout(resolve, 500));
  }
};
