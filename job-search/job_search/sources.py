"""Source YAML validation for job-search skill.

CLI: uv run js-validate-sources <yaml-file> [<yaml-file2>...]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml
from pydantic import ValidationError

from .models import Source


def validate_sources_file(path: Path) -> dict:
    """Validate a single sources YAML file. Returns a report dict."""
    report: dict = {"file": str(path), "valid": [], "errors": [], "duplicates": []}

    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        report["errors"].append({"source": str(path), "error": f"YAML parse error: {e}"})
        return report

    if not raw or "sources" not in raw:
        report["errors"].append({"source": str(path), "error": "Missing 'sources' key"})
        return report

    seen_urls: dict[str, str] = {}
    for i, entry in enumerate(raw["sources"]):
        label = entry.get("name", f"entry #{i + 1}")
        try:
            source = Source(**entry)
            report["valid"].append(source.name)

            if source.url in seen_urls:
                report["duplicates"].append({
                    "url": source.url,
                    "names": [seen_urls[source.url], source.name],
                })
            else:
                seen_urls[source.url] = source.name

            missing = []
            if not source.keywords:
                missing.append("keywords")
            if not source.last_checked:
                missing.append("last_checked")
            if missing:
                report["errors"].append({
                    "source": label,
                    "error": f"Missing recommended fields: {', '.join(missing)}",
                })

        except ValidationError as e:
            report["errors"].append({"source": label, "error": str(e)})

    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="js-validate-sources",
        description="Validate job-search source YAML files",
    )
    parser.add_argument("yaml_files", nargs="+", help="YAML files to validate")
    parser.add_argument("--output", help="Write JSON report to file (default: stdout)")
    args = parser.parse_args()

    reports = []
    for f in args.yaml_files:
        path = Path(f)
        if not path.exists():
            print(f"Warning: {path} not found, skipping", file=sys.stderr)
            continue
        reports.append(validate_sources_file(path))

    output = json.dumps(reports, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(output)

    total_valid = sum(len(r["valid"]) for r in reports)
    total_errors = sum(len(r["errors"]) for r in reports)
    total_dupes = sum(len(r["duplicates"]) for r in reports)
    print(f"\nSummary: {total_valid} valid, {total_errors} issues, {total_dupes} duplicates",
          file=sys.stderr)


if __name__ == "__main__":
    main()
