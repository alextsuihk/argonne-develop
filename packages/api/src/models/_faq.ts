//! TODO: WIP

/**
 * Model: FAQ
 *
 */

import { InferSchemaType, model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition, localeSchema } from './common';

const { SCHEMA_OPTS } = configLoader.DEFAULTS.MONGOOSE;

const faqSchema = new Schema(
  {
    ...baseDefinition,
    question: { type: localeSchema, required: true },
    answer: { type: localeSchema, required: true },
  },
  SCHEMA_OPTS,
);

export type FaqDocument = Omit<InferSchemaType<typeof faqSchema>, 'remarks'> & Id & Remarks;
const Faq = model('Faq', faqSchema);
export default Faq;

//! TODO: WIP: mongo Text Search | regEx search (for unicode)
