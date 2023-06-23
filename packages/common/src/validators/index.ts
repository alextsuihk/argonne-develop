/**
 * Yup Schemas
 */

import mongoose from 'mongoose';
import type { InferType } from 'yup';
import * as yup from 'yup';

import LOCALE from '../generated-locale';

const { MSG_ENUM } = LOCALE;
const { QUESTION, SCHOOL, SYSTEM, TENANT, USER } = LOCALE.DB_ENUM;

const BUCKETS = ['private', 'public'];

// common fields
const coordinates = yup
  .object({ lat: yup.number().required(), lng: yup.number().required() })
  .default(null)
  .nullable()
  .noUnknown();

const optionalId = yup.string().test(
  'id',
  `MSG_CODE#${MSG_ENUM.INVALID_ID}`,
  (value: unknown) => typeof value !== 'string' || mongoose.isObjectIdOrHexString(value),
  // (value: unknown) => typeof value !== 'string' || mongoose.isValidObjectId(value),
);
const optionalIds = yup.array().of(optionalId);
const id = optionalId.required();
const ids = yup.array().of(id).required();

const locale = yup
  .object({
    enUS: yup.string().trim().required(),
    zhCN: yup.string().trim().optional(),
    zhHK: yup.string().trim().required(),
  })
  .required()
  .noUnknown();

const email = yup.string().trim().required().email().lowercase();
const name = yup.string().trim().required().max(100);

const password = yup
  .string()
  .trim()
  .matches(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9!#$%^]{8,}/,
    'at least 6 characters with one lowercase letter, one uppercase letter and one digit.',
  )
  .required();
const phone = yup
  .string()
  .trim()
  .required()
  .matches(/^(\+852 \d{8}|\+86 \d{11})$/);
const phones = yup.array().of(phone);
// const requiredUrl = yup.string().trim().url(); // workaround: YUP is not happy with localhost
// const requiredUrl = yup.string().trim().required();
// const url = yup.string().trim().url(); // workaround: YUP is not happy with localhost
const url = yup.string().trim();

// common schemas
export const contributionSchema = yup.object({
  contribution: yup
    .object({
      title: yup.string().trim().required(),
      description: yup.string().trim().optional(),
      contributors: yup
        .array()
        .of(
          yup.object({
            user: id,
            name: yup.string().trim().required(),
            school: id,
          }),
        )
        .required(),
      urls: yup.array().of(url.required()).required(),
    })
    .noUnknown(),
});
// general schemas
export const adSchema = yup.object({
  ad: yup
    .object({
      title: yup.string().trim().required(),
      beginAt: yup.date().required(),
      endAt: yup.date().required(),
    })
    .noUnknown(),
});

export const analyticSessionSchema = yup.object({
  fullscreen: yup.boolean().default(false),
  token: yup.string().trim().required(),
  coordinates,
});

export const announcementSchema = yup.object({
  announcement: yup
    .object({
      tenantId: optionalId,
      title: yup.string().trim().required(),
      message: yup.string().trim().required(),
      beginAt: yup.date().required(),
      endAt: yup.date().required(),
    })
    .noUnknown(),
});
export const apiKeySchema = yup.object({
  apiKey: yup.string().trim().required(),
});

export const assignmentIdSchema = yup.object({ assignmentId: id });
export const assignmentSchema = yup.object({
  classroom: id,
  flags: yup.array().of(yup.string().trim()).required(),
  chapter: yup.string().trim().optional(),
  title: yup.string().trim().optional(),
  deadline: yup.date().required(),
  questions: yup.array().of(yup.string().trim().required()).required(),
  maxScores: yup.array().of(yup.number()),

  homeworks: yup
    .array()
    .of(
      yup.object({
        user: id,
        assignmentIdx: yup.number().required(),
        dynParamIdx: yup.number().optional(),
      }),
    )
    .required(),
});
export const assignmentGradeSchema = yup.object({
  homeworkId: id,
  content: yup.string().trim().optional(),
  score: yup.number().optional(),
});

export const assignmentUpdateSchema = yup.object({
  deadline: yup.date().required(),
});

