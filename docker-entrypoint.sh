#!/bin/sh

set -eu

if [ "${NODE_ENV:-production}" = "production" ] && [ "${DB_SYNCHRONIZE:-false}" != "false" ]; then
  echo "Refusing to start: DB_SYNCHRONIZE must be false in production." >&2
  exit 1
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running pending database migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js
fi

exec node dist/src/main.js
