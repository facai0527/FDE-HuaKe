import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:5173/';
mkdirSync('.qa', { recursive: true });
const results = [];
const errors = [];

async function settle(page) {
  await page.waitForTimeout(100);
}

async function load(page, hash = '') {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}${hash}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
}

async function scroll(page, top) {
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), top);
  await settle(page);
}

async function state(page) {
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    const hands = [...document.querySelectorAll('.hands-layer')].map((el, index) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const left = box.left + (index === 0 ? 0 : box.width / 2);
      const right = box.left + (index === 0 ? box.width / 2 : box.width);
      return {
        x: new DOMMatrixReadOnly(style.transform).m41,
        visibility: style.visibility,
        onScreen: style.visibility !== 'hidden' && box.height > 0 && left < innerWidth && right > 0,
      };
    });
    return {
      y: scrollY, height: innerHeight, width: innerWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
      home: rect('#home'), hero: rect('.hero'), copy: rect('.hero-copy__motion'),
      activity: rect('#activity'), nav: rect('nav'), hands,
      active: document.querySelector('nav [aria-current="page"]')?.getAttribute('href'),
      heroTransform: getComputedStyle(document.querySelector('.hero')).transform,
      activityOpacity: getComputedStyle(document.querySelector('#activity')).opacity,
    };
  });
}

async function desktop(browser, name, viewport) {
  const page = await browser.newPage({ viewport });
  await load(page);
  const initial = await state(page);
  const runway = initial.home.height - initial.hero.height;
  assert.equal(initial.y, 0);
  assert.equal(initial.hero.top, 0);
  assert.equal(initial.overflow, 0);
  assert.ok(initial.copy.top > initial.nav.bottom);
  assert.ok(initial.hands.every(hand => !hand.onScreen), 'Initial home must show text without hands');
  await page.mouse.wheel(0, -1200);
  await settle(page);
  assert.equal((await state(page)).y, 0, 'Upward wheel at home must stay at the top');

  let previous = initial;
  for (const progress of [0.15, 0.3, 0.44, 0.5, 0.65, 0.8]) {
    await scroll(page, runway * progress);
    const s = await state(page);
    assert.ok(Math.abs(s.copy.top - initial.copy.top) < 1, 'Copy must stay still throughout hand entry, hold and exit');
    if (progress < 0.38) {
      assert.ok(Math.abs(s.hands[0].x) < Math.abs(previous.hands[0].x), 'First scroll interval must bring hands in');
      assert.ok(s.hands.every(hand => hand.onScreen));
    } else if (progress < 0.54) {
      assert.ok(s.hands.every(hand => hand.onScreen && Math.abs(hand.x) < 1), 'Hands must hold their joined pose before retreat');
      await page.waitForTimeout(200);
      assert.deepEqual((await state(page)).hands, s.hands, 'No automatic retreat while scrolling stops');
      if (progress === 0.44) await page.screenshot({ path: `.qa/${name}-hands-entered.png` });
    } else {
      assert.ok(Math.abs(s.hands[0].x) > Math.abs(previous.hands[0].x), 'Further scrolling must retract hands');
    }
    assert.equal(s.hero.top, 0);
    assert.ok(s.activity.top >= s.hero.bottom - 1, 'Pages must not overlap');
    previous = s;
  }
  await scroll(page, runway * 0.95);
  const retreat = await state(page);
  assert.ok(retreat.hands.every(hand => hand.visibility === 'hidden'));
  assert.ok(retreat.copy.top < initial.copy.top - 20, 'Copy must move up after hands disappear');
  assert.equal(retreat.heroTransform, 'none');

  await scroll(page, runway + viewport.height * 0.35);
  const transition = await state(page);
  assert.ok(transition.hands.every(hand => hand.visibility === 'hidden'));
  assert.ok(Math.abs(transition.hero.bottom - transition.activity.top) < 1, 'Page two must follow the home edge');
  assert.equal(transition.activityOpacity, '1');
  assert.equal(transition.nav.top, initial.nav.top);
  await page.screenshot({ path: `.qa/${name}-transition.png` });

  await scroll(page, 0);
  await page.mouse.wheel(0, initial.home.height);
  await page.waitForTimeout(250);
  const fast = await state(page);
  assert.ok(fast.hands.every(hand => hand.visibility === 'hidden'));
  assert.equal(fast.active, '#activity');

  for (const id of ['activity', 'projects', 'student-cases', 'about', 'home']) {
    await page.locator(`nav a[href="#${id}"]`).click();
    await page.waitForFunction(id => Math.abs(document.getElementById(id).getBoundingClientRect().top) < 2, id);
    await page.waitForFunction(id => document.querySelector('nav [aria-current="page"]')?.getAttribute('href') === `#${id}`, id);
    assert.equal((await state(page)).nav.top, initial.nav.top);
  }
  const returned = await state(page);
  assert.equal(returned.y, 0);
  assert.ok(returned.hands.every(hand => !hand.onScreen), 'Returning home must restore the text-only opening');
  await page.screenshot({ path: `.qa/${name}-home.png` });
  await page.locator('nav a[href="#activity"]').click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#activity').getBoundingClientRect().top) < 2);
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  assert.ok(Math.abs((await state(page)).activity.top) < 2, 'Reload at an anchor must preserve the page');
  assert.equal(await page.locator('#activity .ag-panel').count(), 4);
  await page.locator('#activity .ag-panel').nth(1).hover();
  await page.waitForTimeout(700);
  assert.ok(await page.locator('#activity .ag-panel').nth(1).evaluate(el => el.classList.contains('ag-panel--active')));
  await page.locator('#activity .ag-panel').nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  assert.ok(await page.locator('#activity .ag-panel').nth(2).evaluate(el => el === document.activeElement && el.classList.contains('ag-panel--active')));
  await page.mouse.move(10, 400);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `.qa/${name}-activity.png` });
  const beforeWheel = (await state(page)).y;
  await page.mouse.move(viewport.width / 2, viewport.height * 0.7);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.ok((await state(page)).y > beforeWheel, 'The gallery must not swallow page scrolling');
  results.push({ browser: name, checks: 'text-only opening, hand entry, scroll hold, hand exit then copy exit, top boundary, no overlap, fast wheel, all five links, reverse, hash reload, accordion keyboard/hover, wheel over gallery' });
  await page.close();
}

