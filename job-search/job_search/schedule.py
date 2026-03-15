"""Render weekly learning schedule from profile.yaml to HTML.

CLI: uv run js-schedule <user-dir>

Reads profile.yaml (single source of truth), renders schedule.html.
No intermediate JSON — avoids data duplication with the YAML.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).parent / "templates"
DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _parse_resource(raw: str) -> dict:
    """Split 'Label: https://...' into {label, url}."""
    match = re.search(r"(https?://\S+)", raw)
    if match:
        url = match.group(1)
        label = raw[: match.start()].rstrip(" :-—")
        return {"label": label.strip(), "url": url}
    return {"label": raw.strip(), "url": ""}


def build_schedule_context(profile_path: Path) -> dict:
    """Build template context from profile.yaml weekly_schedule."""
    profile = yaml.safe_load(profile_path.read_text(encoding="utf-8"))
    raw = profile.get("weekly_schedule", {})
    user_name = profile.get("name", "")

    schedule = []
    for day_key in DAY_ORDER:
        if day_key not in raw:
            continue
        entry = raw[day_key]
        schedule.append({
            "day": day_key.capitalize(),
            "skill": entry.get("skill", ""),
            "hours": entry.get("hours", 0),
            "difficulty": entry.get("difficulty", ""),
            "why": entry.get("why", ""),
            "topics": entry.get("topics", []),
            "resources": [_parse_resource(r) for r in entry.get("resources", [])],
        })

    method_raw = profile.get("learning_method", {})
    method = None
    if method_raw:
        struct = method_raw.get("session_structure", {})
        method = {
            "daily_pattern": struct.get("daily_pattern", ""),
            "principles": method_raw.get("principles", []),
        }

    return {"user_name": user_name, "schedule": schedule, "method": method}


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="js-schedule",
        description="Render weekly learning schedule from profile.yaml to HTML",
    )
    parser.add_argument("user_dir", help="User directory (e.g. users/dimit/)")
    args = parser.parse_args()

    user_dir = Path(args.user_dir)
    profile_path = user_dir / "profile.yaml"
    if not profile_path.exists():
        print(f"Error: {profile_path} not found", file=sys.stderr)
        sys.exit(1)

    ctx = build_schedule_context(profile_path)
    if not ctx["schedule"]:
        print("No weekly_schedule found in profile.yaml, nothing to render.")
        return

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=False)
    template = env.get_template("schedule.html.j2")
    html = template.render(ctx=ctx)

    out_file = user_dir / "schedule.html"
    out_file.write_text(html, encoding="utf-8")
    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
