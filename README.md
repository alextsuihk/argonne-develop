# argonne-monorepo

## Table of Contents

- [1.0 Introduction](#10-introduction)
  - [1.1 Comment & Error Reporting](#11-comment--error-reporting)
- [2.0 Software Requirement](#20-software-requirement)
  - [2.1 ES2020 & Node v.14](#21-es2020--node-v14)
  - [2.2 Microsoft VS Code Editor](#22-microsoft-vs-code-editor)
  - [2.3 Typescript](#23-typescript)
- [3.0 Configuration](#30-configuration)
- [4.0 Deployment](#40-deployment)
- [5.0 API Routes](#50-api-routes)
  - [5.1 domain](#51-domain)
  - [5.2 health](#52-health)
  - [5.3 message](#53-message)
  - [5.4 user](#54-user)
- [6.0 Development & Testing](#60-development--testing)
  - [6.1 Nodemon](#61-nodemon)
  - [6.2 Build & Run in production](#62-build--run-in-production)
  - [6.3 Problems console](#63-problems-console)
  - [6.4 Jest](#64-jest)
    - [6.4.1 Run from command line](#641-run-from-command-line)
    - [6.4.2 Integrated in VS code](#642-integrated-in-vs-code)
  - [6.5 ES-Lint (support Typescript)](#65-es-lint-support-typescript)
    - [6.5.1 Run from command line](#651-run-from-command-line)
    - [6.5.2 Integrated in VS code](#652-integrated-in-vs-code)
  - [6.6 Prettier](#66-prettier)
    - [6.6.1 Run from command line](#661-run-from-command-line)
    - [6.6.2 Integrated in VS code](#662-integrated-in-vs-code)

# 1.0 Introduction

The primary function of this application is to rely message (aka payload) to Socket clients from external server using HTTP-POST [refer to message.ts](src/routes/message.ts).

This application could support multi-tenant (domain) Socket.IO server. Each domain is independent from others (even with same userId), one domain could not affect another.

Please note that this socket server does not understand userId & message payload format. We rely the message from external server to socket client(s) transparently. In additional we support message re-sending once client is re-connecting.

## 1.1 Comment & Error Reporting

Comments are welcome. If you have found any mistake or improvement (lint, prettier, styling, code convention), please send me an email.
| Type | Email |
| ----------- | :--------------------------------------------------------------------------- |
| bug | [socket@alextsui.net](mailto:socket@alextsui.net?subject=Socket-Bugs) |
| improvement | [socket@alextsui.net](mailto:socket@alextsui.net?subject=Socket-Improvement) |
| comments | [socket@alextsui.net](mailto:socket@alextsui.net?subject=Socket-Comment) |

# 2.0 Software Requirement

## 2.1 ES2020 & Node v.14

**IMPORTANT !!!** The code has adopted ES2020. Therefore, Node v.14 is REQUIRED because usage of nullish coalescing,optional chaining & module namespace exports.

## 2.2 Microsoft VS Code Editor

VS Code is used with prettier & eslint integration. In addition to running 'yarn install'. You will need to install the following extension.

- code-spell-checker (optionally for English spell check)
- vscode-eslint
- vscode-jest
- vscode-typescript-tslint-plugin

## 2.3 Typescript

Regarding Typescript, I am using 3.9.2, but it should work with v.3.8.
For other software package requirement, please refer to [package.json](package.json)

# 3.0 Configuration

You will need to need to [src/env/config-sample.json](src/env/config.json)

# 4.0 Deployment

The application is deployed with docker + PM2. Please refer to [docker-compose](docker-compose.yml), [Dockerfile](Dockerfile), and [PM2 config](pm2.config.js).

Of course, you should be able run with PM2 only, or even raw using 'yarn start'

# 5.0 API Routes

## 5.1 [domain](src/routes/domain.ts)

- GET /api/domain : get a list of socket clients of the domain (with domain's api-key)

## 5.2 [health](src/routes/health.ts)

- GET /api/health : time measurements of socket client connection & sending message; and send test message to a fake user. **In order to Jest starting up the server with a random port, queryString (jestUrl) could be provided.**

## 5.3 [message](src/routes/message.ts)

- DELETE /api/message/;messageId : delete a pending (not yet sent) message (of the domain)
- POST /api/message : based on domain's api-key, rely (or buffer for re-send) message payload to socket(s) of an user.

## 5.4 [user](src/routes/user.ts)

- GET /api/user/:userId : get a list of user's socket clients & recent messages (of the domain)

# 6.0 Development & Testing

VS Code is the editor of choice, with support of spell-checking, Typescript, TS-Lint, Prettier.

## 6.1 Nodemon

```
 $ yarn dev
```

## 6.2 Build & Run in production

```
 $ yarn build
 $ yarn start
```

## 6.3 Problems console

![problem-console](docs/problem-console.png)

## 6.4 Jest

### 6.4.1 Run from command line

For detailed configuration, please refer to [package.json](package.json) & [jest.config.js](jest.config.js).

```
 $ yarn test
```

![Jest](docs/jest-command-line.png)

### 6.4.2 Integrated in VS code

VS Code integrated output console should report no error or warning
![Jest-VScode](docs/jest-vscode.png)

## 6.5 ES-Lint (support Typescript)

### 6.5.1 Run from command line

```
 $ yarn lint
 $ yarn lint:fix
```

![lint](docs/lint-command-line.png)

### 6.5.2 Integrated in VS code

VS Code integrated output console should report no error or warning
![lint-vscode](docs/lint-vscode.png)

## 6.6 Prettier

### 6.6.1 Run from command line

```
 $ yarn prettier:check
 $ yarn prettier:fix
```

![prettier](docs/prettier-fix.png)

### 6.6.2 Integrated in VS code

VS Code integrated output console should report no error or warning
![prettier-vscode](docs/prettier-vscode.png)
