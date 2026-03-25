"""Build learning-path context from profile.yaml for dashboard rendering.

CLI: uv run career-schedule <user-dir>

Reads profile.yaml (single source of truth), renders schedule.html.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _parse_resource(raw: str) -> dict:
    """Split 'Label: https://...' into {label, url}."""
    match = re.search(r"(https?://\S+)", raw)
    if match:
        url = match.group(1)
        label = raw[: match.start()].rstrip(" :-—")
        return {"label": label.strip(), "url": url}
    return {"label": raw.strip(), "url": ""}


def build_schedule_context(profile_path: Path) -> dict:
    """Build template context from profile.yaml learning_path."""
    profile = yaml.safe_load(profile_path.read_text(encoding="utf-8"))
    user_name = profile.get("name", "")

    raw = profile.get("learning_path", [])
    if not raw:
        return {"user_name": user_name, "schedule": []}

    items = []
    for entry in raw:
        items.append({
            "skill": entry.get("skill", ""),
            "priority": entry.get("priority", 3),
            "difficulty": entry.get("difficulty", ""),
            "why": entry.get("why", ""),
            "topics": entry.get("topics", []),
            "resources": [_parse_resource(r) for r in entry.get("resources", [])],
        })

    # Sort by priority (1 = highest)
    items.sort(key=lambda x: x["priority"])

    method_raw = profile.get("learning_method", {})
    method = None
    if method_raw:
        struct = method_raw.get("session_structure", {})
        method = {
            "daily_pattern": struct.get("daily_pattern", ""),
            "principles": method_raw.get("principles", []),
        }

    return {"user_name": user_name, "schedule": items, "method": method}


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="career-schedule",
        description="Render learning path from profile.yaml to HTML",
    )
    parser.add_argument("user_dir", help="User directory containing profile.yaml")
    args = parser.parse_args()

    user_dir = Path(args.user_dir)
    profile_path = user_dir / "profile.yaml"
    if not profile_path.exists():
        print(f"Error: {profile_path} not found", file=sys.stderr)
        sys.exit(1)

    ctx = build_schedule_context(profile_path)
    if not ctx["schedule"]:
        print("No learning_path found in profile.yaml, nothing to render.")
        return

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=False)
    template = env.get_template("schedule.html.j2")
    html = template.render(ctx=ctx)

    out_file = user_dir / "schedule.html"
    out_file.write_text(html, encoding="utf-8")
    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
