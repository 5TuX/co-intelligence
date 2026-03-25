"""Render career JSON data to HTML via Jinja2 templates.

CLI:
  uv run career-render <user-dir>              # unified dashboard (default)
  uv run career-render <json> --template offers --user-dir <path>  # legacy single template
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from .models import RenderContext

TEMPLATES_DIR = Path(__file__).parent / "templates"

# CP1252 mojibake indicators: chars that appear when UTF-8 bytes are decoded as CP1252.
_MOJIBAKE_CHARS = {"\u00e2", "\u00c3", "\u00c2"}


def _fix_mojibake(s: str) -> str:
    """Reverse CP1252 mojibake: encode back to CP1252 bytes, then decode as UTF-8."""
    if not isinstance(s, str) or not (_MOJIBAKE_CHARS & set(s)):
        return s
    try:
        return s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def _fix_value(v: object) -> object:
    """Recursively fix mojibake in a JSON-like structure."""
    if isinstance(v, str):
        return _fix_mojibake(v)
    if isinstance(v, list):
        return [_fix_value(item) for item in v]
    if isinstance(v, dict):
        return {k: _fix_value(val) for k, val in v.items()}
    return v


TEMPLATE_MAP = {
    "offers": "offers.html.j2",
    "summary": "summary.html.j2",
    "dashboard": "dashboard.html.j2",
}
OUTPUT_MAP = {
    "offers": "Offers.html",
    "summary": "summary.html",
    "dashboard": "Dashboard.html",
}

DASHBOARD_OUTPUT = "Dashboard.html"


def _get_env() -> Environment:
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=False)


def render(ctx: RenderContext, template_name: str) -> str:
    """Render a RenderContext to HTML string (legacy single-template mode)."""
    env = _get_env()
    template = env.get_template(TEMPLATE_MAP[template_name])
    return template.render(ctx=ctx)


def render_dashboard(
    ctx: RenderContext,
    summary_data: dict | None = None,
    schedule_data: dict | None = None,
    comments: dict | None = None,
) -> str:
    """Render unified dashboard combining offers, summary, and schedule."""
    env = _get_env()
    template = env.get_template("dashboard.html.j2")
    return template.render(
        ctx=ctx, summary=summary_data, schedule=schedule_data, comments=comments or {},
    )


def _load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return _fix_value(data)


def render_user_dashboard(user_dir: Path) -> Path:
    """Load all data for a user and render a single Dashboard.html."""
    from .schedule import build_schedule_context

    offers_path = user_dir / "offers.json"
    if not offers_path.exists():
        print(f"Error: {offers_path} not found", file=sys.stderr)
        sys.exit(1)

    offers_data = _load_json(offers_path)
    ctx = RenderContext(**offers_data)

    summary_data = _load_json(user_dir / "summary-data.json")
    comments = _load_json(user_dir / "comments.json") or {}

    profile_path = user_dir / "profile.yaml"
    schedule_data = None
    if profile_path.exists():
        sched = build_schedule_context(profile_path)
        if sched.get("schedule"):
            schedule_data = sched

    html = render_dashboard(
        ctx, summary_data=summary_data, schedule_data=schedule_data, comments=comments,
    )

    out_file = user_dir / DASHBOARD_OUTPUT
    out_file.write_text(html, encoding="utf-8")
    print(f"Wrote {out_file}")
    return out_file


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="career-render",
        description="Render career data to HTML",
    )
    parser.add_argument(
        "path",
        help="User directory (dashboard mode) or JSON file (legacy mode)",
    )
    parser.add_argument(
        "--template",
        choices=["offers", "summary"],
        default=None,
        help="Legacy: render a single template instead of the unified dashboard",
    )
    parser.add_argument(
        "--user-dir",
        default=None,
        help="Legacy: output directory (required with --template)",
    )
    args = parser.parse_args()

    target = Path(args.path)

    # Legacy single-template mode
    if args.template:
        if not args.user_dir:
            print("Error: --user-dir required with --template", file=sys.stderr)
            sys.exit(1)
        if not target.exists():
            print(f"Error: {target} not found", file=sys.stderr)
            sys.exit(1)
        data = _load_json(target)
        ctx = RenderContext(**data)
        html = render(ctx, args.template)
        out_dir = Path(args.user_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / OUTPUT_MAP[args.template]
        out_file.write_text(html, encoding="utf-8")
        print(f"Wrote {out_file}")
        return

    # Dashboard mode: path is a user directory
    if not target.is_dir():
        print(f"Error: {target} is not a directory (use --template for legacy mode)", file=sys.stderr)
        sys.exit(1)

    render_user_dashboard(target)


if __name__ == "__main__":
    main()