export const bookSchema = yup.object({
  book: yup
    .object({
      publisher: id,
      level: id,
      subjects: ids,
      title: yup.string().trim().required(),
      subTitle: yup.string().trim().optional(),
    })
    .noUnknown(),
});
export const bookAssignmentSchema = yup.object({
  assignment: yup
    .object({
      chapter: yup.string().trim().required(),
      content: yup.string().trim().required(),
      dynParams: yup.array().of(yup.string().trim().required()).required(),
      solutions: yup.array().of(yup.string().trim().required()).required(),
      examples: yup.array().of(yup.string().trim().required()).required(),
    })
    .concat(contributionSchema)
    .noUnknown(),
});
export const bookIsbnSchema = yup.object({ isbn: yup.string().trim().required() });
export const bookRevisionSchema = yup.object({
  revision: yup
    .object({
      rev: yup.string().trim().required(),
      isbn: yup.string().trim().optional(),
      year: yup.number().min(2018).max(2030).required(),
      listPrice: yup.number(),
    })
    .noUnknown(),
});
export const bookRevisionIdSchema = yup.object({ revisionId: id });
export const bookSupplementSchema = yup.object({
  supplement: yup.object({ chapter: yup.string().trim().required() }).concat(contributionSchema).noUnknown(),
});
export const bookSupplementIdSchema = yup.object({ supplementId: id });
export const chatIdSchema = yup.object({ chatId: id });
export const chatGroupSchema = yup.object({
  title: yup.string().trim().optional(),
  description: yup.string().trim().optional(),
  membership: yup.string().trim().required(),
  logoUrl: yup.string().trim().optional(),
});
export const classroomCoreSchema = yup.object({
  tenantId: id,
  level: id,
  subject: id,
  year: yup.string().trim().required(),
  schoolClass: yup.string().trim().required(),
});
export const classroomExtraSchema = yup.object({
  title: yup.string().trim().optional(),
  room: yup.string().trim().optional(),
  schedule: yup.string().trim().optional(),
  books: yup.array().of(id).required(),
});
export const clientSchema = yup.object({
  client: yup.string().trim().required(),
});
export const contactNameSchema = yup.object({
  name: yup.string().trim().optional(),
});
export const contentIdSchema = yup.object({ contentId: id });
export const contentSchema = yup.object({
  content: yup.string().trim().required(),
  visibleAfter: yup.date().optional(),
});

export const districtSchema = yup.object({
  district: yup.object({ name: locale, region: locale }).noUnknown(),
});
export const emailSchema = yup.object({ email });
export const featureSchema = yup.object({ feature: yup.string().trim().uppercase().required() });
export const flagSchema = yup.object({ flag: yup.string().trim().uppercase().required() });

export const homeworkSchema = yup.object({
  answer: yup.string().trim().optional(),
  content: yup.string().trim().optional(),
  timeSpent: yup.number().optional(),
  viewedExample: yup.number().optional(),
});

export const idSchema = yup.object({ id });
export const levelSchema = yup.object({
  level: yup
    .object({ code: yup.string().trim().uppercase().required(), name: locale, nextLevel: optionalId })
    .noUnknown(),
});
export const optionalExpiresInSchema = yup.object({ expiresIn: yup.number() });
export const optionalIdSchema = yup.object({ id: optionalId });
export const optionalTimeSpentSchema = yup.object({ timeSpent: yup.number().optional() });
export const optionalTimestampSchema = yup.object({ timestamp: yup.date().optional() });
export const optionalTitleSchema = yup.object({ title: yup.string().trim().optional() });

export const passwordSchema = yup.object({ password });
export const presignedUrlSchema = yup.object({
  bucketType: yup.string().trim().required().oneOf(BUCKETS),
  ext: yup.string().trim().lowercase().required(),
});
export const publisherSchema = yup.object({
  publisher: yup
    .object({ admins: ids, name: locale, phones, website: url.optional(), logoUrl: yup.string().trim().optional() })
    .noUnknown(),
});
export const querySchema = yup.object({
  query: yup.object({
    search: yup.string().trim().optional(),
    updatedAfter: yup.date(),
    updatedBefore: yup.date(),
    skipDeleted: yup.boolean().default(true),
  }),
});

