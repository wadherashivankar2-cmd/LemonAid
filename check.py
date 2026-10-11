#!/usr/bin/env python3
"""
Unified audit and regression test runner for Mr.Roast.
Executes all linters, evaluations, smoke tests, and web builds in sequence.
Returns exit code 0 if and only if all checks pass.
"""

import os
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
API_DIR = ROOT_DIR / "api"
WEB_DIR = ROOT_DIR / "web"

# Detect Python interpreter
if sys.platform == "win32":
    VENV_PY = API_DIR / "venv" / "Scripts" / "python.exe"
else:
    VENV_PY = API_DIR / "venv" / "bin" / "python"

PYTHON_BIN = str(VENV_PY) if VENV_PY.exists() else sys.executable
NPM_BIN = "npm.cmd" if sys.platform == "win32" else "npm"


def run_step(step_name: str, cmd: list[str], cwd: Path) -> bool:
    print(f"\n==================================================")
    print(f"> STEP: {step_name}")
    print(f"  Command: {' '.join(cmd)}")
    print(f"  CWD:     {cwd}")
    print(f"==================================================")

    start = time.time()
    try:
        res = subprocess.run(cmd, cwd=cwd, check=False)
        duration = time.time() - start
        if res.returncode == 0:
            print(f"[PASS] {step_name} ({duration:.1f}s)")
            return True
        else:
            print(f"[FAIL] {step_name} with code {res.returncode} ({duration:.1f}s)", file=sys.stderr)
            return False
    except Exception as e:
        print(f"[ERROR] {step_name}: {e}", file=sys.stderr)
        return False


def main():
    print("Starting Mr.Roast Unified System Check...")
    start_total = time.time()

    steps = [
        ("1. Roast Bank Lint", [PYTHON_BIN, str(API_DIR / "lint_roasts.py")], ROOT_DIR),
        ("2. API Smoke Tests", [PYTHON_BIN, str(API_DIR / "smoke_test.py")], ROOT_DIR),
        ("3. Safety 200-Case Eval", [PYTHON_BIN, str(API_DIR / "safety_eval.py")], ROOT_DIR),
        ("4. Retrieval Eval Sweep", [PYTHON_BIN, str(API_DIR / "eval.py")], ROOT_DIR),
        ("5. Anti-Repetition 100-Request Test", [PYTHON_BIN, str(API_DIR / "repeat_test.py")], ROOT_DIR),
        ("6. Frontend ESLint Check", [NPM_BIN, "run", "lint"], WEB_DIR),
        ("7. Frontend Next.js Production Build", [NPM_BIN, "run", "build"], WEB_DIR),
    ]

    all_passed = True
    results = []

    for name, cmd, cwd in steps:
        ok = run_step(name, cmd, cwd)
        results.append((name, ok))
        if not ok:
            all_passed = False
            break

    total_time = time.time() - start_total
    print("\n" + "=" * 50)
    print("AUDIT SUMMARY")
    print("=" * 50)
    for name, ok in results:
        status = "[PASS]" if ok else "[FAIL]"
        print(f"{status:<8} | {name}")
    print("=" * 50)
    print(f"Total Time: {total_time:.1f}s")

    if all_passed:
        print("\nALL CHECKS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\nONE OR MORE CHECKS FAILED.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
