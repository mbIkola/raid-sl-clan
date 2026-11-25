"""Bounded, retryable public HTTP downloads with a durable local cache."""

import gzip
import hashlib
from pathlib import Path
import threading
import time
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from catalog import atomic_bytes, now, read_json, write_json


class Downloader:
    def __init__(self, root, delay=0.35):
        self.root, self.delay = Path(root), delay
        self.lock, self.next_request = threading.Lock(), {}

    def get(self, url, refresh=False):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in {"rsl-x.gg", "hellhades.com", "assets.hellhades.com"}:
            raise ValueError(f"Unsupported source URL: {url}")
        key = hashlib.sha256(url.encode()).hexdigest()
        path = self.root / key
        compressed = path.with_suffix(".gz")
        if not refresh:
            if compressed.exists():
                return gzip.decompress(compressed.read_bytes())
            if path.exists():
                data = path.read_bytes()
                self.cache_body(path, data)
                return data
        for attempt in range(4):
            with self.lock:
                wait = max(0, self.next_request.get(parsed.hostname, 0) - time.monotonic())
                self.next_request[parsed.hostname] = time.monotonic() + wait + self.delay
            if wait:
                time.sleep(wait)
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LocalRaidCatalog/1.0)",
                                            "Accept-Encoding": "gzip"})
            try:
                with urlopen(request, timeout=45) as response:
                    data = response.read()
                    if response.headers.get("Content-Encoding") == "gzip":
                        data = gzip.decompress(data)
                if not data:
                    raise ValueError(f"Empty response: {url}")
                self.cache_body(path, data)
                write_json(path.with_suffix(".json"), {"url": url, "fetchedAt": now(),
                                                       "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
                return data
            except HTTPError as error:
                if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 3:
                    raise
                retry_after = error.headers.get("Retry-After", "")
                time.sleep(min(60, int(retry_after)) if retry_after.isdigit() else 2 ** (attempt + 1))
            except (OSError, TimeoutError):
                if attempt == 3:
                    raise
                time.sleep(2 ** (attempt + 1))
        raise RuntimeError(f"Download exhausted retries: {url}")

    @staticmethod
    def cache_body(path, data):
        compressed = path.with_suffix(".gz")
        if data.lstrip().lower().startswith((b"<!doctype html", b"<html", b"<?xml")):
            atomic_bytes(compressed, gzip.compress(data, compresslevel=3))
            path.unlink(missing_ok=True)
        else:
            atomic_bytes(path, data)
            compressed.unlink(missing_ok=True)

    def image(self, url, destination, refresh=False):
        destination = Path(destination)
        if destination.exists() and not refresh:
            validate_image(destination.read_bytes())
            return
        data = self.get(url, refresh=refresh)
        validate_image(data)
        atomic_bytes(destination, data)


def validate_image(data):
    if not (data.startswith(b"\x89PNG\r\n\x1a\n") or data.startswith(b"\xff\xd8\xff")
            or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")):
        raise ValueError("Response is not a PNG, JPEG or WebP image")