export const questionSchema = yup.object({
  tenantId: id,
  userIds: ids,

  deadline: yup.date().required(),

  classroom: optionalId,
  level: id,
  subject: id,
  book: optionalId,
  bookRev: yup.string().trim().optional(),
  chapter: yup.string().trim().optional(),
  assignmentIdx: yup.number().optional(),
  dynParamIdx: yup.number().optional(),

  homework: optionalId,
  lang: yup.string().trim().required().oneOf(Object.keys(QUESTION.LANG)),

  price: yup.number().optional(),
  content: yup.string().trim().required(),
});
export const rankingSchema = yup.object({
  correctness: yup.number().min(1000).max(5000).required(),
  punctuality: yup.number().min(1000).max(5000).required(),
  explicitness: yup.number().min(1000).max(5000).required(),
});
export const remarkSchema = yup.object({ remark: yup.string().trim().required() });
export const removeSchema = yup.object({ id, remark: yup.string().trim().optional() });
export const roleSchema = yup.object({ role: yup.string().trim().required().oneOf(Object.keys(USER.ROLE)) });
export const schoolSchema = yup.object({
  school: yup
    .object({
      code: yup.string().trim().uppercase().required(),
      name: locale,
      address: locale,
      district: id,
      phones,
      emi: yup.boolean().optional(),
      band: yup.string().trim().optional(),
      logoUrl: yup.string().trim().optional(),
      website: url.optional(),
      funding: yup.string().trim().optional().oneOf(Object.keys(SCHOOL.FUNDING)),
      gender: yup.string().trim().optional().oneOf(Object.keys(SCHOOL.GENDER)),
      religion: yup.string().trim().optional(),
      levels: ids,
    })
    .noUnknown(),
});
export const sourceIdSchema = yup.object({ sourceId: id });
export const subjectSchema = yup.object({
  subject: yup.object({ name: locale, levels: ids }).noUnknown(),
});

export const taggingSchema = yup.object({ id, tag: id });
export const tagSchema = yup.object({
  tag: yup.object({ name: locale, description: locale }).noUnknown(),
});
export const tenantCoreSchema = yup.object({
  tenant: yup
    .object({
      code: yup.string().trim().uppercase().required(),
      name: locale,
      school: optionalId,
      services: yup
        .array()
        .of(yup.string().trim().required().oneOf(Object.keys(TENANT.SERVICE)))
        .required(),
      satelliteUrl: url.optional(),
    })
    .noUnknown(),
});
export const tenantExtraSchema = yup.object({
  tenant: yup
    .object({
      admins: yup.array().of(id).required(),
      supports: yup.array().of(id).required(),
      counselors: yup.array().of(id).required(),
      marshals: yup.array().of(id).required(),
      theme: yup.string().trim().optional(),
      htmlUrl: yup.string().trim().optional(),
      logoUrl: yup.string().trim().optional(),
      website: url.required(),
      flaggedWords: yup.array().of(yup.string().trim().optional()).required(),
    })
    .noUnknown(),
});
export const tenantIdSchema = yup.object({ tenantId: id });
export const tokenSchema = yup.object({ token: yup.string().trim().required() });
export const tutorSchema = yup.object({
  intro: yup.string().trim().required(),
  officeHour: yup.string().trim().optional(),
});
export const tutorCredentialIdSchema = yup.object({ credentialId: id });
export const tutorCredentialSchema = yup.object({
  title: yup.string().trim().required(),
  proofs: yup.array().of(yup.string().trim().required()).required(),
});
export const tutorSpecialtyIdSchema = yup.object({ specialtyId: id });
export const tutorSpecialtySchema = yup.object({
  note: yup.string().trim().optional(),
  lang: yup.string().trim().required().oneOf(Object.keys(QUESTION.LANG)).required(),
  subject: yup.string().trim().required(),
  level: yup.string().trim().required(),
});
export const typographySchema = yup.object({
  typography: yup
    .object({
      key: yup.string().trim().required(),
      title: locale,
      content: locale,
    })
    .noUnknown(),
});
export const typographyCustomSchema = yup.object({
  custom: yup.object({ title: locale, content: locale }).noUnknown(),
});

