import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { studentCases } from '../src/data/studentCases.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const reports = [];

async function load(page) {
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#student-cases', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#student-cases').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(300);
}

async function checkLinks(page) {
  const links = await page.locator('.student-case__visit').evaluateAll(elements => elements.map(el => ({ href: el.href, rel: el.rel, target: el.target })));
  assert.deepEqual(links.map(link => link.href), studentCases.map(entry => entry.href));
  assert.ok(links.every(link => link.target === '_blank' && link.rel.includes('noopener')));
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await load(page);
  assert.equal(await page.locator('.tear-ticket').count(), 5);
  assert.ok(await page.locator('.tear-ticket__image').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  await checkLinks(page);
  const card = page.locator('.student-case').first();
  const stub = card.locator('.tear-ticket__piece--stub');
  await stub.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.tear-ticket').hasAttribute('data-used'));
  assert.equal(await card.locator('.student-case__toggle').getAttribute('aria-expanded'), 'true');
  assert.ok(await card.locator('.student-case__reset').isVisible());
  assert.ok(await card.locator('.student-case__toggle').evaluate(el => el === document.activeElement));
  await card.locator('.student-case__reset').click();
  assert.equal(await card.locator('.tear-ticket').getAttribute('data-used'), null);
  assert.equal(await stub.getAttribute('tabindex'), '0');
  assert.equal(await card.locator('.student-case__toggle').getAttribute('aria-expanded'), 'false');
  await stub.focus();
  await page.keyboard.press('Space');
  assert.ok(await card.locator('.tear-ticket').evaluate(el => el.hasAttribute('data-used')));
  await card.locator('.student-case__reset').click();

  const second = page.locator('.student-case').nth(1);
  await second.locator('.student-case__toggle').click();
  assert.ok((await second.locator('.student-case__details').innerText()).includes('17 页'));
  assert.equal(await second.locator('.tear-ticket').getAttribute('data-used'), null);
  await second.locator('.student-case__toggle').click();

  await page.mouse.move(10, 100);
  await page.waitForTimeout(600);
  let box = await card.locator('.tear-ticket__stub').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .22);
  await page.waitForTimeout(400);
  box = await card.locator('.tear-ticket__stub').boundingBox();
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height * .22;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let step = 1; step <= 16; step++) {
    await page.mouse.move(sx + step * 8, sy + step * 9);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.tear-ticket').hasAttribute('data-used'));
  await checkLinks(page);
  await page.screenshot({ path: '.qa/tickets-torn-desktop.png' });
  await card.locator('.student-case__reset').click();

  const beforeScroll = await page.evaluate(() => scrollY);
  const image = await card.locator('.tear-ticket__image').boundingBox();
  await page.mouse.move(image.x + 50, image.y + 30);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(y => scrollY > y, beforeScroll), 'Ticket artwork must allow normal page scrolling');
  reports.push('Desktop: five real images and URLs, Enter/Space tear, focus transfer, restore, direct details toggle, real mouse drag and wheel scroll.');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await load(mobile);
  const mobileCard = mobile.locator('.student-case').first();
  const touchBox = await mobileCard.locator('.tear-ticket__stub').boundingBox();
  const tx = touchBox.x + touchBox.width / 2;
  const ty = touchBox.y + touchBox.height * .2;
  const cdp = await mobile.context().newCDPSession(mobile);
  const y = await mobile.evaluate(() => scrollY);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let step = 1; step <= 16; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + step * 1.5, y: ty + step * 10 }] });
    await mobile.waitForTimeout(30);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForFunction(() => document.querySelector('.tear-ticket').hasAttribute('data-used'));
  assert.ok(Math.abs(await mobile.evaluate(() => scrollY) - y) < 2, 'Dragging a ticket stub must not swipe to another page');
  await mobileCard.locator('.student-case__reset').tap();
  await mobile.locator('#student-cases').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  await mobile.screenshot({ path: '.qa/tickets-mobile-final.png' });
  reports.push('Mobile: actual touch drag tears and reveals highlights; reset works without changing pages.');
  await mobile.close();

  const responsive = await browser.newPage({ viewport: { width: 320, height: 850 } });
  await load(responsive);
  for (const width of [320, 768, 1440, 2560]) {
    await responsive.setViewportSize({ width, height: 1000 });
    await responsive.waitForTimeout(750);
    await responsive.locator('#student-cases').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    assert.equal(await responsive.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    const dimensions = await responsive.locator('.tear-ticket').evaluateAll(els => els.map(el => ({ w: el.clientWidth, h: el.clientHeight })));
    assert.ok(dimensions.every(d => d.w > 200 && d.h > 150));
    if (width === 1440) await responsive.screenshot({ path: '.qa/tickets-desktop-final.png' });
  }
  reports.push('Responsive: no horizontal overflow at 320, 768, 1440 and 2560 px; all tickets remain usable.');
  await responsive.close();

  const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await load(reduced);
  await reduced.locator('.tear-ticket__piece--stub').first().focus();
  await reduced.keyboard.press('Enter');
  assert.ok(await reduced.locator('.tear-ticket').first().evaluate(el => el.hasAttribute('data-used') && el.hasAttribute('data-instant')));
  await reduced.locator('.student-case__reset').first().click();
  assert.equal(await reduced.locator('.tear-ticket').first().getAttribute('data-used'), null);
  reports.push('Reduced motion: instant keyboard activation and reset work.');
  await reduced.close();
} finally {
  await browser.close();
}

assert.deepEqual(errors, []);
writeFileSync('.qa/tickets-results.json', JSON.stringify({ reports, errors }, null, 2));
console.log(JSON.stringify({ reports, errors }, null, 2));
