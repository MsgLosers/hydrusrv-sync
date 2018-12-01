FROM mhart/alpine-node:11

RUN apk --update add build-base python

RUN wget https://github.com/aptible/supercronic/releases/download/v0.1.6/supercronic-linux-amd64 \
  && cp supercronic-linux-amd64 /usr/local/bin/supercronic \
  && chmod +x /usr/local/bin/supercronic \
  && rm -f supercronic-linux-amd64

ARG HOST_USER_ID=1000
ARG HOST_GROUP_ID=1000

ENV HOST_USER_ID=$HOST_USER_ID
ENV HOST_GROUP_ID=$HOST_GROUP_ID

RUN \
  if [ $(getent group ${HOST_GROUP_ID}) ]; then \
    adduser -D -u ${HOST_USER_ID} hydrus; \
  else \
    addgroup -g ${HOST_GROUP_ID} hydrus && \
    adduser -D -u ${HOST_USER_ID} -G hydrus hydrus; \
  fi

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . .
COPY .docker/crontab crontab

RUN chown -R hydrus:hydrus /usr/src/app

RUN mkdir /data && chown -R hydrus:hydrus /data

COPY .docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

USER hydrus

ENTRYPOINT ["docker-entrypoint"]
