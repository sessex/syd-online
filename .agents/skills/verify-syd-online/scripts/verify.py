#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Page, Route, expect, sync_playwright


FEATURES = (
    "landing-page",
    "motion-control",
    "photo-carousel",
    "portfolio-links",
    "contact-links",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Drive Syd Online through its real browser UI and capture proof.")
    parser.add_argument("--url", required=True, help="Verification instance URL, e.g. http://127.0.0.1:4173")
    parser.add_argument("--evidence-dir", required=True, type=Path, help="New directory for durable proof")
    parser.add_argument("--feature", action="append", choices=FEATURES, help="Feature to verify; repeat to combine")
    return parser.parse_args()


def require_local_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.port is None:
        raise ValueError("--url must be an explicit local HTTP URL with a port")
    return url.rstrip("/")


def wait_for_app(page: Page, url: str) -> None:
    page.goto(f"{url}/", wait_until="networkidle")
    page.locator("[data-entrance='complete']").wait_for(state="attached", timeout=8_000)
    expect(page).to_have_title("Sydney Essex - Product Engineer")


def main() -> int:
    args = parse_args()
    url = require_local_url(args.url)
    evidence_dir = args.evidence_dir.resolve()
    selected = tuple(dict.fromkeys(args.feature or FEATURES))
    if evidence_dir.exists():
        raise FileExistsError(f"evidence directory already exists: {evidence_dir}")
    evidence_dir.mkdir(parents=True)
    video_staging = evidence_dir / ".video"
    video_staging.mkdir()

    report: dict[str, object] = {
        "app": "Syd Online",
        "url": url,
        "status": "running",
        "requested_features": list(selected),
        "features": {},
        "actions": [],
        "page_errors": [],
        "console_errors": [],
    }

    def action(name: str, **observed: object) -> None:
        report["actions"].append({"action": name, "observed": observed})  # type: ignore[union-attr]

    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        record_video_dir=str(video_staging),
        record_video_size={"width": 1440, "height": 1000},
        reduced_motion="no-preference",
    )
    page = context.new_page()
    video = page.video
    page.on("pageerror", lambda error: report["page_errors"].append(str(error)))  # type: ignore[union-attr]
    page.on(
        "console",
        lambda message: report["console_errors"].append(message.text)
        if message.type == "error"
        else None,
    )

    try:
        wait_for_app(page, url)
        action("navigate", title=page.title(), location=page.url)
        (evidence_dir / "accessibility.aria.yml").write_text(page.locator("body").aria_snapshot(), encoding="utf-8")

        if "landing-page" in selected:
            hero = page.get_by_role("region", name="Introducing Sydney Essex")
            expect(hero).to_be_visible()
            expect(page.get_by_role("heading", name="SYDNEY ESSEX", level=1)).to_be_visible()
            expect(page.get_by_role("region", name="About Sydney Essex")).to_be_visible()
            expect(page.get_by_role("heading", name="projects", level=2)).to_be_attached()
            expect(page.get_by_role("heading", name="experience", level=2)).to_be_attached()
            page.screenshot(path=evidence_dir / "01_landing_page.png", full_page=True)
            report["features"]["landing-page"] = {"status": "passed", "title": page.title()}  # type: ignore[index]
            action("inspect landing page", hero=True, about=True, projects=True, experience=True)

        if "motion-control" in selected:
            page.evaluate("window.scrollTo(0, 0)")
            control = page.get_by_role("button", name="Pause motion")
            expect(control).to_have_attribute("aria-pressed", "false")
            page.screenshot(path=evidence_dir / "02_motion_before.png")
            control.click()
            play_control = page.get_by_role("button", name="Play motion")
            expect(play_control).to_have_attribute("aria-pressed", "true")
            expect(page.locator("[data-hero-frame]")).to_have_attribute("data-motion-paused", "true")
            expect(page.get_by_role("region", name="Sydney’s photo carousel. Scroll to explore.")).to_have_attribute(
                "data-motion-paused", "true"
            )
            page.screenshot(path=evidence_dir / "03_motion_paused.png")
            action("click Pause motion", aria_pressed=True, hero_paused=True, carousel_paused=True)
            play_control.click()
            expect(page.get_by_role("button", name="Pause motion")).to_have_attribute("aria-pressed", "false")
            report["features"]["motion-control"] = {"status": "passed", "restored_to_playing": True}  # type: ignore[index]
            action("click Play motion", aria_pressed=False)

        if "photo-carousel" in selected:
            page.evaluate("window.scrollTo(0, 0)")
            carousel = page.get_by_role("region", name="Sydney’s photo carousel. Scroll to explore.")
            carousel.focus()
            before = carousel.evaluate("element => element.scrollLeft")
            carousel.press("ArrowRight")
            page.wait_for_timeout(500)
            after = carousel.evaluate("element => element.scrollLeft")
            if not isinstance(before, (int, float)) or not isinstance(after, (int, float)) or after <= before:
                raise AssertionError(f"carousel did not move right: before={before}, after={after}")
            carousel.screenshot(path=evidence_dir / "04_carousel_keyboard.png")
            distance = round(after - before, 2)
            report["features"]["photo-carousel"] = {  # type: ignore[index]
                "status": "passed",
                "scroll_left_before": before,
                "scroll_left_after": after,
                "distance": distance,
            }
            action("focus carousel and press ArrowRight", before=before, after=after, distance=distance)

        if "portfolio-links" in selected:
            expected_links = {
                "trouvaille": "https://trouv.vercel.app/",
                "iris": "#",
                "asimov collective": "https://www.asimovcollective.com/",
                "goldman sachs": "#",
                "hypno": "https://app.hypno.com/",
                "vbn": "#",
                "artswrk": "https://artswrk.com/",
            }
            checked: dict[str, str] = {}
            for name, href in expected_links.items():
                button = page.get_by_role("button", name=name, exact=True)
                expect(button).to_have_attribute("aria-expanded", "false")
                button.click()
                expect(button).to_have_attribute("aria-expanded", "true")
                panel = page.locator("[id=" + repr(button.get_attribute("aria-controls")) + "]")
                if href == "#":
                    expect(panel.locator("a")).to_have_count(0)
                    expect(panel.get_by_text("in development for iOS" if name == "iris" else "link coming soon")).to_be_visible()
                else:
                    link = panel.get_by_role("link", name="Visit " + name, exact=True)
                    expect(link).to_have_attribute("href", href)
                    expect(link).to_be_visible()
                checked[name] = href
            page.get_by_role("heading", name="projects", level=2).scroll_into_view_if_needed()
            page.locator("section[aria-labelledby='projects-heading']").screenshot(path=evidence_dir / "05_portfolio_links.png")

            probe = context.new_page()
            try:
                wait_for_app(probe, url)

                def intercept(route: Route) -> None:
                    route.abort()

                context.route("https://trouv.vercel.app/", intercept)
                probe.get_by_role("button", name="trouvaille", exact=True).click()
                with context.expect_event("request", predicate=lambda request: request.url == "https://trouv.vercel.app/") as request_info:
                    probe.get_by_role("link", name="Visit trouvaille", exact=True).click(no_wait_after=True)
                requested_url = request_info.value.url
            finally:
                probe.close()
            if requested_url != "https://trouv.vercel.app/":
                raise AssertionError(f"unexpected outbound request: {requested_url}")
            report["features"]["portfolio-links"] = {  # type: ignore[index]
                "status": "passed",
                "destinations": checked,
                "representative_click_request": requested_url,
                "external_response_verified": False,
            }
            action("activate trouvaille link", outbound_request=requested_url, response_intentionally_not_verified=True)

        if "contact-links" in selected:
            expected_contacts = {
                "x": "https://x.com/waifu101",
                "linkedin": "https://www.linkedin.com/in/sydneyessex/",
                "github": "https://github.com/sessex",
                "email": "mailto:sydneyressex@gmail.com",
            }
            checked_contacts: dict[str, str] = {}
            for name, href in expected_contacts.items():
                link = page.get_by_role("link", name=name, exact=True)
                expect(link).to_have_attribute("href", href)
                checked_contacts[name] = link.get_attribute("href") or ""
            footer = page.locator("footer")
            footer.scroll_into_view_if_needed()
            footer.screenshot(path=evidence_dir / "06_contact_links.png")
            report["features"]["contact-links"] = {"status": "passed", "destinations": checked_contacts}  # type: ignore[index]
            action("inspect contact destinations", **checked_contacts)

        if report["page_errors"]:
            raise AssertionError(f"uncaught page errors: {report['page_errors']}")
        report["status"] = "passed"
    except Exception as error:
        report["status"] = "failed"
        report["failure"] = f"{type(error).__name__}: {error}"
        try:
            page.screenshot(path=evidence_dir / "failure.png", full_page=True)
        except Exception:
            pass
        raise
    finally:
        (evidence_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        context.close()
        if video is not None:
            video.save_as(evidence_dir / "browser_walkthrough.webm")
        browser.close()
        playwright.stop()
        shutil.rmtree(video_staging, ignore_errors=True)

    print(json.dumps({"status": report["status"], "evidence": str(evidence_dir), "features": list(selected)}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"verification failed: {error}", file=sys.stderr)
        raise
