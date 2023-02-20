FROM node:18-alpine

RUN apk add --no-cache rsync python3 py3-pip

RUN pip3 install stickytape

RUN npm i --location=global pnpm

COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
