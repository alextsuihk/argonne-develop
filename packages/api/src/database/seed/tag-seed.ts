/**
 * Seeder: Tag
 *
 * ! note: descriptions is copied from stack overflow https://stackoverflow.com/
 */

import chalk from 'chalk';

import type { TagDocument } from '../../models/tag';
import Tag from '../../models/tag';

const seed = async (): Promise<string> => {
  const tags: Partial<TagDocument>[] = [
    {
      name: { enUS: 'docker', zhHK: 'docker', zhCN: 'docker' },
      description: {
        enUS: 'Docker is a tool to build and run containers. Questions concerning Dockerfiles, Docker Compose, and architecture are accepted, but Stack Overflow questions must be programming-related.',
        zhHK: 'Docker CHT TODO',
        zhCN: 'Docker CHS TODO',
      },
    },
    {
      name: { enUS: 'javascript', zhHK: 'javascript', zhCN: 'javascript' },
      description: {
        enUS: 'ECMAScript (JavaScript/JS). Note JavaScript is NOT the same as Java! Please also reference to [node.js], [reactjs], etc',
        zhHK: 'Javascript CHT TODO',
        zhCN: 'Javascript CHS TODO',
      },
    },
    {
      name: { enUS: 'linux', zhHK: 'linux', zhCN: 'linux' },
      description: {
        enUS: 'Linux ',
        zhHK: 'Linux CHT TODO',
        zhCN: 'Linux CHS TODO',
      },
    },
    {
      name: { enUS: 'mongodb', zhHK: 'mongodb', zhCN: 'mongodb' },
      description: {
        enUS: 'MongoDB is a scalable, high-performance, open source, document-oriented NoSQL database. It supports a large number of languages and application development platforms.',
        zhHK: 'MongoDB CHT TODO',
        zhCN: 'MongoDB CHS TODO',
      },
    },
    {
      name: { enUS: 'mongoose', zhHK: 'mongoose', zhCN: 'mongoose' },
      description: {
        enUS: 'Mongoose is a MongoDB object modeling tool, or ODM (Object Document Mapper), written in JavaScript and designed to work in an asynchronous environment.',
        zhHK: 'Mongoose CHT TODO',
        zhCN: 'Mongoose CHS TODO',
      },
    },
    {
      name: { enUS: 'php', zhHK: 'php', zhCN: 'php' },
      description: {
        enUS: 'PHP is a widely used, open source, general-purpose, multi-paradigm, dynamically typed and interpreted scripting language originally designed for server-side web development.',
        zhHK: 'PHP CHT TODO',
        zhCN: 'PHP CHS TODO',
      },
    },
    {
      name: { enUS: 'python', zhHK: 'python', zhCN: 'python' },
      description: {
        enUS: 'Python is a multi-paradigm, dynamically typed, multi-purpose programming language. It is designed to be quick to learn, understand, and use, and enforces a clean and uniform syntax. Please note that Python 2 is officially out of support as of 01-01-2020. Still, for version-specific Python questions, add the [python-2.7] or [python-3.x] tag. When using a Python variant (e.g., Jython, PyPy) or library (e.g., Pandas and NumPy), please include it in the tags.',
        zhHK: 'Python CHT TODO',
        zhCN: 'Python CHS TODO',
      },
    },
    {
      name: { enUS: 'reactjs', zhHK: 'reactjs', zhCN: 'reactjs' },
      description: {
        enUS: 'React is a JavaScript library for building user interfaces. It uses a declarative, component-based paradigm and aims to be both efficient and flexible.',
        zhHK: 'React CHT TODO',
        zhCN: 'React CHS TODO',
      },
    },
    {
      name: { enUS: 'typescript', zhHK: 'typescript', zhCN: 'typescript' },
      description: {
        enUS: 'TypeScript is a typed superset of JavaScript that transpiles to plain JavaScript. It adds optional types, classes, interfaces, and modules to JavaScript. This tag is for questions specific to TypeScript. It is not used for general JavaScript questions.',
        zhHK: 'TypeScript CHT TODO',
        zhCN: 'TypeScript CHS TODO',
      },
    },
  ];

  await Tag.insertMany<Partial<TagDocument>>(tags, { includeResultMetadata: true });
  return `(${chalk.green(tags.length)} created)`;
};

export { seed };
