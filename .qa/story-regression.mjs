import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = await import('file:///C:/Users/Facai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const baseline = JSON.parse(readFileSync('.qa/story-baseline.json', 'utf8'));
const report = { startedAt: new Date().toISOString(), checks: [], consoleErrors: [], geometry: {}, screenshots: [] };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
for (let i = 0; readFileSync('src/pages/HomePage.jsx', 'utf8').includes('ScrollTrigger'); i++) {
  if (i >= 150) throw new Error('HomePage still has legacy ScrollTrigger after five minutes; formal regression not started.');
  if (i % 15 === 0) console.log('WAIT: HomePage still has legacy ScrollTrigger; waiting before formal browser run.');
  await delay(2000);
}
await delay(2000);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const desktop = await browser.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 });
const page = await desktop.newPage();
function watch(p, label) {
  p.on('pageerror', e => report.consoleErrors.push({ label, type: 'pageerror', message: e.message }));
  p.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push({ label, type: 'console', message: msg.text() }); });
}
watch(page, 'desktop');
async function check(name, fn) {
  try { const detail = await fn(); report.checks.push({ name, pass: true, detail }); console.log(`PASS ${name}: ${JSON.stringify(detail || {})}`); }
  catch (e) { report.checks.push({ name, pass: false, error: e.message }); console.log(`FAIL ${name}: ${e.message}`); }
  writeFileSync('.qa/story-regression-results.json', JSON.stringify(report, null, 2));
}
async function load(p, hash = '') {
  await p.goto(`http://127.0.0.1:5173/${hash}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForSelector('.story-experience[data-story-page]');
  await p.waitForTimeout(1600);
}
async function stable(p, id) {
  await p.waitForFunction(id => { const el = document.querySelector('.story-experience'); return el?.dataset.storyPage === id && !el.hasAttribute('data-story-progress'); }, id, { timeout: 6000 });
  await p.waitForTimeout(1250);
}
async function nav(p, id) { await p.locator(`.jelly-radio a[href="#${id}"]`).click(); await stable(p, id); }
async function shot(p, name) { const path = `.qa/story-${name}.png`; await p.screenshot({ path }); report.screenshots.push(path); }
async function state(p) { return p.locator('.story-experience').evaluate(el => ({ page: el.dataset.storyPage, progress: el.dataset.storyProgress, hash: location.hash, scrollY })); }
async function drag(p, start, end, name) {
  await p.mouse.move(...start); await p.mouse.down();
  await p.mouse.move((start[0]+end[0])/2, (start[1]+end[1])/2, { steps: 10 });
  await p.waitForTimeout(90);
  const middle = await state(p);
  if (name) await shot(p, `transition-${name}-mid`);
  await p.mouse.move(...end, { steps: 10 }); await p.mouse.up();
  return middle;
}
try {
  await load(page);
  await page.waitForTimeout(1800);
  await check('home initial hands and full viewport', async () => {
    await stable(page, 'home');
    const metrics = await page.locator('#home').evaluate(el => ({ height: el.getBoundingClientRect().height, viewport: innerHeight, hands: [...el.querySelectorAll('.hands-layer')].map(i => ({ loaded: i.complete && i.naturalWidth > 0, visibility: getComputedStyle(i).visibility, display: getComputedStyle(i).display })) }));
    assert.ok(Math.abs(metrics.height - metrics.viewport) <= 1); assert.equal(metrics.hands.length, 2); assert.ok(metrics.hands.every(i => i.loaded && i.display !== 'none' && i.visibility !== 'hidden'));
    await shot(page, 'final-home'); return metrics;
  });
  await check('short drag cancels and restores position', async () => {
    const before = await state(page); await drag(page, [780,690], [740,690]); await stable(page, 'home'); const after=await state(page);
    assert.ok(Math.abs(after.scrollY-before.scrollY)<1); return { before, after };
  });
  await check('opposite drag does not navigate', async () => { await drag(page,[780,690],[1000,690]); await page.waitForTimeout(500); assert.equal((await state(page)).page,'home'); return await state(page); });
  const routes=[['left','home','activity',[780,690],[230,690]],['right','activity','projects',[50,300],[600,300]],['up','projects','student-cases',[55,650],[55,220]],['down','student-cases','about',[1545,220],[1545,650]]];
  for(const [direction,from,to,start,end] of routes) await check(`real drag ${direction}: ${from} to ${to}`,async()=>{
    if((await state(page)).page!==from) await nav(page,from);
    const middle=await drag(page,start,end,direction); assert.ok(Number(middle.progress)>0,`No drag progress at midpoint: ${JSON.stringify(middle)}`);
    await stable(page,to); assert.equal((await state(page)).hash,`#${to}`); await shot(page,`final-${to}`); return {middle,after:await state(page)};
  });
  for(const id of ['activity','projects','student-cases','about']) await check(`original geometry ${id}`,async()=>{
    await nav(page,id); await page.mouse.move(20,90);
    const ref=baseline.sections[id];
    await page.evaluate(({id,offset})=>{const el=document.getElementById(id);window.scrollTo({top:el.getBoundingClientRect().top+scrollY+offset,behavior:'instant'});},{id,offset:ref.relativeScrollOffset});
    await page.waitForTimeout(1000);
    const selectors=Object.keys(ref.elements);
    const actual=await page.evaluate(({id,selectors})=>{const section=document.getElementById(id),sr=section.getBoundingClientRect();return Object.fromEntries(selectors.map(s=>[s,[...section.querySelectorAll(s)].map(el=>{const r=el.getBoundingClientRect();return{x:r.x-sr.x,y:r.y-sr.y,width:r.width,height:r.height};})]));},{id,selectors});
    const differences=[];for(const s of selectors){assert.equal(actual[s].length,ref.elements[s].length,`${s} count`);actual[s].forEach((a,i)=>{for(const key of ['x','y','width','height']){const delta=a[key]-ref.elements[s][i].relative[key];if(Math.abs(delta)>1)differences.push({selector:s,index:i,key,delta});}});}
    report.geometry[id]={actual,differences};assert.deepEqual(differences,[]);return{selectors:selectors.length,maxTolerance:1};
  });
  await check('activity hover accordion preserved',async()=>{await nav(page,'activity');const panels=page.locator('#activity .ag-panel');await page.mouse.move(20,90);const before=await panels.nth(2).boundingBox();await panels.nth(2).hover();await page.waitForTimeout(750);const after=await panels.nth(2).boundingBox();assert.ok(after.width>before.width+100);assert.equal((await state(page)).page,'activity');return{before:before.width,after:after.width};});
  await check('project tilt tooltip and exact links preserved',async()=>{await nav(page,'projects');const card=page.locator('.tilted-card-figure').first();await card.hover({position:{x:100,y:80}});await page.waitForTimeout(650);const opacity=await card.locator('figcaption').evaluate(el=>Number(getComputedStyle(el).opacity));assert.ok(opacity>.8);const links=await page.locator('.tilted-project[href]').evaluateAll(els=>els.map(el=>({href:el.href,target:el.target})));assert.deepEqual(links,baseline.interactions.projects.externalLinks);assert.equal((await state(page)).page,'projects');return{opacity,links};});
  await check('student real drag tear cannot navigate; details reset and links preserved',async()=>{
    await nav(page,'student-cases');const card=page.locator('.student-case').first();await page.mouse.move(20,90);await page.waitForTimeout(550);let b=await card.locator('.tear-ticket__stub').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height*.22);await page.waitForTimeout(350);b=await card.locator('.tear-ticket__stub').boundingBox();const sx=b.x+b.width/2,sy=b.y+b.height*.22;await page.mouse.move(sx,sy);await page.mouse.down();for(let i=1;i<=16;i++){await page.mouse.move(sx+i*8,sy+i*9);await page.waitForTimeout(30);}await page.mouse.up();await page.waitForFunction(()=>document.querySelector('.tear-ticket').hasAttribute('data-used'),null,{timeout:4000});assert.equal((await state(page)).page,'student-cases');assert.equal(await card.locator('.student-case__toggle').getAttribute('aria-expanded'),'true');await shot(page,'student-torn');const links=await page.locator('.student-case__visit').evaluateAll(els=>els.map(el=>({href:el.href,target:el.target,rel:el.rel})));assert.deepEqual(links,baseline.interactions.student.links);await card.locator('.student-case__reset').click();assert.equal(await card.locator('.tear-ticket').getAttribute('data-used'),null);await card.locator('.student-case__toggle').click();assert.equal(await card.locator('.student-case__toggle').getAttribute('aria-expanded'),'true');await card.locator('.student-case__toggle').click();return{torn:true,restored:true,links:links.length};
  });
  await check('about hover fan preserved',async()=>{await nav(page,'about');await page.evaluate(()=>{const s=document.getElementById('about');scrollTo({top:s.getBoundingClientRect().top+scrollY+410,behavior:'instant'});});const last=page.locator('.bounceCardsContainer .card').last();await last.hover();await page.waitForTimeout(650);const transform=await last.evaluate(el=>getComputedStyle(el).transform);assert.match(transform,/matrix\(1, 0, 0, 1/);return{transform};});
  await check('native wheel remains usable over content',async()=>{await nav(page,'activity');const before=await page.evaluate(()=>scrollY);await page.mouse.move(700,500);await page.mouse.wheel(0,220);await page.waitForTimeout(500);const after=await page.evaluate(()=>scrollY);assert.ok(after>before+100);return{before,after,page:(await state(page)).page};});
  await check('navigation hash and browser back',async()=>{await nav(page,'projects');await nav(page,'student-cases');await page.goBack();await stable(page,'projects');assert.equal((await state(page)).hash,'#projects');return await state(page);});
  await check('direct hash link places chapter without earlier content',async()=>{await load(page,'#student-cases');await stable(page,'student-cases');const top=await page.locator('#student-cases').evaluate(el=>el.getBoundingClientRect().top);assert.ok(Math.abs(top)<2);assert.equal(await page.locator('.jelly-radio [aria-current="page"]').getAttribute('href'),'#student-cases');return{top};});
  await check('pause freezes ambient and resumes',async()=>{await nav(page,'activity');const toggle=page.locator('.story-motion-toggle');if(await toggle.getAttribute('aria-pressed')==='true')await toggle.click();await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');await page.waitForTimeout(150);const sample=()=>page.locator('[data-world="activity"] .story-world__foliage,[data-world="activity"] .story-world__light').evaluateAll(els=>els.map(el=>({transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity})));const a=await sample();await page.waitForTimeout(700);const b=await sample();assert.deepEqual(a,b);await toggle.click();await page.waitForTimeout(700);const c=await sample();assert.notDeepEqual(c,b);return{sampled:a.length};});
  await check('reduced motion keeps original hands and instant navigation',async()=>{const context=await browser.newContext({viewport:{width:1600,height:800},reducedMotion:'reduce'});const p=await context.newPage();watch(p,'reduced');try{await load(p);const hands=await p.locator('#home .hands-stage').evaluate(el=>({display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility}));assert.notEqual(hands.display,'none');assert.notEqual(hands.visibility,'hidden');assert.equal(await p.locator('.story-motion-toggle').getAttribute('disabled'),'');await nav(p,'projects');assert.equal((await state(p)).page,'projects');await shot(p,'reduced-projects');return{hands};}finally{await context.close();}});
  await check('mobile layout, touch scroll, ticket tear and navigation',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await context.newPage();watch(p,'mobile');try{await load(p);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);await p.locator('.story-direction-cue').tap();await stable(p,'activity');const before=await p.evaluate(()=>scrollY);const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:15,y:680}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:15,y:680-i*45}]});await p.waitForTimeout(30);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(350);assert.ok(await p.evaluate(()=>scrollY)>before+100);await nav(p,'student-cases');const card=p.locator('.student-case').first();const stub=card.locator('.tear-ticket__stub');await stub.scrollIntoViewIfNeeded();const b=await stub.boundingBox();const tx=b.x+b.width/2,ty=b.y+b.height*.2;const startScroll=await p.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});for(let i=1;i<=16;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+i*1.5,y:ty+i*10}]});await p.waitForTimeout(30);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>document.querySelector('.tear-ticket').hasAttribute('data-used'),null,{timeout:4000});assert.equal((await state(p)).page,'student-cases');assert.ok(Math.abs((await p.evaluate(()=>scrollY))-startScroll)<2);await shot(p,'mobile-ticket');await card.locator('.student-case__reset').tap();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);return{touchScroll:true,ticket:true,width:390};}finally{await context.close();}
  });
}finally{await browser.close();report.finishedAt=new Date().toISOString();report.summary={pass:report.checks.filter(c=>c.pass).length,fail:report.checks.filter(c=>!c.pass).length,consoleErrors:report.consoleErrors.length};writeFileSync('.qa/story-regression-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));}
if(report.checks.some(c=>!c.pass)||report.consoleErrors.length)process.exitCode=1;
