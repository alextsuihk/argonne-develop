//! TODO: WIP

/**
 * Model: FAQ
 *
 */

import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface FaqDocument extends BaseDocument {
  title: Locale;
  content: Locale;
}

const { SCHEMA_OPTS } = configLoader.DEFAULTS.MONGOOSE;

const faqSchema = new Schema<FaqDocument>(
  {
    ...baseDefinition,
    title: localeDefinition,
    content: localeDefinition,
  },
  SCHEMA_OPTS,
);

const Faq = model<FaqDocument>('Faq', faqSchema);

export default Faq;

//! TODO: WIP: mongo Text Search | regEx search (for unicode)
