import { LOCALE } from '@argonne/common';
import { GraphQLError } from 'graphql';

const { MSG_ENUM } = LOCALE;

export const tryCatch = async <T>(fn: () => Promise<T>, authError = false): Promise<T> => {
  try {
    const result = await fn(); //! keep "await" within try-catch block
    return result;
  } catch (error) {
    // if (error instanceof Error) throw error;
    if (error instanceof Error) {
      throw error.name === 'ValidationError'
        ? new GraphQLError(`MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}#${error.message}`, {
            extensions: { code: MSG_ENUM.USER_INPUT_ERROR },
          })
        : new GraphQLError(error.message, { extensions: { code: MSG_ENUM.GENERAL_ERROR } });
    }

    const { code, statusCode, message } = error as { code: string; statusCode: number; message?: string };
    if (!code || !statusCode || typeof code !== 'string' || typeof statusCode !== 'number')
      throw new GraphQLError('Unable to read ErrorFormat', { extensions: { code: MSG_ENUM.GENERAL_ERROR } });

    const msg = message ? `MSG_CODE#${code}#${message}` : `MSG_CODE#${code}`;
    throw new GraphQLError(msg, { extensions: { code: authError ? 'UNAUTHENTICATED' : code } });
  }
};

export default {
  Query: {},
  Mutation: {},
};
