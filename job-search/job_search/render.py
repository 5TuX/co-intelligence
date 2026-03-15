"""Render job-search JSON data to HTML via Jinja2 templates.

CLI: uv run js-render <json-file> --template offers|summary --user-dir <path>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from .models import RenderContext

TEMPLATES_DIR = Path(__file__).parent / "templates"
TEMPLATE_MAP = {
    "offers": "offers.html.j2",
    "summary": "summary.html.j2",
}
OUTPUT_MAP = {
    "offers": "Offers.html",
    "summary": "summary.html",
}


def render(ctx: RenderContext, template_name: str) -> str:
    """Render a RenderContext to HTML string."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
    )
    template = env.get_template(TEMPLATE_MAP[template_name])
    return template.render(ctx=ctx)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="js-render",
        description="Render job-search JSON to HTML",
    )
    parser.add_argument("json_file", help="Path to JSON file (RenderContext schema)")
    parser.add_argument(
        "--template",
        choices=["offers", "summary"],
        required=True,
        help="Which template to render",
    )
    parser.add_argument(
        "--user-dir",
        required=True,
        help="User directory to write output HTML into",
    )
    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: {json_path} not found", file=sys.stderr)
        sys.exit(1)

    data = json.loads(json_path.read_text(encoding="utf-8"))
    ctx = RenderContext(**data)
    html = render(ctx, args.template)

    out_dir = Path(args.user_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / OUTPUT_MAP[args.template]
    out_file.write_text(html, encoding="utf-8")
    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
