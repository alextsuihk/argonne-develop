/**
 * Joi Schemas commonly fields
 */

import Joi, { ExtensionFactory } from "joi";
import mongoose from "mongoose";

/**
 * Custom case: check if string is a valid mongo objectID
 */

const mongoObjectId: ExtensionFactory = (joi) => ({
  type: "objectId",
  base: joi.string(),
  messages: {
    objectId: '"{{#label}}" must be a valid mongo ID',
  },
  validate(value, helpers) {
    if (!mongoose.isValidObjectId(value)) {
      return { value, errors: helpers.error("objectId") };
    }
  },
});

export const mongoId = Joi.extend(mongoObjectId).objectId;

/**
 * common fields
 */

export const action = Joi.string();

export const admin = Joi.boolean();

export const address = Joi.object().keys({
  coordinates: [Joi.string().trim().required(), Joi.string().trim().required()],
  address: Joi.string().trim(),
  district: mongoId().required(),
});

export const email = Joi.string().email().trim().lowercase().required();
export const remark = Joi.string().trim();
export const search = Joi.string().trim();
export const skipDeleted = Joi.boolean().default(false);
export const updatedAfter = Joi.date();
export const updatedBefore = Joi.date();

export const locale = Joi.object().keys({
  enUS: Joi.string().trim().required(),
  zhCN: Joi.string().trim(),
  zhHK: Joi.string().trim().required(),
});

export const password = Joi.string()
  .min(6)
  .max(20)
  .regex(/^((?!.*[\s\\\/@$%\^&\*\[\]<>{}])(?=.*[a-z])(?=.*[A-Z])(?=.*\d))/)
  // .regex(/^((?!.*[\s\\\/@$%\^&\*\[\]<>{}])(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20})/)
  .message(
    "must be 6~20 long, have at least one lowercase letter, one uppercase letter, and one digit."
  )
  .required();

export const tel = Joi.string()
  .trim()
  .min(8)
  .max(9)
  .pattern(/^\d+$/)
  .required();

export const website = Joi.string().trim().uri().required();
