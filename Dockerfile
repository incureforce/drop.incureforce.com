FROM alpine

RUN apk add npm nodejs postgresql

ADD app /app

RUN mkdir /app/data
RUN chown postgres:postgres /app/data
RUN chmod 700 /app/data
RUN su postgres -c "pg_ctl -D /app/data init"
RUN cd /app && npm install

CMD [ "/app/docker-entrypoint.sh" ]
