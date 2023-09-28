/**
 * Route: Logs
 *
 */

import { LOCALE } from '@argonne/common';
import { Router } from 'express';

import type { LogEventDocument } from '../../models/event/log';
import LogEvent from '../../models/event/log';
import type { Level } from '../../utils/log';

const router = Router();
const { MSG_ENUM } = LOCALE;

/**
 * @route   POST api/logs
 * @desc    add a new log
 */
router.post('/', async (req, res, next) => {
  try {
    const { level, msg, extra, url } = req.body as { level: Level; msg: string; extra?: unknown; url?: string };

    if (!level || !msg) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const { id } = await LogEvent.create<Partial<LogEventDocument>>({ user: req.userId, level, msg, extra, url });
    res.status(201).json({ code: MSG_ENUM.COMPLETED, id });
  } catch (error) {
    next(error);
  }
});

export default router;
