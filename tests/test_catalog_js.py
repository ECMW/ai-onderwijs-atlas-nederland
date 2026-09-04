"""Run dependency-free catalogue JavaScript regressions when Node.js is available."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CatalogueJavaScriptTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js not installed; run JS tests in CI")
    def test_catalogue_interactions(self):
        result = subprocess.run(
            ["node", "--test", "tests/catalog-ui.test.cjs"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
