# TODO: (1) build common, (2) build react, then (3) copy react client to app-server, then (4) build app-server

## Docker Best Practice: https://snyk.io/wp-content/uploads/10-best-practices-to-containerize-Node.js-web-applications-with-Docker.pdf
# Snyk Best Practice: https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
# Best Practice: https://snyk.io/wp-content/uploads/10-best-practices-to-containerize-Node.js-web-applications-with-Docker.pdf


# TODO: snky (npm install -g snyk && snky auth && snky container test )

# TODO: use multi-stage: 1st stage is to build with npm install & npm test,  2nd stage is to "re-build" for production (with npm ci --only=production)
# TODO: implement healthcheck 

FROM node:latest AS build

LABEL edition="app-only"
LABEL author="Inspire.HK <argonne@inspire.hk>"
LABEL description="This docker image only includes Express app, relying external services such as minio, mongo, nginx (serving React assets), redis, ... etc"

# NODE_ENV is defined in pm2.config.js or package.json
ENV NODE_ENV production

WORKDIR /argonne

COPY --chown=node:node package*.json .

RUN npm ci --only=production && npm build \
    && chown -R node:node /argonne

### TODO: copy react assets to express /asset folder
# switch to node user
USER node


FROM node:lts-alpine


# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)


COPY --chown=node:node . .

# build common
# build react
# build express

COPY ./packages/client-web/build /argonne/assets


# TODO: npm ci (disable husky)  https://typicode.github.io/husky/#/?id=disable-husky-in-cidockerprod

RUN apk add --update --no-cache dumb-init && npm install && npm build \
    && chown -R node:node /app

EXPOSE 4000


# CMD pm2-runtime start pm2.config.js --env PRODUCTION
CMD ["dumb-init", "pm2-runtime", "start",  "pm2.config.js"]


## WIP: from React
# FROM node:12-alpine AS builder

# WORKDIR /usr/src/app

# COPY package*.json ./

# RUN npm ci

# COPY . .

# RUN npm run build

# FROM nginx:alpine

# COPY --from=builder /usr/src/app/dist/ /usr/share/nginx/html

# COPY proxy.conf /etc/nginx/conf.d/default.conf
