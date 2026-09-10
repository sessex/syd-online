#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Optional, TypedDict
from urllib.parse import urlparse

from playwright.sync_api import Page, Route, expect, sync_playwright


FEATURES = (
    "landing-page",
    "smooth-scroll",
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
    expect(page).to_have_title("Sydney Essex - Product Engineer")
    expect(page.get_by_role("main")).to_be_visible()
    page.evaluate("document.fonts.ready")
    page.evaluate("""() => Promise.all(document.getAnimations()
        .filter(animation => animation.effect.getTiming().iterations !== Infinity)
        .map(animation => animation.finished.catch(() => {})))""")
    carousel = page.get_by_role("region", name="Sydney’s photo carousel. Scroll to explore.")
    carousel.focus()
    carousel.press("ArrowRight")
    page.wait_for_function("document.querySelector('[aria-roledescription=carousel]').scrollLeft > 0")
    page.wait_for_timeout(500)
    page.keyboard.press("Tab")
    page.wait_for_function("document.querySelector('[aria-roledescription=carousel]').scrollLeft === 0")
    page.evaluate("window.scrollTo(0, 0)")


class Action(TypedDict):
    action: str
    observed: dict[str, object]


class Report(TypedDict):
    app: str
    url: str
    status: str
    requested_features: list[str]
    features: dict[str, dict[str, object]]
    actions: list[Action]
    page_errors: list[str]
    console_errors: list[str]
    failure: Optional[str]


def observe_wheel(page: Page) -> None:
    page.evaluate("""() => {
        window.sydWheelObservation = new Promise(resolve => {
            window.addEventListener('wheel', event => {
                const started = performance.now();
                const observation = {
                    trusted: event.isTrusted,
                    prevented: event.defaultPrevented,
                    deltaX: event.deltaX,
                    deltaY: event.deltaY,
                    samples: [{elapsed: 0, y: window.scrollY}],
                };
                const sample = time => {
                    observation.samples.push({elapsed: time - started, y: window.scrollY});
                    if (time - started < 1200) requestAnimationFrame(sample);
                    else resolve(observation);
                };
                requestAnimationFrame(sample);
            }, {once: true, passive: true});
        });
    }""")


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

    report: Report = {
        "app": "Syd Online",
        "url": url,
        "status": "running",
        "failure": None,
        "requested_features": list(selected),
        "features": {},
        "actions": [],
        "page_errors": [],
        "console_errors": [],
    }

    def action(name: str, **observed: object) -> None:
        report["actions"].append({"action": name, "observed": observed})

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
    page.on("pageerror", lambda error: report["page_errors"].append(str(error)))
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
            report["features"]["landing-page"] = {"status": "passed", "title": page.title()}
            action("inspect landing page", hero=True, about=True, projects=True, experience=True)

        if "smooth-scroll" in selected:
            page.evaluate("window.scrollTo(0, 0)")
            page.mouse.move(10, 500)
            page.screenshot(path=evidence_dir / "02_scroll_before.png")
            observe_wheel(page)
            page.mouse.wheel(0, 600)
            smooth = page.evaluate("window.sydWheelObservation")
            positions = [sample["y"] for sample in smooth["samples"]]
            if not smooth["trusted"] or not smooth["prevented"]:
                raise AssertionError(f"smooth wheel was not intercepted: {smooth}")
            if not any(0 < position < 590 for position in positions) or abs(positions[-1] - 600) > 1:
                raise AssertionError(f"wheel did not interpolate and settle at 600px: {positions}")
            if max(positions[-5:]) - min(positions[-5:]) > 1:
                raise AssertionError(f"wheel did not settle: {positions[-5:]}")
            action("scroll with vertical wheel", **smooth)

            interruptions: dict[str, dict[str, float]] = {}
            for input_name in ("pointer", "keyboard"):
                start = page.evaluate("window.scrollY")
                observe_wheel(page)
                page.mouse.wheel(0, 600)
                page.wait_for_function("start => window.scrollY > start + 20", arg=start)
                if input_name == "pointer":
                    page.mouse.down()
                    page.mouse.up()
                else:
                    page.keyboard.press("Escape")
                stopped_at = page.evaluate("window.scrollY")
                interrupted = page.evaluate("window.sydWheelObservation")
                final_position = interrupted["samples"][-1]["y"]
                if stopped_at >= start + 590 or abs(final_position - stopped_at) > 1:
                    raise AssertionError(f"{input_name} failed to stop wheel motion: {stopped_at}, {final_position}")
                interruptions[input_name] = {"stopped_at": stopped_at, "final_position": final_position}
                action(f"interrupt wheel motion with {input_name}", **interruptions[input_name])

            start = page.evaluate("window.scrollY")
            observe_wheel(page)
            page.mouse.wheel(0, 600)
            page.wait_for_function("start => window.scrollY > start + 20", arg=start)
            page.evaluate("window.scrollTo(0, 0)")
            external_scroll = page.evaluate("window.sydWheelObservation")
            if abs(external_scroll["samples"][-1]["y"]) > 1:
                raise AssertionError("wheel motion overwrote an external scroll position")
            action("set external scroll position during wheel motion", target=0, **external_scroll)

            page.emulate_media(reduced_motion="reduce")
            page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            start = page.evaluate("window.scrollY")
            observe_wheel(page)
            page.mouse.wheel(0, 400)
            native = page.evaluate("window.sydWheelObservation")
            if not native["trusted"] or native["prevented"] or native["samples"][-1]["y"] <= start:
                raise AssertionError(f"reduced motion did not preserve native wheel scrolling: {native}")
            action("scroll with reduced motion", **native)
            page.screenshot(path=evidence_dir / "03_scroll_after.png")
            page.emulate_media(reduced_motion="no-preference")
            carousel = page.get_by_role("region", name="Sydney’s photo carousel. Scroll to explore.")
            carousel.focus()
            carousel.hover()
            horizontal_before = carousel.evaluate("element => element.scrollLeft")
            vertical_before = page.evaluate("window.scrollY")
            observe_wheel(page)
            page.mouse.wheel(320, 0)
            horizontal = page.evaluate("window.sydWheelObservation")
            horizontal_after = carousel.evaluate("element => element.scrollLeft")
            if horizontal["prevented"] or horizontal_after <= horizontal_before:
                raise AssertionError(f"horizontal wheel did not scroll the carousel: {horizontal_before}, {horizontal_after}")
            if abs(page.evaluate("window.scrollY") - vertical_before) > 1:
                raise AssertionError("horizontal carousel wheel changed the page's vertical position")
            action("scroll carousel with horizontal wheel", before=horizontal_before, after=horizontal_after, **horizontal)
            report["features"]["smooth-scroll"] = {
                "status": "passed",
                "wheel": smooth,
                "interruptions": interruptions,
                "reduced_motion": native,
                "external_scroll": external_scroll,
                "horizontal_carousel": {"before": horizontal_before, "after": horizontal_after},
                "nested_vertical_scroller": "not present on this page",
            }

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
            report["features"]["photo-carousel"] = {
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
            report["features"]["portfolio-links"] = {
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
            report["features"]["contact-links"] = {"status": "passed", "destinations": checked_contacts}
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
