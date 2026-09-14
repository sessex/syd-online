#!/usr/bin/env python3
import argparse
import base64
import io
import json
import math
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', required=True)
parser.add_argument('--evidence-dir', required=True, type=Path)
args = parser.parse_args()
args.evidence_dir.mkdir(parents=True, exist_ok=False)
report = {'status': 'running', 'url': args.url, 'checks': [], 'page_errors': [], 'console_errors': []}


def record(name, **facts):
    report['checks'].append({'name': name, **facts})


def glyphs(ink):
    return ink.evaluate('''el => {
      const range = document.createRange(); range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r => r.width > 1).map(r =>
        ({x:r.x,y:r.y,width:r.width,height:r.height}));
    }''')


def stroke(page, box, reverse=False, vertical=False):
    for i in range(30):
        t = i / 29
        if reverse:
            t = 1 - t
        x = box['x'] + box['width'] * (.1 + .8*t)
        y = box['y'] + box['height']*.55 + math.sin(t*math.pi)*5
        if vertical:
            x = box['x'] + box['width']*.55
            y = box['y'] + box['height']*(.05+.9*t)
        page.mouse.move(x, y)
        page.wait_for_timeout(14)


def atlas(page):
    data = page.locator('[data-chromatic-trail]').evaluate('''canvas => new Promise(resolve => {
      requestAnimationFrame(() => resolve(canvas.toDataURL()));
    })''')
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')


def pixels(image):
    return sum(1 for pixel in image.getdata() if pixel[3] > 3)


def title_pixels(page, ink):
    image = atlas(page)
    rect = page.locator('[data-chromatic-trail]').bounding_box()
    boxes = glyphs(ink)
    left = min(b['x'] for b in boxes)-25
    top = min(b['y'] for b in boxes)-25
    right = max(b['x']+b['width'] for b in boxes)+55
    bottom = max(b['y']+b['height'] for b in boxes)+25
    sx, sy = image.width/rect['width'], image.height/rect['height']
    crop = image.crop((int((left-rect['x'])*sx),int((top-rect['y'])*sy),int((right-rect['x'])*sx),int((bottom-rect['y'])*sy)))
    return pixels(crop)


def clear_trails(page):
    page.emulate_media(reduced_motion='reduce')
    expect(page.locator('[data-chromatic-trail]')).to_have_attribute('data-state','disabled')
    page.emulate_media(reduced_motion='no-preference')
    page.get_by_role('button',name='trouvaille',exact=True).locator('[class*=rowDate]').hover()
    expect(page.locator('[data-chromatic-trail]')).to_have_attribute('data-state','idle')


