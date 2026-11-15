#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

if [ ! -f .env ]; then
  printf '%s\n' 'Missing .env. Copy .env.example to .env and configure it first.' >&2
  exit 1
fi

docker compose up postgres -d
exec pnpm dev
