FROM node:18-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y curl

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

RUN yarn prisma generate

CMD ["yarn", "run", "start:migrate:prod"]