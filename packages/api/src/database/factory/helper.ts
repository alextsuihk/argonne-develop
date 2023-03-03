/**
 * Common Useful Helpers
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import type { Types } from 'mongoose';

import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import { prob, randomId } from '../../utils/helper';

const { CONTENT } = LOCALE.DB_ENUM;

export const fakeContents = (
  parentId: string | Types.ObjectId,
  userIds: (string | Types.ObjectId)[],
  count: number,
  recallable = false,
) =>
  Array(Math.ceil(count))
    .fill(0)
    .map(
      _ =>
        new Content<Partial<ContentDocument>>({
          flags: recallable && prob(0.1) ? [CONTENT.FLAG.RECALLED] : [],
          parents: [`/chats/${parentId}`],
          creator: randomId(userIds),
          data: faker.lorem.sentences(10),
          createdAt: faker.date.recent(30),
        }),
    );
