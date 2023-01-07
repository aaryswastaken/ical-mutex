FROM node:18

WORKDIR /usr/src/ical-mutex

COPY ./package.json .

RUN npm install

COPY ./index.js .

CMD [ "node", "index.js" ]
