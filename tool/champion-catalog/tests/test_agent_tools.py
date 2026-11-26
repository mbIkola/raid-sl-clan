import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_reader import seed
from agent_sdk_tools import CatalogProcess, create_catalog_tools


class AgentToolsTest(unittest.IsolatedAsyncioTestCase):
    async def test_subprocess_bridge_returns_structured_errors_without_shell_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            seed(root)
            client = CatalogProcess(root)
            result = json.loads(await client.call("get_character", "--", "Ronda; touch injected"))
            self.assertEqual(result["error"]["code"], "CHARACTER_NOT_FOUND")
            self.assertFalse((root / "injected").exists())
            with self.assertRaises(ValueError):
                await client.call("arbitrary-command")

    async def test_sdk_factory_tools_use_the_cli_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            seed(root)
            # Exercise actual handlers and subprocesses without installing SDK in this repo.
            # SDK decoration/schema extraction is verified in the consuming application.
            with patch.dict(sys.modules, {"agents": SimpleNamespace(function_tool=lambda function: function)}):
                tools = {function.__name__: function for function in create_catalog_tools(str(root))}
            character = json.loads(await tools["get_character"]("Ronda"))
            self.assertEqual(character["data"]["character_id"], "raid:7360")
            masteries = json.loads(await tools["get_masteries"]("Ronda", "pve"))
            self.assertEqual(masteries["data"]["builds"][0]["mode"], "pve")
            search = json.loads(await tools["search_characters"]("Alu"))
            self.assertEqual(search["data"]["total"], 1)


if __name__ == "__main__":
    unittest.main()
