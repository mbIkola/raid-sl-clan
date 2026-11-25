"""Optional OpenAI Agents SDK adapter. The CLI itself has no SDK dependency."""

import asyncio
import json
from pathlib import Path
import sys
from typing import Literal


class CatalogProcess:
    def __init__(self, catalog_dir, cli_path=None, metadata_path=None, timeout=15):
        self.catalog = Path(catalog_dir).resolve()
        self.cli = Path(cli_path).resolve() if cli_path else Path(__file__).with_name("raid-catalog").resolve()
        self.metadata = Path(metadata_path).resolve() if metadata_path else None
        self.timeout = timeout

    async def call(self, command, *arguments):
        if command not in {"get_character", "search_characters", "get_masteries"}:
            raise ValueError("Unsupported catalogue command")
        argv = [sys.executable, str(self.cli), "--catalog", str(self.catalog)]
        if self.metadata:
            argv.extend(["--metadata", str(self.metadata)])
        process = await asyncio.create_subprocess_exec(*argv, command, *arguments,
                                                       stdout=asyncio.subprocess.PIPE,
                                                       stderr=asyncio.subprocess.PIPE)
        try:
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=self.timeout)
        except BaseException:
            if process.returncode is None:
                process.kill()
            await process.communicate()
            raise
        try:
            response = json.loads(stdout)
            if (not isinstance(response, dict) or response.get("schema_version") != 1
                    or type(response.get("ok")) is not bool
                    or response["ok"] != (process.returncode == 0)
                    or ("data" if response["ok"] else "error") not in response):
                raise ValueError("Envelope/exit status mismatch")
        except (ValueError, UnicodeError) as error:
            raise RuntimeError("Catalogue CLI returned an invalid protocol response") from error
        return stdout.decode("utf-8").strip()


def create_catalog_tools(catalog_dir: str, cli_path: str | None = None, metadata_path: str | None = None):
    """Call from the consuming app, which supplies its own openai-agents dependency."""
    from agents import function_tool

    client = CatalogProcess(catalog_dir, cli_path, metadata_path)

    @function_tool
    async def get_character(character: str) -> str:
        """Get a RAID character by stable character_id, exact name or known alias."""
        return await client.call("get_character", "--", character)

    @function_tool
    async def search_characters(query: str = "", limit: int = 20, offset: int = 0) -> str:
        """Search RAID character names and aliases. Use an exact character_id to disambiguate results."""
        return await client.call("search_characters", "--limit", str(limit), "--offset", str(offset), "--", query)

    @function_tool
    async def get_masteries(character: str, mode: Literal["all", "pve", "pvp"] = "all",
                            include_unvalidated: bool = False) -> str:
        """Get recommended RAID masteries and their definitions. Unvalidated source builds are excluded by default."""
        flags = ["--include-unvalidated"] if include_unvalidated else []
        return await client.call("get_masteries", "--mode", mode, *flags, "--", character)

    return [get_character, search_characters, get_masteries]
