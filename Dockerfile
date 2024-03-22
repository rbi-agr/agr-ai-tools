FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn

COPY . .
COPY sample.env ./.env

RUN yarn build

RUN yarn prisma generate

# Command to run the application
CMD ["yarn", "run", "start:migrate:prod"]