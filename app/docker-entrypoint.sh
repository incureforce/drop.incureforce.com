#!/bin/ash
su postgres -c "postgres -D /app/data" & node /app/app.js