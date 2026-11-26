# Beads: private sync and disaster recovery

## Storage and normal operation

Use Beads **1.3.4** for this database. It was recovered from 17 original issues
on 2026-11-26 and migrated once from schema v23 to v66. Other machines must
bootstrap from the migrated remote, not independently migrate the old database.

The authoritative database lives at
<https://github.com/mbIkola/raid-sl-clan-beads> (**private**), under
`refs/dolt/data`. Source code lives in the separate public `raid-sl-clan` repo.
Do not point database sync at the public code origin. Existing GitHub SSH access
is used; do not export tokens or create dotenv files.

`.beads/config.yaml` enables native auto-commit and auto-push after mutating
commands. The `1ns` push interval removes throttling; `0` would restore upstream's
five-minute delay. `bd list`, `show`, and other read-only commands do not push.
`--sandbox`, `--readonly`, or environment overrides can disable automatic writes.

Only one computer may write to this Git transport at a time. Processes sharing
one embedded database are serialized by Beads' workspace gate; independent
clones are not. Pull before taking over on another computer. Never force-push a
divergent database or independently migrate multiple copies.

If offline, the task mutation is retained locally. Native auto-push warns on
stderr but can still exit successfully (and may suppress the warning in JSON or
quiet mode). Treat a successful task update as local success, not proof of a
remote backup. Retry with `bd dolt push` once online, or another mutating command.
Check `bd dolt remote list` when diagnosing destination mistakes. No tool can
upload work from a destroyed machine that was offline before the upload.

## Set up a new computer from the live database

```bash
brew install beads
bd --version                       # this database was validated with 1.3.4
git clone git@github.com:mbIkola/raid-sl-clan.git
cd raid-sl-clan
# Use a source revision containing the private sync configuration.
bd bootstrap --yes
bd list --all
bd dolt remote list                # must point to raid-sl-clan-beads
bd hooks install --beads
```

If using an older code revision without the private configuration, explicitly
select the private remote during bootstrap:

```bash
BD_SYNC_REMOTE=git+ssh://git@github.com/mbIkola/raid-sl-clan-beads.git bd bootstrap --yes
```

Do not run `bd init --force` or `bd migrate --force` on a new computer to work
around a failed bootstrap. First inspect the destination and CLI version.

## Independent scheduled snapshots

The private repository's `Beads recovery snapshot` GitHub Actions workflow runs
daily at **03:17 UTC**, and supports manual dispatch. It needs only that private
repository's automatically issued `GITHUB_TOKEN` with `contents: write`.
No PAT or cross-repository credential is stored in either repository.

Each successful run creates a new prerelease with a self-contained `.bundle`
and `.bundle.sha256`. Snapshots include all Git objects reachable from the Dolt
transport ref, including its uploaded database state and history. They do not
include unpushed local changes. A local uncommitted Dolt working set must first
be committed and pushed to be captured.

Snapshots have unique tags and **no automatic deletion or expiry**. Unlike CI
artifacts, Release assets do not use an artifact retention window. GitHub may
delay scheduled jobs; an exact daily recovery point is not guaranteed. Failed
runs appear as failures in Actions and use normal GitHub notification settings.
Scheduled workflows in inactive public repos may be disabled; this repo is
private. Repository/account deletion still affects both live data and snapshots.
For protection against GitHub/account loss, periodically copy a bundle to another
provider or offline storage.

The workflow and snapshot tool are maintained in `tool/beads/` in the code repo;
deploy them to `.github/workflows/snapshot.yml` and `tool/beads/` on the **private
repository's default branch**. Updating the template alone does not deploy it.

```bash
gh workflow run snapshot.yml --repo mbIkola/raid-sl-clan-beads
gh run list --repo mbIkola/raid-sl-clan-beads --workflow snapshot.yml --limit 5
gh release list --repo mbIkola/raid-sl-clan-beads
```

## Recover from a snapshot without the live database

Work in a **new directory**, never over the current working database. Replace
`SNAPSHOT_TAG` with a tag from the private Releases page.

```bash
recovery_dir=$(mktemp -d)
gh release download SNAPSHOT_TAG --repo mbIkola/raid-sl-clan-beads \
  --pattern '*.bundle*' --dir "$recovery_dir"
cd "$recovery_dir"
shasum -a 256 -c ./*.sha256
bundle=$(find "$recovery_dir" -maxdepth 1 -name '*.bundle' -print)
git init --bare transport.git
git -C transport.git bundle verify "$bundle"
git -C transport.git fetch "$bundle" refs/dolt/data:refs/dolt/data
# Dolt's Git transport requires a normal branch as well as its data ref.
git -C transport.git update-ref refs/heads/main refs/dolt/data
git -C transport.git symbolic-ref HEAD refs/heads/main

git clone git@github.com:mbIkola/raid-sl-clan.git workspace
cd workspace
BD_SYNC_REMOTE="git+file://$recovery_dir/transport.git" \
  BD_DOLT_AUTO_PUSH=false bd bootstrap --yes
bd --sandbox list --all
bd --sandbox export --output "$recovery_dir/recovered-issues.jsonl"
```

This restores against a local Git transport, without reading or writing the live
database. Verify issue identities, comments, dependencies and counts before
promoting it. An old pre-migration snapshot requires its matching old CLI or one
designated migrator; do not migrate it and push into a healthy current database.

To resume after an actual loss of the live remote, initialize a new **private**
repository with a main branch, use `bd --sandbox dolt remote remove origin` and
`bd --sandbox dolt remote add origin git+ssh://git@github.com/OWNER/NEW-REPO.git`,
then explicitly `bd dolt push`. Update the source sync URL and deploy the snapshot
workflow in that new repo. Do not overwrite a healthy remote to test recovery.

## Verification and legacy public copy

```bash
python3 -m unittest discover -s tool/beads -p 'test_*.py'
```

On 2026-11-26 the original public `raid-sl-clan` repository also contained a Dolt
ref. Migration to private storage does not revoke access to data already public.
The old ref is not updated by this setup and was not deleted automatically.
Deleting that ref or removing sensitive history requires a separate decision.