export const urlSchema = yup.object({ url: url.required() });

export const versionSchema = yup.object({ version: yup.string().trim().required() });
export const userApiKeySchema = yup.object({
  scope: yup.string().trim().required(),
  note: yup.string().trim().optional(),
  expireAt: yup.date().required(),
});
export const userLocaleSchema = yup.object({
  locale: yup.string().trim().required().oneOf(Object.keys(SYSTEM.LOCALE)),
});
export const userNetworkStatusSchema = yup.object({
  networkStatus: yup.string().trim().required().oneOf(Object.keys(USER.NETWORK_STATUS)),
});
export const userPaymentMethodsSchema = yup.object({
  currency: yup.string().trim().required(),
  type: yup.string().trim().required(),
  bank: yup.string().trim().optional(),
  account: yup.string().trim().required(),
  payable: yup.boolean().default(false),
  receivable: yup.boolean().default(false),
});

export const userProfileSchema = yup.object({
  name: yup.string().trim().optional(),
  formalName: locale.optional(),
  avatarUrl: yup.string().trim().optional(),
  mobile: phone.optional(),
  whatsapp: phone.optional(),
  yob: yup.number().optional(),
  dob: yup.date().optional(),
});

export const userIdSchema = yup.object({ userId: id });
export const userIdsSchema = yup.object({
  userIds: yup.array().of(id).required(),
});
export const userSchema = yup.object({
  tenantId: optionalId,
  email,
  name,
  studentId: yup.string().trim().optional(),
});
export const userSchoolSchema = yup.object({
  year: yup.string().trim().required(),
  level: yup.string().trim().required(),
  schoolClass: yup.string().trim().optional(),
});

// auth & password related schemas
const force = yup.boolean();
const isPublic = yup.boolean();
const refreshToken = yup.string().trim().required();

export const authCommon = yup.object({ coordinates, clientHash: yup.string().trim().optional() });
const loginCommon = authCommon.concat(yup.object({ isPublic, force }));
export const deregisterSchema = authCommon.concat(passwordSchema);

export const impersonateSchema = authCommon.concat(userIdSchema);
export const loginSchema = loginCommon.concat(emailSchema).concat(passwordSchema);
export const loginWithStudentIdSchema = loginCommon
  .concat(yup.object({ studentId: yup.string().trim().required(), password }))
  .concat(tenantIdSchema);
export const loginWithTokenSchema = authCommon.concat(tokenSchema);
export const oAuth2UnlinkSchema = authCommon.concat(yup.object({ oAuthId: yup.string().trim().required() }));
export const oAuth2Schema = loginCommon.concat(
  yup.object({ provider: yup.string().trim().uppercase().required(), code: yup.string().trim().required() }),
);
export const passwordChangeSchema = authCommon.concat(
  yup.object({
    currPassword: yup.string().trim().required(),
    newPassword: password,
    refreshToken,
  }),
);
export const passwordConfirmResetSchema = authCommon.concat(passwordSchema).concat(tokenSchema);
export const passwordResetRequestSchema = authCommon.concat(emailSchema);
export const refreshTokenSchema = authCommon.concat(yup.object({ refreshToken }));
export const registerSchema = authCommon.concat(yup.object({ email, name, password, isPublic }));
export const renewTokenSchema = authCommon.concat(yup.object({ refreshToken, isPublic }));

export type Query = InferType<typeof querySchema>;

// TODO: lazy validation  https://objectpartners.com/2020/06/04/validating-optional-objects-with-yup/
const lazySchema = yup.object({
  // Selectively apply validation at test time based off of the value
  color: yup.lazy(value => {
    // This is the same if-logic I outlined in "The Problem" section of this post
    if (value && Object.values(value).some(v => !(v === null || v === undefined || v === ''))) {
      // Return our normal validation
      return yup.object({
        default: yup.string().trim().required(),
        dark: yup.string().trim().required(),
        light: yup.string().trim().required(),
      });
    }
    // Otherwise, return a simple validation
    return yup.mixed().optional();
    // Note that the below code is also a valid final return
    // return yup.default(undefined);
  }),
});
