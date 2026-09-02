from pathlib import Path
import tempfile
import unittest

from scripts.code_quality_guard import scan_python, scan_text_rules

POLICY = {
    "rules": {"max_source_file_lines": 600, "max_python_function_lines": 80},
    "fallback_sensitive_globs": ["**/domain/**"],
}

class AntiSlopRuleTests(unittest.TestCase):
    def test_python_any_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.py"
            path.write_text("from typing import Any\ndef f(value: Any) -> Any:\n    return value\n", encoding="utf-8")
            codes = {finding.code for finding in scan_python(path, "src/sample.py", POLICY)}
            self.assertIn("QG-PY-ANY", codes)

    def test_swallowed_exception_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.py"
            path.write_text("def f() -> None:\n    try:\n        raise ValueError('x')\n    except ValueError:\n        pass\n", encoding="utf-8")
            codes = {finding.code for finding in scan_python(path, "src/sample.py", POLICY)}
            self.assertIn("QG-PY-SWALLOWED-EXCEPTION", codes)

    def test_typescript_any_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.ts"
            path.write_text("export const parse = (value: any) => value;\n", encoding="utf-8")
            codes = {finding.code for finding in scan_text_rules(path, "src/sample.ts", POLICY)}
            self.assertIn("QG-TS-ANY", codes)

if __name__ == "__main__":
    unittest.main()
