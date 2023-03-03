module.exports = {
  root: true, // prevent ESLint to search parent folder for config file

  env: {
    es2022: true,
    browser: true,
    // amd: true,
    node: true,
    jest: true,
  },

  parser: '@typescript-eslint/parser',

  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // Make sure this is always the last element in the array.
    // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ['simple-import-sort', 'react', 'react-hooks', '@typescript-eslint', 'prettier'],

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  // https://github.com/jsx-eslint/eslint-plugin-react#configuration
  // settings: {
  //   react: {
  //     version: 'detect',
  //   },
  // },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },

  rules: {
    // 'arrow-parens': ['error', 'as-needed'],
    // 'jsdoc/require-jsdoc': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_|res|next|^err' }],
    'jsx-a11y/accessible-emoji': 'off',
    'no-console': 'error',
    'no-return-await': 'warn',
    'no-trailing-spaces': 'warn',
    'no-useless-return': 'warn',
    'prefer-destructuring': 'warn',
    'prefer-template': 'warn',
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    // 'react-hooks/rules-of-hooks': 'error',
    // 'react-hooks/exhaustive-deps': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
  },
};
