FROM alpine

ADD app /app

RUN [ "/bin/ash", "/app/docker-entrypoint.sh", "bootstrap" ]

CMD [ "/bin/ash", "/app/docker-entrypoint.sh", "startup" ]
