#!/bin/sh
set -e

echo "Running database migrations..."
yarn prisma:migrate

echo "Starting bot..."
exec node dist/index.js