const chrome = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await desktop(chrome, 'chrome', { width: 1440, height: 900 });
  const mobile = await chrome.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await load(mobile);
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 670 }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 670 - step * 42 }] });
    await mobile.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // A first tap during native inertial scrolling is consumed by the browser
  // to stop momentum; wait for that gesture to finish before testing the link.
  await mobile.waitForTimeout(1200);
  assert.ok((await state(mobile)).y > 150, 'Native touch scroll must advance');
  await mobile.locator('nav a[href="#activity"]').tap();
  await mobile.waitForFunction(() => Math.abs(document.querySelector('#activity').getBoundingClientRect().top) < 2);
  const panels = mobile.locator('#activity .ag-panel');
  await panels.nth(2).tap();
  await mobile.waitForTimeout(700);
  const heights = await panels.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
  assert.ok(heights[2] > heights[0] * 1.8, 'Tapped mobile photo should expand');
  assert.equal((await state(mobile)).overflow, 0);
  await mobile.screenshot({ path: '.qa/mobile-activity-final.png' });
  await mobile.setViewportSize({ width: 768, height: 1024 });
  await mobile.waitForTimeout(500);
  assert.equal((await state(mobile)).overflow, 0);
  await mobile.locator('nav a[href="#home"]').tap();
  await mobile.waitForFunction(() => scrollY === 0);
  assert.equal((await state(mobile)).hero.top, 0);
  results.push({ browser: 'Chrome mobile emulation', checks: 'native touch scroll, navigation tap, photo expansion, portrait/tablet resize, no overflow' });
  await mobile.close();

  const reduced = await chrome.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await load(reduced);
  const stable = await state(reduced);
  assert.equal(stable.home.height, 800);
  await scroll(reduced, 300);
  assert.ok((await state(reduced)).hands.every(hand => !hand.onScreen));
  await reduced.locator('nav a[href="#activity"]').click();
  await settle(reduced);
  assert.ok(Math.abs((await state(reduced)).activity.top) < 2);
  await reduced.emulateMedia({ reducedMotion: 'no-preference' });
  await scroll(reduced, 0);
  assert.equal((await state(reduced)).hero.top, 0);
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.waitForFunction(() => document.querySelector('#home').getBoundingClientRect().height === innerHeight);
  assert.equal((await state(reduced)).home.height, 800);
  results.push({ browser: 'Chrome reduced motion', checks: 'static home, normal flow, navigation and live preference cleanup' });
  await reduced.close();
} finally {
  await chrome.close();
}

const edge = await chromium.launch({ channel: 'msedge', headless: true });
try {
  await desktop(edge, 'edge-wide', { width: 2560, height: 1230 });
} finally {
  await edge.close();
}

assert.deepEqual(errors, [], 'No browser runtime errors');
writeFileSync('.qa/transition-results.json', JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results, errors }, null, 2));