def load(page):
    page.goto(args.url+'/#projects-heading', wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.get_by_role('button', name='trouvaille', exact=True).scroll_into_view_if_needed()
    page.wait_for_timeout(500)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={'width':1440,'height':1000}, record_video_dir=str(args.evidence_dir/'video'))
    page = context.new_page()
    page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
    page.on('console', lambda message: report['console_errors'].append(message.text) if message.type == 'error' else None)
    video = page.video
    try:
        load(page)
        canvas = page.locator('[data-chromatic-trail]')
        expect(canvas).to_have_count(1)
        page.get_by_role('button', name='trouvaille', exact=True).locator('[class*=rowDate]').hover()
        expect(canvas).to_have_attribute('data-state', 'idle', timeout=15000)
        first = page.get_by_role('button', name='trouvaille', exact=True)
        ink = first.locator('[data-chromatic-ink]')
        box = glyphs(ink)[0]
        clip = {'x':box['x']-30,'y':box['y']-30,'width':box['width']+90,'height':box['height']+75}
        page.mouse.move(0, 0)
        page.wait_for_timeout(2200)
        page.screenshot(path=args.evidence_dir/'desktop-idle.png')
        idle = Image.open(io.BytesIO(page.screenshot(clip=clip))).convert('RGB')
        first.locator('[class*="rowDate"]').hover()
        page.mouse.move(15, 15)
        assert pixels(atlas(page)) == 0
        record('date hover cannot stamp a title trail')
        first.focus()
        first.press('Enter')
        expect(first).to_have_attribute('aria-expanded', 'true')
        first.press('Enter')
        expect(first).to_have_attribute('aria-expanded', 'false')
        first.blur()
        page.wait_for_timeout(600)
        assert pixels(atlas(page)) == 0
        record('keyboard disclosure does not invent pointer motion')
        box = glyphs(ink)[0]
        stroke(page, box)
        expect(canvas).to_have_attribute('data-state', 'active')
        right = atlas(page)
        assert pixels(right) > 30
        right.save(args.evidence_dir/'trail-right-alpha.png')
        page.screenshot(path=args.evidence_dir/'desktop-trail-right.png')
        page.mouse.move(0, 0)
        page.wait_for_timeout(2200)
        persistent = atlas(page)
        assert pixels(persistent) > 5
        current = Image.open(io.BytesIO(page.screenshot(clip=clip))).convert('RGB')
        old_pixels = list(idle.getdata()); new_pixels = list(current.getdata())
        core = [i for i,p in enumerate(old_pixels) if p == (18,18,18)]
        solid_core = [i for i in core if i >= idle.width and i+idle.width < len(old_pixels) and all(old_pixels[j] == (18,18,18) for j in [i-1,i+1,i-idle.width,i+idle.width])]
        changed = sum(1 for i in solid_core if new_pixels[i] != (18,18,18))
        edge_deviation = max(abs(channel-18) for i in core for channel in new_pixels[i])
        assert len(solid_core) > 100 and changed == 0, (len(solid_core), changed)
        assert edge_deviation <= 1, edge_deviation
        current.save(args.evidence_dir/'static-black-detail.png')
        record('color persists after exit while black glyph pixels stay fixed', black_pixels=len(solid_core), changed_black_pixels=changed, antialias_edge_deviation=edge_deviation, trail_pixels=pixels(persistent))
        expect(canvas).to_have_attribute('data-state', 'idle', timeout=18000)
        assert pixels(atlas(page)) == 0
        page.screenshot(path=args.evidence_dir/'desktop-settled.png')
        record('flow fades to transparent and animation sleeps')
        stroke(page, box, reverse=True)
        left = atlas(page)
        assert pixels(left) > 30
        assert ImageChops.difference(right,left).getbbox() is not None
        page.screenshot(path=args.evidence_dir/'desktop-trail-left.png')
        record('opposite pointer directions produce distinct trails')
        clear_trails(page)
        stroke(page, box, vertical=True)
        assert title_pixels(page,ink) > 30
        page.screenshot(path=args.evidence_dir/'desktop-trail-vertical.png')
        record('vertical pointer movement produces trail', visible_pixels=pixels(atlas(page)))
        for name in ['iris','asimov collective','goldman sachs','hypno','vbn','artswrk']:
            button = page.get_by_role('button', name=name, exact=True)
            button.scroll_into_view_if_needed()
            page.wait_for_timeout(160)
            destination = button.locator('[data-chromatic-ink]')
            before_count = title_pixels(page,destination)
            stroke(page, glyphs(destination)[0])
            assert title_pixels(page,destination) > before_count + 30, name
            expect(canvas).to_have_attribute('data-state','active')
        record('all seven project and experience titles respond with one canvas')
        first.scroll_into_view_if_needed()
        first.click()
        page.wait_for_timeout(650)
        first.click()
        page.wait_for_timeout(650)
        stroke(page, glyphs(ink)[0])
        assert pixels(atlas(page)) > 30
        record('trail realigns after disclosure transitions and scrolling')
        page.set_viewport_size({'width':768,'height':1000})
        page.wait_for_timeout(500)
        wrapped = page.get_by_role('button',name='asimov collective',exact=True)
        wrapped.scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        lines = glyphs(wrapped.locator('[data-chromatic-ink]'))
        for line in lines:
            stroke(page,line)
        page.screenshot(path=args.evidence_dir/'narrow-trail.png')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert title_pixels(page,wrapped.locator('[data-chromatic-ink]')) > 30
        record('narrow layout responds without horizontal overflow', line_count=len(lines))
        if len(lines) > 1:
            clear_trails(page)
            wrapped.scroll_into_view_if_needed()
            lines = glyphs(wrapped.locator('[data-chromatic-ink]'))
            for line in lines[:2]:
                page.mouse.move(line['x']+line['width']/2,line['y']+line['height']/2)
            expect(canvas).to_have_attribute('data-state','idle')
            assert pixels(atlas(page)) == 0
            record('jump between wrapped lines does not stamp false velocity')
        page.emulate_media(reduced_motion='reduce')
        expect(canvas).to_have_attribute('data-state','disabled')
        record('reduced motion disables the renderer')
        page.emulate_media(reduced_motion='no-preference',forced_colors='active')
        expect(canvas).to_have_attribute('data-state','disabled')
        record('forced colors retains plain text')
        page.emulate_media(forced_colors='none')
        wrapped.locator('[class*=rowDate]').hover()
        expect(canvas).to_have_attribute('data-state','idle', timeout=10000)
        record('motion preference change restores readiness')
        touch = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        phone = touch.new_page();load(phone)
        expect(phone.locator('[data-chromatic-trail]')).to_have_attribute('data-state','disabled')
        phone.get_by_role('button',name='trouvaille',exact=True).tap()
        expect(phone.get_by_role('button',name='trouvaille',exact=True)).to_have_attribute('aria-expanded','true')
        phone.screenshot(path=args.evidence_dir/'phone-static.png')
        touch.close();record('touch keeps readable titles and working disclosures')
        unavailable = pw.chromium.launch(args=['--disable-webgl'])
        fallback = unavailable.new_page(viewport={'width':1440,'height':1000})
        load(fallback)
        fallback.get_by_role('button',name='trouvaille',exact=True).hover()
        fallback.wait_for_timeout(500)
        expect(fallback.locator('[data-chromatic-trail]')).to_have_attribute('data-state','disabled', timeout=10000)
        fallback.get_by_role('button',name='trouvaille',exact=True).click()
        expect(fallback.get_by_role('button',name='trouvaille',exact=True)).to_have_attribute('aria-expanded','true')
        fallback.screenshot(path=args.evidence_dir/'no-webgl.png')
        unavailable.close();record('unavailable WebGL preserves readable text and disclosure controls')
        assert not report['page_errors'],report['page_errors']
        assert not report['console_errors'],report['console_errors']
        report['status']='passed'
    except Exception as error:
        report['status']='failed';report['failure']=str(error)
        page.screenshot(path=args.evidence_dir/'failure.png')
        raise
    finally:
        (args.evidence_dir/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        context.close()
        video.save_as(str(args.evidence_dir/'chromatic-trails.webm'))
        browser.close()
print(json.dumps({'status':report['status'],'checks':len(report['checks'])}))
