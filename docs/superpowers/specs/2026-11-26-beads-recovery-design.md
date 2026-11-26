# Beads recovery and private GitHub backups

The user approved restoring the recovered database, immediate automatic pushes,
independent automatic snapshots, and a clean-directory recovery drill. They
selected a separate private repository after the public visibility of the code
repository was identified.

The recovered database contains 17 issues at schema v23. Preserve its original
Git transport as a self-contained bundle before migrating this single writer to
Beads 1.3.4 (schema v66). The authoritative remote becomes the private repository
`mbIkola/raid-sl-clan-beads`, using the user's existing GitHub SSH authentication.
No new tokens or plaintext credential files are needed locally.

Set `dolt.auto-push=true` and `dolt.auto-push-interval=1ns`: zero means the
upstream five-minute default, not immediate. Native auto-commit runs before
auto-push. Offline failures leave local data intact and emit a warning; a later
mutating command retries. Read-only commands do not retry. Only one machine may
write at a time; the embedded gate serializes processes in the same checkout.

The private repository runs a daily GitHub Actions job using its own scoped
`GITHUB_TOKEN`. It fetches `refs/dolt/data`, produces a self-contained Git bundle,
verifies its object graph, and uploads the bundle and SHA-256 checksum to a
uniquely tagged prerelease. No snapshots are automatically removed or replaced.
This is independent of the mutable Dolt ref, but shares the GitHub account and
provider. It is not protection against deletion of that account/repository.

Recovery must work both through `bd bootstrap` against the private remote and
through a downloaded bundle with the original remote unavailable. The latter
reconstitutes a local bare Git transport with a seed main branch, then bootstraps
a fresh Beads workspace. Compare complete issue exports before/after recovery.
The pre-migration snapshot is also retained. The old public Dolt ref is left
unchanged; removal requires a separate decision.
