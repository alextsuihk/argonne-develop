/**
 * Resolver: Book
 *
 */

// TODO: addBookSchool, removeBookSchool

import type { ApolloContext } from '../server';
import bookController from '../controllers/book';
import { tryCatch } from './root';

type unk = unknown;

const {
  addAssignment,
  addRemark,
  addRevision,
  addRevisionImage,
  addSupplement,
  create,
  find,
  findOne,
  isIsbnAvailable,
  remove,
  removeAssignment,
  removeRevision,
  removeRevisionImage,
  removeSupplement,
  update,
} = bookController;

export default {
  Query: {
    book: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    books: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),

    isIsbnAvailable: async (_: unk, args: unk, { req }: ApolloContext): Promise<boolean> =>
      tryCatch(() => isIsbnAvailable(req, args)),
  },
  Mutation: {
    addBook: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addBookAssignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addAssignment(req, args)),
    addBookRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    addBookRevision: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRevision(req, args)),
    addBookRevisionImage: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => addRevisionImage(req, args)),
    addBookSupplement: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addSupplement(req, args)),
    removeBook: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    removeBookAssignment: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => removeAssignment(req, args)),
    removeBookRevision: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => removeRevision(req, args)),
    removeBookRevisionImage: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => removeRevisionImage(req, args)),
    removeBookSupplement: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => removeSupplement(req, args)),
    updateBook: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
