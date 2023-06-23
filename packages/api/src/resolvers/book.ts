/**
 * Resolver: Book
 *
 */

// TODO: addBookSchool, removeBookSchool

import type { Ctx } from '../apollo';
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
    book: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    books: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),

    isIsbnAvailable: async (_: unk, args: unk, { req }: Ctx): Promise<boolean> =>
      tryCatch(() => isIsbnAvailable(req, args)),
  },
  Mutation: {
    addBook: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addBookAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addAssignment(req, args)),
    addBookRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    addBookRevision: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRevision(req, args)),
    addBookRevisionImage: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRevisionImage(req, args)),
    addBookSupplement: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addSupplement(req, args)),
    removeBook: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    removeBookAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeAssignment(req, args)),
    removeBookRevision: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeRevision(req, args)),
    removeBookRevisionImage: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeRevisionImage(req, args)),
    removeBookSupplement: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeSupplement(req, args)),
    updateBook: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
