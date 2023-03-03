import { ApolloError, AuthenticationError } from 'apollo-server-express';

import type { Ctx } from '../apollo';
import commonController from '../controllers/common';

type unk = unknown;

export const tryCatch = async <T>(fn: () => Promise<T>, authError = false): Promise<T> => {
  try {
    const result = await fn(); //! keep "await" to allow catch block
    return result;
  } catch (error) {
    if (error instanceof Error) throw error;

    const { code, statusCode } = error as { code: string; statusCode: number };
    if (!code || !statusCode || typeof code !== 'string' || typeof statusCode !== 'number')
      new ApolloError('error format error');

    throw authError
      ? new AuthenticationError(`MSG_CODE#${code}`)
      : new ApolloError(`MSG_CODE#${code}`, undefined, { errorCode: code, statusCode });
  }
};

export default {
  Query: {
    content: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => commonController.findContent(req, args)),

    // content(id: ID!, token: String!, updateAfter: DateInput): Content
  },
  Mutation: {},
};
