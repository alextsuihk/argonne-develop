//! TODO: WIP

/**
 * Model: FAQ
 *
 */

import { InferSchemaType, model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition, localeSchema } from './common';

const { SCHEMA_OPTS } = configLoader.DEFAULTS.MONGOOSE;

const faqSchema = new Schema(
  {
    ...baseDefinition,
    title: { type: localeSchema, required: true },
    content: { type: localeSchema, required: true },
  },
  SCHEMA_OPTS,
);

export type FaqDocument = InferSchemaType<typeof faqSchema> & Id;
const Faq = model('Faq', faqSchema);
export default Faq;

//! TODO: WIP: mongo Text Search | regEx search (for unicode)
