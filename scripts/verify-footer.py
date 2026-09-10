import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--evidence-dir', type=Path, required=True)
args = parser.parse_args()
args.evidence_dir.mkdir(parents=True, exist_ok=True)
destinations = {
    'x': 'https://x.com/waifu101',
    'linkedin': 'https://www.linkedin.com/in/sydneyessex/',
    'github': 'https://github.com/sessex',
    'email': 'mailto:sydneyressex@gmail.com',
}
report = {'url': args.url, 'status': 'failed', 'viewports': [], 'page_errors': []}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={'width': 1440, 'height': 1000},
        record_video_dir=str(args.evidence_dir / 'video'),
        reduced_motion='reduce',
    )
    page = context.new_page()
    page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
    try:
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(args.url, wait_until='networkidle')
            footer = page.get_by_role('contentinfo')
            footer.scroll_into_view_if_needed()
            footer.locator('img').evaluate_all(
                '(images) => Promise.all(images.map(image => image.decode()))'
            )
            footer.screenshot(path=str(args.evidence_dir / f'footer-{width}.png'))
            page.screenshot(path=str(args.evidence_dir / f'page-{width}.png'), full_page=True)
            transparency = footer.locator('img').evaluate_all('''images => images.map(image => {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
                let transparentPixels = 0;
                for (let index = 3; index < data.length; index += 4) {
                    if (data[index] === 0) transparentPixels++;
                }
                const cornerPixels = [
                    0,
                    canvas.width - 1,
                    (canvas.height - 1) * canvas.width,
                    canvas.width * canvas.height - 1,
                ];
                return {
                    name: image.alt || 'star',
                    src: image.currentSrc,
                    width: canvas.width,
                    height: canvas.height,
                    transparent_fraction: transparentPixels / (canvas.width * canvas.height),
                    corner_alpha: cornerPixels.map(pixel => data[pixel * 4 + 3]),
                };
            })''')
            viewport_report = {
                'width': width,
                'status': 'failed',
                'links': destinations,
                'stars': 3,
                'transparency': transparency,
            }
            report['viewports'].append(viewport_report)
            assert len(transparency) == 7, 'Expected seven footer images to inspect'
            for image in transparency:
                name = image['name']
                assert image['transparent_fraction'] > 0.2, f'{name} needs more than 20% transparent pixels'
                assert image['corner_alpha'] == [0, 0, 0, 0], f'{name} corners must be fully transparent'
            assert footer.get_by_role('link').count() == 4, 'Expected four footer links'
            observed = []
            for name, href in destinations.items():
                link = footer.get_by_role('link', name=name, exact=True)
                assert link.get_attribute('href') == href, f'{name} destination changed'
                assert link.locator('img').count() == 1, f'{name} must contain one word image'
                image = link.locator('img')
                assert image.get_attribute('alt') == name, f'{name} image needs its word as alt text'
                observed.append(image.get_attribute('src'))
                box = link.bounding_box()
                assert box['width'] >= 43.9 and box['height'] >= 43.9, f'{name} target is too small'
                assert box['x'] >= 0 and box['x'] + box['width'] <= width, f'{name} overflows'
                hit = link.evaluate('''el => {
                    const r = el.getBoundingClientRect();
                    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a') === el;
                }''')
                assert hit, f'{name} center does not hit its own link'
            assert len(set(observed)) == 4, 'Every word must use a different image'
            stars = footer.locator('img[alt=""]')
            assert stars.count() == 3, 'Expected three decorative stars'
            for star in stars.all():
                assert star.get_attribute('aria-hidden') == 'true', 'Star must be hidden from accessibility'
                isolated = star.evaluate('''el => {
                    const r = el.getBoundingClientRect();
                    const links = [...el.closest('footer').querySelectorAll('a')];
                    const overlaps = links.some(link => {
                        const a = link.getBoundingClientRect();
                        return r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top;
                    });
                    return !el.closest('a') && !overlaps && !document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a');
                }''')
                assert isolated, 'Star intersects a link hit area'
                box = star.bounding_box()
                previous_url = page.url
                page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                assert page.url == previous_url, 'Star click navigated'
            links = footer.get_by_role('link')
            links.first.focus()
            for index, name in enumerate(destinations):
                if index:
                    page.keyboard.press('Tab')
                link = footer.get_by_role('link', name=name, exact=True)
                assert link.evaluate('el => document.activeElement === el'), f'Tab order skipped {name}'
                assert link.evaluate('el => getComputedStyle(el).outlineStyle !== "none"'), f'{name} lacks focus outline'
            page.keyboard.press('Tab')
            assert not footer.evaluate('el => el.contains(document.activeElement)'), 'Extra footer tab stop'
            viewport_report['status'] = 'passed'
        requests = []
        for name, href in list(destinations.items())[:3]:
            page.goto(args.url, wait_until='networkidle')
            page.route(href, lambda route: route.abort())
            link = page.get_by_role('contentinfo').get_by_role('link', name=name, exact=True)
            if name == 'github':
                link.focus()
                with page.expect_event('requestfailed', predicate=lambda request: request.url == href) as outbound:
                    page.keyboard.press('Enter')
            else:
                with page.expect_event('requestfailed', predicate=lambda request: request.url == href) as outbound:
                    link.click()
            page.unroute(href)
            requests.append(outbound.value.url)
            assert outbound.value.url == href, f'{name} did not emit its destination request'
        report['outbound_requests'] = requests
        assert not report['page_errors'], 'Browser page errors occurred'
        report['status'] = 'passed'
        print('PASS: 4 linked word images; 3 non-clickable stars; 4 viewport sizes; keyboard and outbound links')
    except Exception as error:
        report['error'] = str(error)
        print(f'FAIL: {error}')
        raise
    finally:
        (args.evidence_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        context.close()
        browser.close()
