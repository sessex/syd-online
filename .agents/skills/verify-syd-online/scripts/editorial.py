#!/usr/bin/env python3
"""Exercise the editorial index using real pointer, keyboard, and touch input."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--evidence-dir', required=True, type=Path)
args = parser.parse_args()
args.evidence_dir.mkdir(parents=True, exist_ok=False)
report = {'status': 'running', 'url': args.url, 'checks': [], 'page_errors': []}


def record(name, **details):
    report['checks'].append({'name': name, **details})


def panel_for(page, button):
    return page.locator('[id=' + repr(button.get_attribute('aria-controls')) + ']')


def settled(panel, opened):
    expect(panel).to_have_attribute('data-open', str(opened).lower())
    panel.page.wait_for_function('(el) => el.getAnimations({subtree:true}).every(a => a.playState === "finished")', arg=panel.element_handle())


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, record_video_dir=str(args.evidence_dir / 'video'))
    page = context.new_page()
    page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
    try:
        page.goto(args.url + '/#projects-heading', wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        buttons = page.locator('button[aria-controls]')
        expect(buttons).to_have_count(7)
        names = ['trouvaille', 'iris', 'asimov collective', 'goldman sachs', 'hypno', 'vbn', 'artswrk']
        for name in names:
            button = page.get_by_role('button', name=name, exact=True)
            panel = panel_for(page, button)
            expect(button).to_have_attribute('aria-expanded', 'false')
            assert panel.bounding_box()['height'] == 0
            # Name, one-liner, icon, and blank padding are all part of one target.
            for target in [button.locator('[class*="itemName"]'), button.locator('[class*="rowBlurb"]'), button.locator('[class*="disclosureIcon"]')]:
                target.click()
                settled(panel, True)
                assert panel.bounding_box()['height'] > 20
                expect(panel.locator('p')).to_be_visible()
                target.click()
                settled(panel, False)
                assert panel.bounding_box()['height'] == 0
            button.click(position={'x': 3, 'y': 3})
            settled(panel, True)
            button.click(position={'x': 3, 'y': 3})
            settled(panel, False)
            record('whole-row targets and disclosure', item=name)

        first = page.get_by_role('button', name='trouvaille', exact=True)
        first.focus()
        first.press('Enter')
        panel = panel_for(page, first)
        settled(panel, True)
        first.press('Tab')
        expect(page.get_by_role('link', name='visit trouvaille', exact=True)).to_be_focused()
        page.keyboard.press('Shift+Tab')
        first.press('Space')
        expect(panel).to_have_attribute('inert', '')
        first.press('Tab')
        expect(page.get_by_role('button', name='iris', exact=True)).to_be_focused()
        settled(panel, False)
        record('Enter, Space, and Tab; closing link immediately inert')

        # Record every frame of a real click, then reverse before opening completes.
        first.scroll_into_view_if_needed()
        page.evaluate('''() => {
          window.framesObserved = [];
          const panel = document.getElementById(document.querySelector('button[aria-controls]').getAttribute('aria-controls'));
          const start = performance.now();
          function sample(t) {
            window.framesObserved.push({t: t-start, height: panel.getBoundingClientRect().height});
            if (t-start < 900) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }''')
        first.click()
        page.wait_for_timeout(90)
        first.click()
        page.wait_for_timeout(900)
        frames = page.evaluate('window.framesObserved')
        assert len({round(f['height'], 1) for f in frames}) > 4, frames
        assert frames[-1]['height'] == 0
        settled(panel, False)
        record('interrupted transition returns smoothly to closed', frames=frames)
        for _ in range(7):
            first.click()
            page.wait_for_timeout(30)
        settled(panel, True)
        assert panel.bounding_box()['height'] > 20
        first.click()
        settled(panel, False)
        record('rapid repeated clicks settle at requested state')

        # Hover moves only colored copies. Native animations are sampled while playing.
        page.mouse.move(0, 0)
        first.focus()
        first.press("Tab")
        page.wait_for_timeout(100)
        letter = first.locator('[data-letter]').first
        before = letter.bounding_box()
        first.hover()
        page.wait_for_timeout(90)
        chroma = first.evaluate('''el => ({
          background: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el.querySelector('[data-letter]')).color,
          layers: [...el.querySelectorAll('[data-letter]')].map(letter => ({
            pink: getComputedStyle(letter, '::before').color,
            green: getComputedStyle(letter, '::after').color,
            opacity: getComputedStyle(letter, '::before').opacity,
            transform: getComputedStyle(letter, '::before').transform,
            delay: getComputedStyle(letter, '::before').animationDelay
          }))
        })''')
        assert chroma['background'] == 'rgba(0, 0, 0, 0)'
        assert chroma['color'] == 'rgb(18, 18, 18)'
        assert all(layer['pink'] == 'rgb(245, 42, 155)' and layer['green'] == 'rgb(55, 185, 139)' for layer in chroma['layers'])
        assert any(float(layer['opacity']) > 0 for layer in chroma['layers'])
        assert len({layer['delay'] for layer in chroma['layers']}) > 1
        assert letter.bounding_box() == before
        first.screenshot(path=args.evidence_dir / 'hover-wave.png', animations='allow')
        page.wait_for_timeout(850)
        assert letter.evaluate('el => getComputedStyle(el, "::before").opacity') == '0'
        record('pink-green stagger; stable dark title; one-shot wave', observed=chroma)
        page.mouse.move(0, 0)

        page.get_by_role('region', name='About Sydney Essex').scroll_into_view_if_needed()
        page.screenshot(path=args.evidence_dir / 'desktop-closed.png', full_page=True)
        first.click()
        page.get_by_role('button', name='asimov collective', exact=True).click()
        settled(panel, True)
        page.screenshot(path=args.evidence_dir / 'desktop-open.png', full_page=True)

        for width in [320, 390, 760, 768, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            for button in buttons.all():
                if button.get_attribute('aria-expanded') == 'false':
                    button.click()
                    settled(panel_for(page, button), True)
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth')
            assert not overflow, width
            clipped = page.locator('[class*="rowCopy"], [class*="reveal"]').evaluate_all('(els) => els.filter(el => el.scrollWidth > el.clientWidth + 1).length')
            assert clipped == 0, (width, clipped)
            record('all rows open without overflow or clipped text', width=width)
            if width == 390:
                page.screenshot(path=args.evidence_dir / 'phone-open.png', full_page=True)

        page.emulate_media(reduced_motion='reduce')
        first.scroll_into_view_if_needed()
        first.click()
        assert panel.bounding_box()['height'] == 0
        first.hover()
        assert letter.evaluate('el => getComputedStyle(el, "::before").animationName') == 'none'
        first.click()
        assert panel.bounding_box()['height'] > 20
        assert panel.evaluate('el => el.getAnimations({subtree:true}).length') == 0
        record('reduced motion instant disclosures and no chroma wave')
        page.emulate_media(reduced_motion='no-preference', forced_colors='active')
        assert letter.evaluate('el => getComputedStyle(el, "::before").display') == 'none'
        record('forced colors preserves plain readable titles')

        touch = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        touch_page = touch.new_page()
        touch_page.goto(args.url + '/#projects-heading', wait_until='networkidle')
        for name in names:
            button = touch_page.get_by_role('button', name=name, exact=True)
            button.tap()
            settled(panel_for(touch_page, button), True)
            button.tap()
            settled(panel_for(touch_page, button), False)
        record('emulated phone touch opens and closes all seven rows')
        touch.close()
        assert not report['page_errors'], report['page_errors']
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'
        report['failure'] = str(error)
        page.screenshot(path=args.evidence_dir / 'failure.png', full_page=True)
        raise
    finally:
        (args.evidence_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        context.close()
        browser.close()
print(json.dumps({'status': report['status'], 'checks': len(report['checks'])}))
