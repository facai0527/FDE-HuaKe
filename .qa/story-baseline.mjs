import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { chromium } = await import('file:///C:/Users/Facai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 });
const report = { capturedAt: new Date().toISOString(), viewport: { width: 1600, height: 800 }, sourceHashes: {}, sections: {}, interactions: {}, errors: [] };
for (const file of ['src/App.jsx', 'src/pages/HomePage.jsx', 'src/pages/ActivityPage.jsx', 'src/pages/ProjectsPage.jsx', 'src/pages/StudentCasesPage.jsx', 'src/pages/AboutPage.jsx']) report.sourceHashes[file] = createHash('sha256').update(readFileSync(file)).digest('hex');
page.on('pageerror', e => report.errors.push(e.message));
const definitions = {
  home: ['.hero-tech-text', '.hands-stage', '.hero-copy'],
  activity: ['h2', '.activity-intro', '.activity-accordion', '.ag-panel'],
  projects: ['h2', '.section-heading', '.tilted-project', '.tilted-card-figure'],
  'student-cases': ['h2', '.student-ticket-grid', '.tear-ticket'],
  about: ['h2', '.about-teaser__body', '.bounceCardsContainer', '.about-teaser__link'],
};
const offsets = { home: 0, activity: 45, projects: 115, 'student-cases': 80, about: 410 };
async function position(id) {
  await page.mouse.move(20, 90);
  await page.evaluate(({ id, offset }) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const section = document.getElementById(id);
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + offset, behavior: 'instant' });
  }, { id, offset: offsets[id] });
  await page.waitForTimeout(750);
}
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? Promise.resolve() : i.decode().catch(() => {}))));
  for (const [id, selectors] of Object.entries(definitions)) {
    await position(id);
    report.sections[id] = await page.evaluate(({ id, selectors }) => {
      const section = document.getElementById(id);
      const sr = section.getBoundingClientRect();
      const rect = r => ({ x: +r.x.toFixed(3), y: +r.y.toFixed(3), width: +r.width.toFixed(3), height: +r.height.toFixed(3) });
      return { section: rect(sr), scrollY, relativeScrollOffset: +(-sr.y).toFixed(3), elements: Object.fromEntries(selectors.map(selector => [selector, [...section.querySelectorAll(selector)].map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { relative: { x: +(r.x - sr.x).toFixed(3), y: +(r.y - sr.y).toFixed(3), width: +r.width.toFixed(3), height: +r.height.toFixed(3) }, viewport: rect(r), text: (el.innerText || '').trim().slice(0, 160), font: cs.font, transform: cs.transform }; })])) };
    }, { id, selectors });
    await page.screenshot({ path: `.qa/story-baseline-${id}.png` });
  }
  writeFileSync('.qa/story-baseline.json', JSON.stringify(report, null, 2));
  console.log('Baseline geometry and five screenshots saved.');
  await position('activity');
  const panels = page.locator('#activity .ag-panel');
  const before = await panels.nth(2).boundingBox();
  await panels.nth(2).hover();
  await page.waitForTimeout(800);
  const after = await panels.nth(2).boundingBox();
  report.interactions.activity = { hoverExpanded: after.width > before.width + 100, beforeWidth: before.width, afterWidth: after.width, active: await panels.nth(2).getAttribute('aria-current') };
  await position('projects');
  const project = page.locator('.tilted-card-figure').first();
  await project.hover({ position: { x: 120, y: 70 } });
  await page.waitForTimeout(700);
  report.interactions.projects = { innerTransform: await project.locator('.tilted-card-inner').evaluate(el => getComputedStyle(el).transform), captionOpacity: await project.locator('figcaption').evaluate(el => getComputedStyle(el).opacity), externalLinks: await page.locator('.tilted-project[href]').evaluateAll(els => els.map(el => ({ href: el.href, target: el.target }))) };
  await position('student-cases');
  const card = page.locator('.student-case').first();
  let box = await card.locator('.tear-ticket__stub').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .22);
  await page.waitForTimeout(350);
  box = await card.locator('.tear-ticket__stub').boundingBox();
  const sx = box.x + box.width / 2, sy = box.y + box.height * .22;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 16; i++) { await page.mouse.move(sx + i * 8, sy + i * 9); await page.waitForTimeout(30); }
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.tear-ticket').hasAttribute('data-used'), { timeout: 3000 });
  report.interactions.student = { dragTore: await card.locator('.tear-ticket').evaluate(el => el.hasAttribute('data-used')), expanded: await card.locator('.student-case__toggle').getAttribute('aria-expanded'), links: await page.locator('.student-case__visit').evaluateAll(els => els.map(el => ({ href: el.href, target: el.target, rel: el.rel }))) };
  await card.locator('.student-case__reset').click();
  report.interactions.student.restored = !(await card.locator('.tear-ticket').evaluate(el => el.hasAttribute('data-used')));
  await position('about');
  const last = page.locator('.bounceCardsContainer .card').last();
  const prior = await last.evaluate(el => getComputedStyle(el).transform);
  await last.hover(); await page.waitForTimeout(700);
  report.interactions.about = { prior, hovered: await last.evaluate(el => getComputedStyle(el).transform), sibling: await page.locator('.bounceCardsContainer .card').first().evaluate(el => getComputedStyle(el).transform) };
} catch (e) { report.errors.push(e.stack || String(e)); }
finally { writeFileSync('.qa/story-baseline.json', JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify({ sections: Object.keys(report.sections), interactions: report.interactions, errors: report.errors }, null, 2));
