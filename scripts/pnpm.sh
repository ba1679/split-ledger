#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -x "$ROOT/.cache/toolchain/node/bin/node" ]; then
  PATH="$ROOT/.cache/toolchain/node/bin:$PATH"
fi
if [ -f "$ROOT/.cache/toolchain/pnpm/node_modules/pnpm/bin/pnpm.cjs" ]; then
  exec node "$ROOT/.cache/toolchain/pnpm/node_modules/pnpm/bin/pnpm.cjs" "$@"
fi
exec pnpm "$@"
