/**
 * RemarkSchema (Mongoose nested document)
 *
 */

export interface Remark {
  t: Date;
  u?: string; // this is a special case, as remark is immutable
  m: string;
}

export const remarkDefinition = {
  _id: false, // use t (timestamp) for React map
  t: { type: Date, default: Date.now },
  u: String,
  m: String,
};
