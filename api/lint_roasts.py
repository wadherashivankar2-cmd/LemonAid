#!/usr/bin/env python3
"""
Lint validation script for Mr.Roast roast banks.
Enforces schema validity, character limits, anchor minimums, slot symmetry,
blocklist non-containment, and pairwise text deduplication.
"""

import json
import os
import re
import sys
from pathlib import Path

VALID_CATEGORIES = {
    "career", "placements", "academics", "fitness", "dating", "money",
    "productivity", "tech", "hackathons", "social", "food", "travel", "generic"
}
VALID_SLOTS = {"org", "amount", "distance", "grade", "num"}
VALID_STATUSES = {"draft", "approved", "cut"}
VALID_TONES = {"deadpan", "witty", "sarcastic"}


def load_blocklist(filepath: Path) -> list[str]:
    if not filepath.exists():
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        lines = [line.strip().lower() for line in f if line.strip() and not line.startswith("#")]
    return lines


def jaccard_similarity(text1: str, text2: str) -> float:
    words1 = set(re.findall(r"\w+", text1.lower()))
    words2 = set(re.findall(r"\w+", text2.lower()))
    if not words1 or not words2:
        return 0.0
    return len(words1 & words2) / len(words1 | words2)


def lint_roasts(file_path: Path, blocklist: list[str]) -> tuple[int, int]:
    print(f"Linting roast bank: {file_path}")
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        return 1, 0

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR: Invalid JSON: {e}", file=sys.stderr)
        return 1, 0

    if not isinstance(data, list):
        print("ERROR: Root JSON element must be an array of roast objects", file=sys.stderr)
        return 1, 0

    errors = 0
    warnings = 0
    seen_ids = set()
    roast_texts = []

    for idx, item in enumerate(data):
        prefix = f"Item #{idx}"
        if not isinstance(item, dict):
            print(f"ERROR {prefix}: Not a dictionary object")
            errors += 1
            continue

        item_id = item.get("id")
        prefix = f"Roast '{item_id or f'#{idx}'}'"

        # 1. ID check
        if not item_id or not isinstance(item_id, str):
            print(f"ERROR {prefix}: Missing or invalid 'id'")
            errors += 1
        elif item_id in seen_ids:
            print(f"ERROR {prefix}: Duplicate id '{item_id}'")
            errors += 1
        else:
            seen_ids.add(item_id)

        # 2. Category check
        cat = item.get("category")
        if cat not in VALID_CATEGORIES:
            print(f"ERROR {prefix}: Invalid category '{cat}'. Expected one of {sorted(VALID_CATEGORIES)}")
            errors += 1

        # 3. Status check
        status = item.get("status")
        if status not in VALID_STATUSES:
            print(f"ERROR {prefix}: Invalid status '{status}'. Expected {VALID_STATUSES}")
            errors += 1

        # 4. Tone check
        tone = item.get("tone")
        if tone not in VALID_TONES:
            print(f"ERROR {prefix}: Invalid tone '{tone}'. Expected {VALID_TONES}")
            errors += 1

        # 5. Roast text length check
        roast_text = item.get("roast", "")
        if not isinstance(roast_text, str) or not roast_text.strip():
            print(f"ERROR {prefix}: Empty roast text")
            errors += 1
        else:
            roast_texts.append((item_id, roast_text))
            if len(roast_text) > 200:
                print(f"ERROR {prefix}: Roast exceeds 200 characters ({len(roast_text)} chars)")
                errors += 1
            elif len(roast_text) > 160:
                print(f"WARNING {prefix}: Roast is {len(roast_text)} chars (target <= 140)")
                warnings += 1

            # Check exclamation marks or emojis (blueprint rules: understate, no exclamation marks or emoji)
            if "!" in roast_text:
                print(f"WARNING {prefix}: Contains exclamation mark. Blueprint suggests deadpan understatements.")
                warnings += 1

            # Check blocklist
            roast_lower = roast_text.lower()
            for banned in blocklist:
                if banned in roast_lower:
                    print(f"ERROR {prefix}: Blocklist violation. Contains '{banned}'")
                    errors += 1

        # 6. Anchors check
        anchors = item.get("anchors", [])
        if not isinstance(anchors, list):
            print(f"ERROR {prefix}: 'anchors' must be a list")
            errors += 1
        else:
            if cat == "generic":
                if len(anchors) > 0:
                    print(f"ERROR {prefix}: 'generic' category roast must have 0 anchors")
                    errors += 1
            else:
                if len(anchors) < 3:
                    print(f"ERROR {prefix}: Needs at least 3 anchors (found {len(anchors)})")
                    errors += 1

        # 7. Slot validation
        declared_slots = set(item.get("slots", []))
        for slot in declared_slots:
            if slot not in VALID_SLOTS:
                print(f"ERROR {prefix}: Unknown slot key '{slot}'. Expected subset of {VALID_SLOTS}")
                errors += 1

        # Slots used in text: {slot}
        slots_in_text = set(re.findall(r"\{([a-zA-Z0-9_]+)\}", roast_text))
        if slots_in_text != declared_slots:
            print(f"ERROR {prefix}: Slots declared {declared_slots} do not match slots used {slots_in_text}")
            errors += 1

        if len(declared_slots) > 1:
            print(f"WARNING {prefix}: Uses {len(declared_slots)} slots (blueprint recommends at most one slot)")
            warnings += 1

    # 8. Pairwise similarity deduplication check
    for i in range(len(roast_texts)):
        for j in range(i + 1, len(roast_texts)):
            id1, t1 = roast_texts[i]
            id2, t2 = roast_texts[j]
            sim = jaccard_similarity(t1, t2)
            if sim > 0.85:
                print(f"WARNING: High text similarity ({sim:.2f}) between '{id1}' and '{id2}'")
                warnings += 1

    print(f"\nLint complete. Checked {len(data)} items. Errors: {errors}, Warnings: {warnings}")
    return errors, warnings


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    blocklist_file = data_dir / "blocklist.txt"

    target_file = None
    if len(sys.argv) > 1:
        target_file = Path(sys.argv[1])
    else:
        # Check dev_roasts.json or roasts.json
        if (data_dir / "dev_roasts.json").exists():
            target_file = data_dir / "dev_roasts.json"
        elif (data_dir / "roasts.json").exists():
            target_file = data_dir / "roasts.json"
        else:
            print("ERROR: No roast bank file found in data/", file=sys.stderr)
            sys.exit(1)

    blocklist = load_blocklist(blocklist_file)
    errs, warns = lint_roasts(target_file, blocklist)
    if errs > 0:
        sys.exit(1)
    sys.exit(0)
