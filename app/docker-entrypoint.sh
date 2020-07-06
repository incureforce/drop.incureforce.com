#!/bin/ash

function bootstrap {
    echo bootstrap

    apk add npm nodejs postgresql

    mkdir /app/data /run/postgresql

    chown postgres:postgres /app/data /run/postgresql

    chmod 700 /app/data

    ( cd /app && npm install )

    su postgres -c "pg_ctl -D /app/data init"   &>/dev/null
}

function startup {
    echo startup

    su postgres -c "pg_ctl -D /app/data start"  &>/dev/null

    ( cd /app && node /app/app.js)

    su postgres -c "pg_ctl -D /app/data stop"   &>/dev/null
}

test "$1" = "bootstrap" && bootstrap && return
test "$1" = "startup" && startup && return
