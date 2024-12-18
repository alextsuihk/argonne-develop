/* eslint-disable no-console */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

/**
 * Compile-Locale
 *
 * compile (combine) database, tag & apiMessage JSON(s) into a single file for backend & frontend consumption.
 *
 * compile msg-code to a JSON file
 *
 *
 * Note
 *  1. merge all sub-sections of messages
 *  2. generate
 *     2a) msgText: primarily for React
 *     2b) msgCode: primarily for Express backend to reference
 *
 * message-code format (5-digit number)
 *  Digit 1-2: category
 *  Digit 3-4: message
 *  Digit 5: sub-message
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const database = require('./locale/database');
const tag = require('./locale/tag');

/**
 *Traverse the ENUM object, extract the KEY (one level above enUS, zhHK)
 */
const traverse = obj => {
  for (const [key, value] of Object.entries(obj)) {
    if (value?.hasOwnProperty('enUS') && key !== 'LOCALE') {
      //! LOCALES is a special case
      obj[key] = key;
    } else if (typeof value === 'object') {
      traverse(value);
    }
  }
};

const traverseType = obj => {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object') {
      if (!Object.values(value)[0].hasOwnProperty('enUS') || Object.keys(value)[0] === 'LOCALE') {
        //! LOCALES is a special case
        traverseType(value);
      } else {
        obj[key] = Object.keys(value);
      }
    }
  }
};

/**
 * Scan missing locale
 */
const scanMissingLocale = (title, obj) => {
  for (const [key, value] of Object.entries(obj)) {
    if (value?.enUS || value?.zhHK || value?.zhCN) {
      if (!value?.enUS || !value?.zhHK || !value?.zhCN)
        console.log(` ${title}.${key}: missing locales: ${JSON.stringify(value)}`);
    } else if (typeof value === 'object') {
      for (const [innerKey, innerValue] of Object.entries(value)) {
        scanMissingLocale(`${title}.${key}.${innerKey}`, innerValue);
      }
    }
  }
};

/**
 * Generate hash code & builtAt information and write to build.json
 *
 */
const comment =
  'This file is generated by message-consolidation tool, do NOT modify directly. Please compile using command "yarn build"';
const now = new Date();
const builtAt = now.toISOString();
const builtTime = now.getTime();
const hash = now.getTime().toString(36);
const buildInfo = {
  user: os.userInfo().username,
  hostname: os.hostname(),
  arch: os.arch(),
};

/**
 * Generate Database Locale
 */
const DB_LOCALE = JSON.parse(JSON.stringify(database)); // deep copy
const DB_ENUM = JSON.parse(JSON.stringify(database));
traverse(DB_ENUM);

const DB_TYPE = JSON.parse(JSON.stringify(database));
traverseType(DB_TYPE);

/**
 * Generate Tag Locale
 */
const TAG_LOCALE = { ...tag };
const TAG_ENUM = { tag };
traverse(TAG_ENUM);

/**
 * Generate API-Message Locale
 */
let MSG_LOCALE = {};

const loadAndCheckDuplicate = (folder, msgFiles) => {
  for (const file of msgFiles) {
    const apiMessage = require(path.join(folder, file.name));

    // check duplicated object key (from new file)
    const duplicated = Object.keys(MSG_LOCALE).filter({}.hasOwnProperty.bind(apiMessage));
    if (duplicated.length) {
      console.log(
        `${file.name} has duplicated object key(s): ${duplicated} \nTerminated without generating JSON file.`,
      );
      process.exit(1);
    }

    MSG_LOCALE = { ...MSG_LOCALE, ...apiMessage };
  }
};

const folder = path.join(__dirname, 'locale', 'api-messages');
const msgFiles = fs.readdirSync(folder, { withFileTypes: true }).filter(file => file.name.startsWith('msg-'));

loadAndCheckDuplicate(folder, msgFiles);

// extract MSG_ENUM for backend
const MSG_ENUM = {};
Object.keys(MSG_LOCALE).forEach(key => {
  MSG_ENUM[MSG_LOCALE[key].text] = key;
});

/**
 * Write result to server-app/src
 */
const result = {
  comment,
  buildInfo,
  builtAt,
  builtTime,
  hash,
  MSG_ENUM,
  MSG_LOCALE,
  DB_ENUM,
  DB_LOCALE,
  DB_TYPE,
  TAG_ENUM,
  TAG_LOCALE,
};

const content = `const locale = ${JSON.stringify(result)} as const; export default locale;`;
fs.writeFileSync(path.join(__dirname, 'src', 'generated-locale.ts'), content);
fs.writeFileSync(path.join(__dirname, 'dist', 'generated-locale.json'), JSON.stringify(result));

// fs.writeFileSync(path.join(__dirname, '..', 'server-api', 'src', 'generated-locale.ts'), content);
// fs.writeFileSync(path.join(__dirname, '..', 'client-web', 'src', 'generated-locale.ts'), content);

// scan if any ENUM without all 3 locales
if (Object.entries(MSG_LOCALE).length) scanMissingLocale('MSG_LOCALE', MSG_LOCALE);
if (Object.entries(DB_LOCALE).length) scanMissingLocale('DB_LOCALE', DB_LOCALE);
if (Object.entries(TAG_LOCALE).length) scanMissingLocale('TAG_LOCALE', TAG_LOCALE);
