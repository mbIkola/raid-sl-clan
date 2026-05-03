#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is not set. Export it before running this sync." >&2
  exit 1
fi

DB_NAME="${1:-raid-sl-clan}"
PERSIST_DIR="${2:-.wrangler/state/prod-snapshot}"
SNAPSHOT_DIR="${3:-.wrangler/d1-sync}"

case "$PERSIST_DIR" in
  .wrangler/*) ;;
  *)
    echo "Refusing to reset persist dir outside .wrangler/: $PERSIST_DIR" >&2
    exit 1
    ;;
esac

mkdir -p "$SNAPSHOT_DIR"
SNAPSHOT_PATH="$SNAPSHOT_DIR/prod-$(date +%Y%m%d-%H%M%S).sql"

echo "Exporting remote D1 database '$DB_NAME' to $SNAPSHOT_PATH"
pnpm exec wrangler d1 export "$DB_NAME" --remote --output "$SNAPSHOT_PATH" --skip-confirmation

echo "Resetting local persist dir $PERSIST_DIR"
rm -rf "$PERSIST_DIR"
mkdir -p "$PERSIST_DIR"

echo "Importing snapshot into local D1 ($PERSIST_DIR)"
pnpm exec wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --file "$SNAPSHOT_PATH" --yes

echo "Verifying imported tables"
pnpm exec wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo "Sync complete."
echo "Snapshot: $SNAPSHOT_PATH"
echo "Persist:  $PERSIST_DIR"
