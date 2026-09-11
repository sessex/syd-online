#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Page, expect, sync_playwright


INVERSION = '[data-pixel-wishes-layer="inversion"]'
COLOR = '[data-pixel-wishes-layer="color"]'


def canvas_pixels(page: Page, selector: str) -> int:
    return page.locator(selector).evaluate("""canvas => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let index = 3; index < data.length; index += 4) if (data[index]) count += 1;
        return count;
    }""")


def metadata(page: Page) -> dict[str, object]:
    return page.locator(INVERSION).evaluate("""canvas => ({
        state: canvas.dataset.pixelWishesState,
        reason: canvas.dataset.pixelWishesDisabledReason,
        particles: Number(canvas.dataset.pixelWishesParticleCount),
        emitted: Number(canvas.dataset.pixelWishesEmittedTotal),
        backing: [canvas.width, canvas.height],
        css: [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height],
    })""")


def open_page(context, url: str) -> Page:
    page = context.new_page()
    page.goto(f"{url}/", wait_until="networkidle")
    expect(page).to_have_title("Sydney Essex - Product Engineer")
    return page


def sweep(page: Page, pressed: bool) -> int:
    page.reload(wait_until="networkidle")
    expect(page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-state", "settled")
    page.mouse.move(160, 180)
    expect(page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-state", "settled")
    if pressed:
        page.mouse.down()
    page.mouse.move(1040, 530, steps=4)
    page.wait_for_function(
        "selector => Number(document.querySelector(selector).dataset.pixelWishesEmittedTotal) > 0",
        arg=INVERSION,
    )
    page.wait_for_function(
        "selector => document.querySelector(selector).dataset.pixelWishesState === 'settled'",
        arg=INVERSION,
        timeout=7000,
    )
    if pressed:
        page.mouse.up()
    state = metadata(page)
    if state["particles"] != 0:
        raise AssertionError(f"particles did not drain: {state}")
    return int(state["emitted"])


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the Pixel Wishes cursor.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--evidence-dir", required=True, type=Path)
    args = parser.parse_args()
    parsed = urlparse(args.url)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.port is None:
        raise ValueError("--url must be an explicit local HTTP URL with a port")
    evidence = args.evidence_dir.resolve()
    if evidence.exists():
        raise FileExistsError(f"evidence directory already exists: {evidence}")
    evidence.mkdir(parents=True)
    video_staging = evidence / ".video"
    video_staging.mkdir()
    report: dict[str, object] = {
        "app": "Syd Online Pixel Wishes cursor",
        "url": args.url,
        "status": "running",
        "checks": {},
        "page_errors": [],
        "console_errors": [],
        "failure": None,
    }
    checks = report["checks"]
    assert isinstance(checks, dict)
    page_errors = report["page_errors"]
    console_errors = report["console_errors"]
    assert isinstance(page_errors, list) and isinstance(console_errors, list)

    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1200, "height": 800},
        device_scale_factor=2.5,
        reduced_motion="no-preference",
        record_video_dir=str(video_staging),
        record_video_size={"width": 1200, "height": 800},
    )
    page = open_page(context, args.url.rstrip("/"))
    video = page.video
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    try:
        expect(page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-state", "settled")
        expect(page.locator(f"{INVERSION}, {COLOR}")).to_have_count(2)
        layers = page.locator(INVERSION).evaluate("""canvas => ({
            parent: canvas.parentElement.tagName,
            next: canvas.nextElementSibling?.dataset.pixelWishesLayer,
            inversionBlend: getComputedStyle(canvas).mixBlendMode,
            colorBlend: getComputedStyle(canvas.nextElementSibling).mixBlendMode,
            pointerEvents: getComputedStyle(canvas).pointerEvents,
            hidden: [...document.querySelectorAll('[data-pixel-wishes-layer]')]
                .every(layer => layer.getAttribute('aria-hidden') === 'true'),
            focusable: document.querySelectorAll('[data-pixel-wishes-layer][tabindex]').length,
        })""")
        expected_layers = {
            "parent": "BODY", "next": "color", "inversionBlend": "difference",
            "colorBlend": "normal", "pointerEvents": "none", "hidden": True, "focusable": 0,
        }
        if layers != expected_layers:
            raise AssertionError(f"unexpected cursor layers: {layers}")
        checks["layers"] = layers

        button = page.get_by_role("button", name="Pause scenery")
        box = button.bounding_box()
        if box is None:
            raise AssertionError("scenery button has no bounding box")
        point = {"x": box["x"] + box["width"] / 2, "y": box["y"] + box["height"] / 2}
        hit = page.evaluate("p => document.elementFromPoint(p.x, p.y)?.closest('button')?.textContent", point)
        native_cursor = button.evaluate("element => getComputedStyle(element).cursor")
        if hit != "Pause scenery" or native_cursor == "none":
            raise AssertionError(f"input passthrough failed: {hit}, {native_cursor}")
        page.mouse.click(point["x"], point["y"])
        expect(page.get_by_role("button", name="Play scenery")).to_have_attribute("aria-pressed", "true")
        checks["input_passthrough"] = {"hit": hit, "native_cursor": native_cursor}

        unpressed = sweep(page, False)
        pressed = sweep(page, True)
        if pressed < unpressed * 1.5:
            raise AssertionError(f"press boost failed: unpressed={unpressed}, pressed={pressed}")
        page.mouse.move(850, 340)
        page.wait_for_timeout(100)
        pixels = {"inversion": canvas_pixels(page, INVERSION), "color": canvas_pixels(page, COLOR)}
        if min(pixels.values()) == 0:
            raise AssertionError(f"cursor canvases were blank: {pixels}")
        page.screenshot(path=evidence / "01_pixel_wishes_hero.png")
        checks["motion"] = {"unpressed": unpressed, "pressed": pressed, "pixels": pixels}

        page.set_viewport_size({"width": 390, "height": 700})
        page.wait_for_timeout(100)
        size = metadata(page)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        if size["backing"] != [780, 1400] or size["css"] != [390, 700] or overflow != 0:
            raise AssertionError(f"viewport sizing failed: {size}, overflow={overflow}")
        checks["resize"] = {**size, "overflow": overflow}

        page.mouse.move(100, 180)
        page.mouse.move(330, 520, steps=3)
        page.wait_for_function(
            "selector => Number(document.querySelector(selector).dataset.pixelWishesParticleCount) > 0",
            arg=INVERSION,
        )
        page.mouse.move(-10, -10)
        expect(page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-disabled-reason", "pointer-leave")
        if canvas_pixels(page, INVERSION) or canvas_pixels(page, COLOR):
            raise AssertionError("pointer leave did not clear the canvases")
        checks["pointer_leave"] = metadata(page)

        page.mouse.move(180, 250)
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        expect(page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-disabled-reason", "blur")
        if canvas_pixels(page, INVERSION) or canvas_pixels(page, COLOR):
            raise AssertionError("blur did not clear the canvases")
        checks["blur"] = metadata(page)
        page.mouse.move(220, 280)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.35)")
        page.screenshot(path=evidence / "02_pixel_wishes_editorial.png")

        reduced = browser.new_context(viewport={"width": 800, "height": 600}, reduced_motion="reduce")
        reduced_page = open_page(reduced, args.url.rstrip("/"))
        expect(reduced_page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-disabled-reason", "reduced-motion")
        reduced_page.mouse.move(100, 100)
        reduced_page.mouse.move(700, 500, steps=3)
        reduced_state = metadata(reduced_page)
        reduced_display = reduced_page.locator(INVERSION).evaluate("canvas => getComputedStyle(canvas).display")
        if reduced_state["emitted"] or reduced_display != "none" or canvas_pixels(reduced_page, INVERSION):
            raise AssertionError(f"reduced motion failed: {reduced_state}, display={reduced_display}")
        checks["reduced_motion"] = {**reduced_state, "display": reduced_display}
        reduced.close()

        coarse = browser.new_context(
            viewport={"width": 390, "height": 700}, is_mobile=True, has_touch=True,
            reduced_motion="no-preference",
        )
        coarse_page = open_page(coarse, args.url.rstrip("/"))
        expect(coarse_page.locator(INVERSION)).to_have_attribute("data-pixel-wishes-disabled-reason", "coarse-pointer")
        coarse_page.touchscreen.tap(180, 220)
        coarse_state = metadata(coarse_page)
        coarse_display = coarse_page.locator(INVERSION).evaluate("canvas => getComputedStyle(canvas).display")
        if coarse_state["reason"] != "coarse-pointer" or coarse_state["emitted"] or coarse_display != "none" or canvas_pixels(coarse_page, INVERSION):
            raise AssertionError(f"coarse pointer failed: {coarse_state}, display={coarse_display}")
        checks["coarse_pointer"] = {**coarse_state, "display": coarse_display}
        coarse.close()

        if page_errors or console_errors:
            raise AssertionError(f"browser errors: page={page_errors}, console={console_errors}")
        report["status"] = "passed"
    except Exception as error:
        report["status"] = "failed"
        report["failure"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        (evidence / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        context.close()
        if video is not None:
            video.save_as(evidence / "pixel_wishes_walkthrough.webm")
        browser.close()
        playwright.stop()
        shutil.rmtree(video_staging, ignore_errors=True)

    print(json.dumps({"status": report["status"], "evidence": str(evidence)}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"pixel wishes verification failed: {error}", file=sys.stderr)
        raise
