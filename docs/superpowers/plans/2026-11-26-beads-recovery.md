# Beads recovery implementation plan

Approved design: `docs/superpowers/specs/2026-11-26-beads-recovery-design.md`.
Track execution and follow-ups in Beads issue `raid-sl-clan-vot`.

## Restore and preserve

Save the old `refs/dolt/data` to a standalone bundle. Restore with `bd bootstrap`,
designate this machine as the only schema migrator, run `bd --sandbox migrate
--force --yes`, and verify that all 17 original issue identities remain present.

## Configure private transport

Create the approved private repository, seed its main branch with the recovery
runbook, snapshot tool, tests and workflow, and move the database's origin remote
to its `git+ssh` URL. Publish the database, then enable immediate auto-push in the
code repository's `.beads/config.yaml`. Install versioned Beads hooks without
losing Git LFS hooks. Verify a task update reaches a fresh clone automatically.

## Independent snapshots

Test the snapshot tool against real temporary Git repositories: it must restore
without the original source, fail if the Dolt ref is missing, and refuse to
overwrite a prior snapshot. Run it before/after migration and publish those
bundles privately. Install and trigger the daily workflow in the private repo.
Verify the published asset by downloading it and checking its SHA-256 checksum.

## Recovery and delivery

Recover the downloaded bundle to a clean local Git transport and bootstrap a new
workspace from it. Compare full issue exports with the original workspace.
Document outage behavior, retry, retention and bootstrap in the operator runbook
and AGENTS.md without modifying the managed Beads workflow block. Run snapshot
tests and the repository's baseline validation gate. Review, close the issue,
push source and database changes, and verify GitHub Actions and clean Git state.
