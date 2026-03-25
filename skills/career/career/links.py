"""Async link validation for career offers.

CLI:
  uv run career-validate-links <json-file> --output <results.json> [--timeout 15]
  uv run career-validate-links --html <Offers.html> --output <results.json>
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import httpx

from .models import LinkCheckResult, RenderContext

CONCURRENCY = 10
DEFAULT_TIMEOUT = 15

EXPIRED_PATTERNS = re.compile(
    r"no longer available|position has been filled|expired|archived|"
    r"cette offre n.est plus disponible|poste pourvu",
    re.IGNORECASE,
)
CAPTCHA_PATTERNS = re.compile(
    r"captcha|verify you are human|are you a robot|challenge-platform",
    re.IGNORECASE,
)
NEWS_PATH_PATTERNS = re.compile(
    r"/news/|/blog/|/press/|/announcement/|/\d{4}/\d{2}/",
)
# Matches 4-digit years in page body for staleness detection
YEAR_PATTERN = re.compile(r"\b(20[12]\d)\b")


def extract_urls_from_html(html: str) -> list[str]:
    """Extract all href URLs from HTML."""
    return list(dict.fromkeys(re.findall(r'href="(https?://[^"]+)"', html)))


async def check_link(
    client: httpx.AsyncClient,
    url: str,
    semaphore: asyncio.Semaphore,
    timeout: int,
) -> LinkCheckResult:
    """Check a single URL and classify its status."""
    async with semaphore:
        try:
            resp = await client.get(
                url,
                timeout=timeout,
                follow_redirects=True,
            )
            code = resp.status_code

            if code >= 400:
                return LinkCheckResult(
                    url=url, status="dead", http_code=code, detail=f"HTTP {code}"
                )

            body = resp.text[:5000]

            if CAPTCHA_PATTERNS.search(body):
                return LinkCheckResult(
                    url=url, status="captcha", http_code=code, detail="CAPTCHA detected"
                )

            if EXPIRED_PATTERNS.search(body):
                return LinkCheckResult(
                    url=url,
                    status="expired",
                    http_code=code,
                    detail="Listing appears expired",
                )

            # Detect stale announcement/news pages
            if NEWS_PATH_PATTERNS.search(url):
                years = {int(y) for y in YEAR_PATTERN.findall(body)}
                if years:
                    cutoff = date.today() - timedelta(days=180)
                    if all(y < cutoff.year or (y == cutoff.year and cutoff.month > 6) for y in years):
                        newest = max(years)
                        return LinkCheckResult(
                            url=url,
                            status="stale_announcement",
                            http_code=code,
                            detail=f"News/announcement page, newest year mentioned: {newest}",
                        )

            if resp.history:
                final = str(resp.url)
                return LinkCheckResult(
                    url=url,
                    status="redirect",
                    http_code=code,
                    detail=f"Redirected to {final}",
                )

            return LinkCheckResult(url=url, status="active", http_code=code)

        except httpx.TimeoutException:
            return LinkCheckResult(
                url=url, status="error", detail="Timeout"
            )
        except httpx.HTTPError as e:
            return LinkCheckResult(
                url=url, status="error", detail=str(e)[:200]
            )


async def validate_links(
    urls: list[str], timeout: int = DEFAULT_TIMEOUT
) -> list[LinkCheckResult]:
    """Validate a list of URLs concurrently."""
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (career-validator)"},
    ) as client:
        tasks = [check_link(client, url, semaphore, timeout) for url in urls]
        return await asyncio.gather(*tasks)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="career-validate-links",
        description="Validate URLs from career data",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("json_file", nargs="?", help="JSON file (RenderContext schema)")
    group.add_argument("--html", help="HTML file to extract URLs from")
    parser.add_argument("--output", required=True, help="Output JSON file for results")
    parser.add_argument(
        "--timeout", type=int, default=DEFAULT_TIMEOUT, help="Request timeout in seconds"
    )
    args = parser.parse_args()

    if args.html:
        html_path = Path(args.html)
        if not html_path.exists():
            print(f"Error: {html_path} not found", file=sys.stderr)
            sys.exit(1)
        html = html_path.read_text(encoding="utf-8")
        urls = extract_urls_from_html(html)
    else:
        json_path = Path(args.json_file)
        if not json_path.exists():
            print(f"Error: {json_path} not found", file=sys.stderr)
            sys.exit(1)
        data = json.loads(json_path.read_text(encoding="utf-8"))
        ctx = RenderContext(**data)
        urls = [o.url for o in ctx.offers if o.url]

    print(f"Checking {len(urls)} URLs (concurrency={CONCURRENCY}, timeout={args.timeout}s)...")
    results = asyncio.run(validate_links(urls, args.timeout))

    out_path = Path(args.output)
    out_path.write_text(
        json.dumps([r.model_dump() for r in results], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    active = sum(1 for r in results if r.status == "active")
    redirect = sum(1 for r in results if r.status == "redirect")
    dead = sum(1 for r in results if r.status == "dead")
    expired = sum(1 for r in results if r.status == "expired")
    captcha = sum(1 for r in results if r.status == "captcha")
    stale = sum(1 for r in results if r.status == "stale_announcement")
    error = sum(1 for r in results if r.status == "error")

    print(f"Results: {active} active, {redirect} redirect, {dead} dead, "
          f"{expired} expired, {stale} stale_announcement, {captcha} captcha, {error} error")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
