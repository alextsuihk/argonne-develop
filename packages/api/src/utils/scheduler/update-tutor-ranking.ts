/**
 * Update Ranking info in TutorDocuments
 */

import { LOCALE } from '@argonne/common';
import { subDays } from 'date-fns';

import Tenant from '../../models/tenant';
import Tutor from '../../models/tutor';
import TutorRanking from '../../models/tutor-ranking';

const { TENANT } = LOCALE.DB_ENUM;

const MIN_RANKING_STATS = 30;

export const updateTutorRanking = async () => {
  const tenants = await Tenant.find({ services: TENANT.SERVICE.TUTOR, deletedAt: { $exists: false } }).lean();

  for (const tenant of tenants) {
    const tutors = await Tutor.find({
      tenant,
      'specialties.0': { $exists: true },
      rankingUpdatedAt: { $lt: subDays(Date.now(), 30) },
    });

    for (const tutor of tutors) {
      let hasUpdate = false;
      const rankings = await TutorRanking.find({ tutor }).lean();
      for (const specialty of tutor.specialties) {
        const specialtyRankings = rankings.filter(
          ({ lang, level, subject }) =>
            lang === specialty.lang && specialty.level.equals(level) && specialty.subject.equals(subject),
        );

        // only update if there is enough statistics data
        if (specialtyRankings.length > MIN_RANKING_STATS) {
          hasUpdate = true;

          const initial = { correctness: 0, explicitness: 0, punctuality: 0 };
          const sums = specialtyRankings.reduce<typeof initial>(
            (acc, current) => ({
              correctness: acc.correctness + current.correctness,
              explicitness: acc.explicitness + current.explicitness,
              punctuality: acc.punctuality + current.punctuality,
            }),
            initial,
          );

          // update specialties.ranking
          specialty.ranking = {
            correctness: sums.correctness / specialtyRankings.length,
            explicitness: sums.explicitness / specialtyRankings.length,
            punctuality: sums.punctuality / specialtyRankings.length,
          };
        }
      }

      if (hasUpdate) await tutor.save();
    }
    await new Promise<void>(resolve => setTimeout(resolve, 500));
  }
};
