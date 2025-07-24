FROM node:20-bullseye-slim as build

WORKDIR /home/node/app

COPY package.json yarn.lock .npmrc ./

ARG NPM_GITHUB_TOKEN
ENV NPM_GITHUB_TOKEN=${NPM_GITHUB_TOKEN}

RUN yarn install --frozen-lockfile --non-interactive --production --ignore-scripts

FROM node:20-alpine as runtime

WORKDIR /home/node/app
COPY --chown=node:node --from=build /home/node/app/node_modules ./node_modules
COPY --chown=node:node dist ./

USER node
CMD ["node", "--max-old-space-size=15000", "main"]