FROM alpine

RUN apk add npm nodejs postgresql

ADD app /app

RUN mkdir /app/data /run/postgresql
RUN chown postgres:postgres /app/data /run/postgresql
RUN chmod 700 /app/data
RUN su postgres -c "pg_ctl -D /app/data init"
RUN cd /app && npm install

CMD [ "/bin/ash", "/app/docker-entrypoint.sh" ]
