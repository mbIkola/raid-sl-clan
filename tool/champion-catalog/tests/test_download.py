from io import BytesIO
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from download import Downloader


class DownloadTest(unittest.TestCase):
    def test_html_cache_is_compressed_and_can_be_reused_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            downloader = Downloader(directory, delay=0)
            data = b"<!DOCTYPE html><html>" + b"reference data " * 1000 + b"</html>"
            response = BytesIO(data)
            response.headers = {}
            with patch("download.urlopen", return_value=response):
                self.assertEqual(downloader.get("https://hellhades.com/raid/champions/ronda/"), data)
            compressed = list(Path(directory).glob("*.gz"))
            self.assertEqual(len(compressed), 1)
            self.assertLess(compressed[0].stat().st_size, len(data))
            with patch("download.urlopen", side_effect=AssertionError("unexpected network")):
                self.assertEqual(downloader.get("https://hellhades.com/raid/champions/ronda/"), data)

    def test_failed_image_refresh_retains_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "portrait.webp"
            previous = b"RIFF\x04\x00\x00\x00WEBPvalid-old-image"
            image.write_bytes(previous)
            downloader = Downloader(root / "cache", delay=0)
            with patch.object(downloader, "get", return_value=b"<html>error</html>"):
                with self.assertRaises(ValueError):
                    downloader.image("https://rsl-x.gg/portrait.webp", image, refresh=True)
            self.assertEqual(image.read_bytes(), previous)

    def test_disallowed_source_url_is_rejected_before_network(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                Downloader(directory).get("http://localhost/private")


if __name__ == "__main__":
    unittest.main()
