import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'http://127.0.0.1:4000/graphql',
  documents: '../api/src/queries/*.ts',
  generates: {
    './src/__generated__/graphql.ts': {
      // preset: 'client',
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
};

export default config;
