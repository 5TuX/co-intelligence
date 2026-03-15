"""Clean stale/dead offers from the job-search catalog.

CLI:
  uv run js-clean <user-dir> [--timeout 15] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from .links import validate_links
from .models import CleanReport, CleanedOffer, RenderContext
from .render import render

AUTO_REMOVE = {"dead", "expired", "stale_announcement"}
FLAG_STATUSES = {"redirect", "captcha", "error"}


def _is_benign_redirect(detail: str, original_url: str) -> bool:
    """Return True if the redirect is cosmetic (scheme/www change only)."""
    # detail looks like "Redirected to https://..."
    prefix = "Redirected to "
    if not detail.startswith(prefix):
        return False
    final_url = detail[len(prefix):]
    o, f = urlparse(original_url), urlparse(final_url)
    o_host = o.netloc.removeprefix("www.")
    f_host = f.netloc.removeprefix("www.")
    return o_host == f_host and o.path.rstrip("/") == f.path.rstrip("/")


def _offer_to_cleaned(offer, result) -> CleanedOffer:
    return CleanedOffer(
        role=offer.role,
        company=offer.company,
        url=offer.url,
        location=offer.location,
        status=result.status,
        http_code=result.http_code,
        detail=result.detail,
    )


async def clean_offers(
    user_dir: Path, timeout: int = 15, dry_run: bool = False
) -> CleanReport:
    """Validate all offer links and remove dead ones."""
    offers_path = user_dir / "offers.json"
    if not offers_path.exists():
        print("No offers.json found, nothing to clean.")
        return CleanReport(
            date=str(date.today()), total_checked=0, kept=0, removed=0, flagged=0
        )

    data = json.loads(offers_path.read_text(encoding="utf-8"))
    ctx = RenderContext(**data)

    if not ctx.offers:
        print("No offers to check.")
        return CleanReport(
            date=str(date.today()), total_checked=0, kept=0, removed=0, flagged=0
        )

    urls = [o.url for o in ctx.offers if o.url]
    print(f"Checking {len(urls)} offer links...")
    results = await validate_links(urls, timeout)

    url_to_result = {r.url: r for r in results}

    kept = []
    removed_offers = []
    flagged_offers = []

    for offer in ctx.offers:
        result = url_to_result.get(offer.url)
        if result is None:
            # No URL or not checked — keep
            kept.append(offer)
            continue

        if result.status in AUTO_REMOVE:
            removed_offers.append(_offer_to_cleaned(offer, result))
        elif result.status in FLAG_STATUSES:
            if result.status == "redirect" and _is_benign_redirect(
                result.detail, offer.url
            ):
                kept.append(offer)
            else:
                flagged_offers.append(_offer_to_cleaned(offer, result))
                kept.append(offer)  # flagged offers stay until LLM reviews
        else:
            # active or unknown — keep
            kept.append(offer)

    report = CleanReport(
        date=str(date.today()),
        total_checked=len(urls),
        kept=len(kept),
        removed=len(removed_offers),
        flagged=len(flagged_offers),
        removed_offers=removed_offers,
        flagged_offers=flagged_offers,
    )

    # Always write report
    report_path = user_dir / "clean-report.json"
    report_path.write_text(
        json.dumps(report.model_dump(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {report_path}")

    if not dry_run:
        # Update offers.json with kept offers only
        ctx.offers = kept
        offers_path.write_text(
            json.dumps(ctx.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # Re-render Offers.html
        html = render(ctx, "offers")
        (user_dir / "Offers.html").write_text(html, encoding="utf-8")
        print(f"Wrote {user_dir / 'Offers.html'}")

    # Summary
    mode = "[DRY RUN] " if dry_run else ""
    print(
        f"\n{mode}Checked {report.total_checked} | "
        f"Kept {report.kept} | "
        f"Removed {report.removed} (dead/expired/stale) | "
        f"Flagged {report.flagged} (redirect/captcha/error)"
    )

    if removed_offers:
        print("\nRemoved:")
        for o in removed_offers:
            print(f"  - {o.company} — {o.role} [{o.status}: {o.detail}]")

    if flagged_offers:
        print("\nFlagged for review:")
        for o in flagged_offers:
            print(f"  - {o.company} — {o.role} [{o.status}: {o.detail}]")

    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="js-clean",
        description="Clean dead/stale offers from the job-search catalog",
    )
    parser.add_argument("user_dir", help="User directory (e.g. users/dimit/)")
    parser.add_argument(
        "--timeout", type=int, default=15, help="Request timeout in seconds"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Check links and report without modifying files",
    )
    args = parser.parse_args()

    user_dir = Path(args.user_dir)
    if not user_dir.is_dir():
        print(f"Error: {user_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    asyncio.run(clean_offers(user_dir, args.timeout, args.dry_run))


if __name__ == "__main__":
    main()
