FROM node:18-bullseye

WORKDIR /app

RUN apk --no-cache --no-check-certificate add curl

COPY package.json yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

RUN yarn prisma generate

# Command to run the application
# CMD ["yarn", "run", "start:migrate:prod"]
CMD ["tail", "-f", "/dev/null"]
