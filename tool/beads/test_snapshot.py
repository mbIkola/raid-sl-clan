"""Exercise snapshots against real Git repositories without GitHub access."""
import pathlib
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).with_name("snapshot.sh")


def git(*args):
    return subprocess.check_output(["git", *map(str, args)], stderr=subprocess.STDOUT, text=True).strip()


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.source = self.root / "source"
        git("init", self.source)
        git("-C", self.source, "config", "user.name", "Snapshot test")
        git("-C", self.source, "config", "user.email", "test@example.invalid")
        (self.source / "data").write_text("database chunks\n")
        git("-C", self.source, "add", "data")
        git("-C", self.source, "commit", "-m", "database state")
        self.commit = git("-C", self.source, "rev-parse", "HEAD")
        git("-C", self.source, "update-ref", "refs/dolt/data", self.commit)
        self.bundle = self.root / "snapshot.bundle"

    def snapshot(self):
        return subprocess.run(["bash", str(SCRIPT), str(self.source), str(self.bundle)], capture_output=True, text=True)

    def test_bundle_restores_without_original_remote(self):
        result = self.snapshot()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.source.rename(self.root / "unavailable-source")
        restored = self.root / "restored.git"
        git("init", "--bare", restored)
        git("-C", restored, "bundle", "verify", self.bundle)
        git("-C", restored, "fetch", self.bundle, "refs/dolt/data:refs/dolt/data")
        self.assertEqual(git("-C", restored, "rev-parse", "refs/dolt/data"), self.commit)
        self.assertEqual(git("-C", restored, "show", "refs/dolt/data:data"), "database chunks")
        checksum = self.bundle.with_suffix(".bundle.sha256").read_text()
        self.assertIn(self.bundle.name, checksum)

    def test_ref_absence_fails_without_publishing_bundle(self):
        git("-C", self.source, "update-ref", "-d", "refs/dolt/data")
        self.assertNotEqual(self.snapshot().returncode, 0)
        self.assertFalse(self.bundle.exists())

    def test_existing_snapshot_is_never_overwritten(self):
        self.bundle.write_text("previous backup")
        self.assertNotEqual(self.snapshot().returncode, 0)
        self.assertEqual(self.bundle.read_text(), "previous backup")


if __name__ == "__main__":
    unittest.main()
