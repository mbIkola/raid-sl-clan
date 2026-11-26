#!/usr/bin/env bash
# A self-contained copy of Dolt's Git transport, independent of the live ref.
set -euo pipefail

if [[ $# != 2 ]]; then
  echo "Usage: bash tool/beads/snapshot.sh <git-remote> <output.bundle>" >&2
  exit 2
fi
remote=$1
output=$2
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd)/$(basename "$output")"
if [[ -e "$output" || -e "$output.sha256" ]]; then
  echo "Refusing to overwrite an existing snapshot: $output" >&2
  exit 1
fi
scratch=$(mktemp -d "$(dirname "$output")/.beads-snapshot.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
git init --bare --quiet "$scratch/source.git"
git -C "$scratch/source.git" fetch --quiet --no-tags -- "$remote" refs/dolt/data:refs/dolt/data
git -C "$scratch/source.git" fsck --full --no-reflogs --no-dangling
git -C "$scratch/source.git" bundle create "$scratch/snapshot.bundle" refs/dolt/data
git -C "$scratch/source.git" bundle verify "$scratch/snapshot.bundle"
digest=$(shasum -a 256 "$scratch/snapshot.bundle" | cut -d ' ' -f 1)
printf '%s  %s\n' "$digest" "$(basename "$output")" > "$scratch/snapshot.sha256"
# Hard links publish without overwriting an existing file, even in a race.
ln "$scratch/snapshot.bundle" "$output"
ln "$scratch/snapshot.sha256" "$output.sha256"
git -C "$scratch/source.git" rev-parse refs/dolt/data
