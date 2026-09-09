"""Exercise the actual browser script order, including broken startup paths."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CatalogueStartupTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js not installed; run startup tests in CI")
    def test_catalogue_startup(self):
        result = subprocess.run(
            ["node", "--test", "tests/catalog-startup.test.cjs"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
