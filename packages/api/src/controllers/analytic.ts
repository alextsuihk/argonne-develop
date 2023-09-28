/**
 * Controller: Analytics
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';

import type { SessionAnalyticDocument } from '../models/analytic/session';
import SessionAnalytic from '../models/analytic/session';
import type { StatusResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { auth } = common;
const { analyticSessionSchema } = yupSchema;

const session = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { ip, ua } = req;

  const { fullscreen, token, coordinates } = await analyticSessionSchema.validate(args);

  await SessionAnalytic.create<Partial<SessionAnalyticDocument>>({
    user: userId,
    fullscreen,
    token,
    ua,
    ip,
    ...(coordinates && { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] }),
  });
  return { code: MSG_ENUM.COMPLETED };
};

const createNew: RequestHandler<{ task: string }> = async (req, res, next) => {
  const { task } = req.params;
  try {
    switch (task) {
      case 'session':
        return res.status(201).json(await session(req, req.body));

      default:
        return next({ statusCode: 404 });
    }
  } catch (error) {
    next(error);
  }
};

export default { createNew, session };
