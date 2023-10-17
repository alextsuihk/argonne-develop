/**
 * Format Error for REST-ful API
 *
 * combining & re-format error object from Joi, express-validator & in-house error into a common format
 *
 */

import { LOCALE } from '@argonne/common';
import type { Request } from 'express';

import { isDevMode, isProdMode } from './utils/environment';
import log from './utils/log';

// incoming error format (mixture of various sources: express-validator, joi, in-house)
export type ControllerError = {
  statusCode?: number; // express-validator & joi DO NOT provide statusCode (always 422)
  code?: string;
  message?: string; // from 'plain', 3rd party modules (joi, mongoose, etc)
  // to identify Joi validation
  details?: {
    message: string;
    path: string[];
    context: {
      value: string;
      invalids: string[];
      labe: string;
      key: string;
    };
  }[];
  //expValidErrors: ONLY available from express-validator
  expValidErrors: {
    msg: string;
    location?: string;
    param?: string;
    value?: string;
  }[];
  // errors: ONLY available for Yup
  errors: string[];
  path: string;
  type: string;
};

// outgoing error reporting back to REST client
type CustomError = {
  type?: string;
  statusCode: number;
  url?: string; // only available in development mode
  errors: {
    code: string;
    msgText?: string; // only available in development mode
    debugMsg?: string; // OPTIONAL, available in development mode || useFeatures.includes(DEBUG)
    location?: string;
    param?: string;
    value?: string;
  }[];
};

const { MSG_ENUM, MSG_LOCALE } = LOCALE;
const { USER } = LOCALE.DB_ENUM;

// re-format error from various sources to unified format
export const formatError = async (req: Request, err: ControllerError): Promise<CustomError> => {
  const isDebug = !!(isDevMode || req.user?.features?.includes(USER.FEATURE.DEVELOPER));
  const customError: Partial<CustomError> = {};

  if (err.expValidErrors) {
    // in case of express-validator, refer to api/auth:register() & login()
    customError.type = 'express-validator'; // deprecated
    customError.statusCode = 422; // must be 422 for user-input-error
    customError.errors = err.expValidErrors?.map(error => ({
      code: MSG_ENUM.USER_INPUT_ERROR,
      ...(isDebug && { location: error.location, param: error.param, value: error.value, debugMsg: error.msg }),
    }));
  } else if (err.details) {
    // for JOI validation
    customError.type = 'joi'; // deprecated
    customError.statusCode = 422;
    customError.errors = err.details.map(({ context, message }) => ({
      code: MSG_ENUM.USER_INPUT_ERROR,
      param: context.key,
      ...(isDebug && { value: context.value, debugMsg: message }),
    }));
  } else if (err.errors) {
    // in case of Yup
    customError.type = 'yup';
    customError.statusCode = 422; // must be 422 for user-input-error
    customError.errors = err.errors?.map(error => ({
      code: MSG_ENUM.USER_INPUT_ERROR,
      param: err.path,
      ...(isDebug && { debugMsg: error }),
    }));
  } else {
    customError.type = 'plain';
    customError.statusCode = err.statusCode || 500;
    customError.errors = [
      {
        code: err.statusCode === 404 ? MSG_ENUM.NOT_FOUND : err.code ?? MSG_ENUM.UNKNOWN_EXCEPTION_ERROR,
        ...(isDebug && { debugMsg: err.message }),
      },
    ];
  }

  // if (isDebug) populate customError.errors[] with MSG_LOCALE for human friend debugging
  if (isDebug)
    customError.errors.forEach(error => {
      const { text, enUS } = MSG_LOCALE[error.code as keyof typeof MSG_LOCALE];
      error.msgText = text ?? enUS;
    });

  // for devMode log stack trace of error message
  if (isDevMode)
    return {
      type: customError.type,
      statusCode: customError.statusCode,
      url: req.originalUrl, // for debugging
      errors: customError.errors,
    };

  // for production or staging mode
  if (customError.statusCode !== 500)
    return { type: customError.type, statusCode: customError.statusCode, errors: customError.errors };

  // send statusCode: 500 to log server for further analysis
  if (isProdMode) await log('error', `Error ${customError.statusCode}`, customError, undefined, req.originalUrl);

  return {
    type: customError.type,
    statusCode: customError.statusCode,
    errors: [{ code: MSG_ENUM.GENERAL_ERROR }],
  };
};
