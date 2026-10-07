import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { StoryContext, STORY_PAGES } from './StoryContext';
import StoryWorlds from './StoryWorlds';
import './StoryExperience.css';

gsap.registerPlugin(useGSAP);

const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const excluded = 'a,button,input,textarea,select,video,audio,[contenteditable="true"],[role="button"],[tabindex],.accordion-gallery,.activity-accordion,.ag-panel,.tilted-project,.student-case,.bounceCardsContainer,.story-controls,h1,h2,h3,p,li';
const cardSelector = '.ag-panel,.tilted-project,.bounceCardsContainer .card';
const initialId = () => STORY_PAGES.some(page => `#${page.id}` === window.location.hash) ? window.location.hash.slice(1) : 'home';

export default function StoryExperience({ children }) {
  const root = useRef(null);
  const worlds = useRef(null);
  const travelHands = useRef(null);
  const gestureMark = useRef(null);
  const api = useRef({});
  const [activeId, setActiveId] = useState(initialId);
  const [isTraveling, setTraveling] = useState(false);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem('fde-motion-paused') === 'true'; } catch { return false; }
  });
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const settings = useRef({});
  settings.current = { activeId, paused, reducedMotion };
  const navigate = useCallback(id => api.current.navigate?.(id), []);
  const emit = useCallback((kind, options) => worlds.current?.react(kind, options), []);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('fde-motion-paused', String(paused)); } catch { /* Storage may be disabled. */ }
    if (paused || reducedMotion) api.current.cancel?.();
  }, [paused, reducedMotion]);

  useGSAP((context, contextSafe) => {
    const sections = STORY_PAGES.map(page => document.getElementById(page.id));
    const hands = [...travelHands.current.querySelectorAll('img')];
    const setHandX = hands.map(hand => gsap.quickSetter(hand, 'x', 'px'));
    let current = initialId();
    let transition = null;
    let pointer = null;
    let settleTween = null;
    let holdTimer = null;
    let scrollFrame = 0;
    let feedbackAt = 0;
    let lastCard = null;
    let suppressClick = false;
    let wheelStep = 0;
    let wheelIdleTimer = null;
    let disposed = false;
    const seen = new Set(['home']);
    const entranceTweens = new Map();

    const writeHash = (id, push = false) => {
      if (location.hash !== `#${id}`) history[push ? 'pushState' : 'replaceState'](history.state, '', `${location.pathname}${location.search}#${id}`);
    };
    const scrollInstant = top => window.scrollTo({ top, behavior: 'instant' });
    const sectionFor = id => sections[STORY_PAGES.findIndex(page => page.id === id)];
    const readTop = element => element.getBoundingClientRect().top + window.scrollY;
    const updateCurrent = id => {
      current = id;
      root.current.dataset.storyPage = id;
      setActiveId(id);
    };

    // Animate only text wrappers; never write to a card's Motion/GSAP transforms.
    const enterText = contextSafe(id => {
      if (id === 'home' || seen.has(id)) return;
      seen.add(id);
      const section = sectionFor(id);
      const text = [...section.querySelectorAll('.section-kicker, h2, .activity-intro__body, .section-heading > p:last-child, .student-cases-page__intro > p, .about-teaser__body')];
      if (settings.current.reducedMotion || settings.current.paused) return;
      entranceTweens.get(id)?.kill();
      entranceTweens.set(id, gsap.fromTo(text,
        { opacity: 0, y: 13, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.85, stagger: 0.075, ease: 'power3.out', clearProps: 'opacity,transform,clipPath' },
      ));
    });

    const resetGesture = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
      if (pointer?.captured && root.current.hasPointerCapture(pointer.id)) root.current.releasePointerCapture(pointer.id);
      pointer = null;
      setHeld(false);
      root.current.classList.remove('is-background-pressed');
      gestureMark.current.style.opacity = '0';
    };

    const finish = committed => {
      if (!transition) return;
      const { from, to, originalScroll, fromEl, toEl } = transition;
      const id = committed ? to : from;
      if (committed) scrollInstant(readTop(toEl));
      else scrollInstant(originalScroll);
      fromEl.style.removeProperty('opacity');
      toEl.style.removeProperty('opacity');
      travelHands.current.style.opacity = '0';
      travelHands.current.style.visibility = 'hidden';
      worlds.current?.finish(id);
      transition = null;
      wheelStep = 0;
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = null;
      root.current.classList.remove('is-story-traveling');
      root.current.removeAttribute('data-story-progress');
      updateCurrent(id);
      setTraveling(false);
      resetGesture();
      if (committed) { writeHash(id, true); enterText(id); worlds.current?.react('arrival'); }
    };

    const paint = progress => {
      if (!transition || disposed) return;
      const p = clamp(progress);
      transition.p = p;
      const { from, to, fromEl, toEl, originalScroll, handStart } = transition;
      root.current.dataset.storyProgress = p.toFixed(3);
      worlds.current?.progress(p);
      fromEl.style.opacity = String(1 - clamp(p / 0.24));
      toEl.style.opacity = String(clamp((p - 0.84) / 0.16));
      // Content jumps only while invisible. Reversing a short drag restores the exact scroll position.
      if (p >= 0.62 && !transition.scrolled) {
        scrollInstant(readTop(toEl));
        transition.scrolled = true;
      } else if (p < 0.62 && transition.scrolled) {
        scrollInstant(originalScroll);
        transition.scrolled = false;
      }
      const screen = window.innerWidth;
      if (from === 'home') {
        setHandX[0](handStart[0] - screen * 0.83 * p);
        setHandX[1](handStart[1] + screen * 0.8 * p);
        hands[0].style.opacity = String(1 - clamp((p - 0.52) / 0.25));
        hands[1].style.opacity = String(1 - clamp(p / 0.23));
      } else if (to === 'projects') {
        setHandX[1](screen * (0.30 - Math.min(p / 0.16, 1) * 0.28 + clamp((p - 0.16) / 0.64) * 0.8));
        hands[1].style.opacity = String(clamp(p / 0.13) * (1 - clamp((p - 0.6) / 0.24)));
      }
      if (p >= 0.84 && !transition.navChanged) { setActiveId(to); transition.navChanged = true; }
      else if (p < 0.84 && transition.navChanged) { setActiveId(from); transition.navChanged = false; }
    };

    const begin = (to, direction) => {
      if (transition || current === to) return false;
      const fromEl = sectionFor(current);
      const toEl = sectionFor(to);
      if (!fromEl || !toEl) return false;
      entranceTweens.get(current)?.progress(1);
      const handStart = hands.map((_, index) => {
        const side = index ? 'right' : 'left';
        const wrapper = fromEl.querySelector(`.hand-motion--${side}`);
        const image = fromEl.querySelector(`.hands-layer--${side}`);
        return (wrapper ? Number(gsap.getProperty(wrapper, 'x')) || 0 : 0) + (image ? Number(gsap.getProperty(image, 'x')) || 0 : 0);
      });
      transition = { from: current, to, direction, fromEl, toEl, originalScroll: window.scrollY, p: 0, handStart, scrolled: false, navChanged: false };
      setTraveling(true);
      root.current.classList.add('is-story-traveling');
      worlds.current?.prepareTransition({ from: current, to, direction });
      gsap.set(hands, { x: 0, y: 0, opacity: 0 });
      travelHands.current.style.visibility = 'visible';
      travelHands.current.style.opacity = '1';
      if (current === 'home') gsap.set(hands, { opacity: 1 });
      paint(0);
      return true;
    };

    const settle = contextSafe(commit => {
      if (!transition) { resetGesture(); return; }
      resetGesture();
      settleTween?.kill();
      const proxy = { p: transition.p };
      settleTween = gsap.to(proxy, {
        p: commit ? 1 : 0,
        duration: settings.current.reducedMotion || settings.current.paused ? 0.01 : commit ? Math.max(0.5, (1 - proxy.p) * 1.65) : Math.max(0.3, proxy.p * 1.05),
        ease: commit ? 'power2.inOut' : 'power2.out',
        onUpdate: () => paint(proxy.p),
        onComplete: () => finish(commit),
      });
    });

    const pageForWheelStep = step => {
      const index = STORY_PAGES.findIndex(page => page.id === current);
      return STORY_PAGES[index + step] || null;
    };
    const startWheelTransition = (step, progress = 0) => {
      const destination = pageForWheelStep(step);
      if (!destination) return false;
      if (settings.current.reducedMotion || settings.current.paused) {
        navigateTo(destination.id);
        return true;
      }
      const fromIndex = STORY_PAGES.findIndex(page => page.id === current);
      const direction = step > 0 ? STORY_PAGES[fromIndex].direction : 'up';
      if (!begin(destination.id, direction)) return false;
      wheelStep = step;
      paint(progress);
      return true;
    };
    const scheduleWheelSettle = () => {
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = setTimeout(() => {
        wheelIdleTimer = null;
        if (transition) settle(transition.p >= 0.26);
      }, 140);
    };

    const navigateTo = contextSafe((id, { historyNavigation = false } = {}) => {
      if (!STORY_PAGES.some(page => page.id === id)) return;
      if (transition?.to === id && !historyNavigation) return;
      if (transition) { settleTween?.kill(); finish(false); }
      resetGesture();
      if (current === id) { scrollInstant(readTop(sectionFor(id))); return; }
      if (settings.current.reducedMotion || settings.current.paused || historyNavigation) {
        scrollInstant(readTop(sectionFor(id)));
        worlds.current?.finish(id);
        updateCurrent(id);
        writeHash(id, !historyNavigation);
        enterText(id);
        return;
      }
      const fromIndex = STORY_PAGES.findIndex(page => page.id === current);
      const toIndex = STORY_PAGES.findIndex(page => page.id === id);
      const direction = toIndex === fromIndex + 1 ? STORY_PAGES[fromIndex].direction : toIndex > fromIndex ? 'down' : 'up';
      if (begin(id, direction)) settle(true);
    });

    const feedback = (kind, point, strength = 1) => {
      if (settings.current.paused || settings.current.reducedMotion) return;
      worlds.current?.react(kind, { x: point?.x ?? 0.5, y: point?.y ?? 0.5, strength });
    };
    const down = contextSafe(event => {
      if (event.button !== 0 || !event.isPrimary || transition || event.pointerType === 'touch') return;
      if (!(event.target instanceof Element) || event.target.closest(excluded)) return;
      if (!event.target.closest('.site-shell')) return;
      suppressClick = false;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, captured: false, time: performance.now(), last: 0 };
      root.current.classList.add('is-background-pressed');
      gestureMark.current.style.left = `${event.clientX}px`;
      gestureMark.current.style.top = `${event.clientY}px`;
      gestureMark.current.style.opacity = '1';
      holdTimer = setTimeout(() => {
        if (!pointer || pointer.moved) return;
        setHeld(true);
        feedback('hold', { x: pointer.x / innerWidth, y: pointer.y / innerHeight });
      }, 450);
    });
    const move = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (!(event.buttons & 1)) { if (transition) settle(false); else resetGesture(); return; }
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (!pointer.moved && distance < 18) return;
      clearTimeout(holdTimer);
      setHeld(false);
      const page = STORY_PAGES.find(page => page.id === current);
      if (!page.next) { pointer.moved = true; return; }
      const horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
      const vertical = Math.abs(dy) > Math.abs(dx) * 1.2;
      const direction = horizontal ? dx < 0 ? 'left' : 'right' : vertical ? dy < 0 ? 'up' : 'down' : null;
      if (!pointer.moved) {
        pointer.moved = true;
        if (direction !== page.direction) { feedback('release'); resetGesture(); return; }
        event.preventDefault();
        root.current.setPointerCapture(event.pointerId);
        pointer.captured = true;
        if (!begin(page.next, page.direction)) return;
      }
      if (!transition) return;
      event.preventDefault();
      const amount = { left: -dx, right: dx, up: -dy, down: dy }[transition.direction];
      const range = transition.direction === 'left' || transition.direction === 'right' ? innerWidth * 0.42 : innerHeight * 0.48;
      pointer.last = clamp(amount / Math.max(range, 200));
      paint(pointer.last);
      gestureMark.current.style.left = `${event.clientX}px`;
      gestureMark.current.style.top = `${event.clientY}px`;
    };
    const up = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const tap = !pointer.moved;
      const point = { x: pointer.x / innerWidth, y: pointer.y / innerHeight };
      if (transition) { suppressClick = true; settle(transition.p >= 0.3); }
      else { feedback(tap && performance.now() - pointer.time < 450 ? 'tap' : 'release', point); resetGesture(); }
    };
    const cancel = () => { if (transition) settle(false); else { feedback('release'); resetGesture(); } };
    const keydown = event => { if (event.key === 'Escape' && (pointer || transition)) { event.preventDefault(); cancel(); } };
    const wheel = event => {
      if (event.ctrlKey || event.metaKey) return;
      if (pointer) { cancel(); return; }
      const target = event.target instanceof Element ? event.target : null;
      const insideSite = target?.closest('.site-shell') || event.target === document || event.target === document.documentElement || event.target === document.body;
      if (!insideSite) return;
      if (target?.closest('input,textarea,select,video,audio,[contenteditable="true"]')) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * innerHeight : event.deltaY;
      if (!delta) return;
      const step = delta > 0 ? 1 : -1;
      const contentTarget = target?.closest('.activity-accordion,.ag-panel,.tilted-project,.student-case,.bounceCardsContainer');
      // Keep the cards' native page scroll for browsing their long content.
      // Once the section is back at its own top edge, an upward wheel must
      // still enter the reverse route instead of getting swallowed by a card.
      if (contentTarget && !transition) {
        const sectionTop = readTop(sectionFor(current));
        if (delta > 0 || window.scrollY > sectionTop + 1) return;
      }
      if (transition && !wheelStep) { event.preventDefault(); return; }
      const destination = transition ? true : pageForWheelStep(step);
      if (!destination) return;
      event.preventDefault();
      const sensitivity = 1 / Math.max(innerHeight * 0.82, 640);
      const amount = Math.min(Math.abs(delta) * sensitivity, 0.5);

      if (!transition) {
        if (!startWheelTransition(step, amount)) return;
        scheduleWheelSettle();
        return;
      }

      settleTween?.kill();
      settleTween = null;
      const next = transition.p + (step === wheelStep ? amount : -amount);
      if (next < 0 && step !== wheelStep) {
        const residual = -next;
        finish(false);
        if (startWheelTransition(step, residual)) scheduleWheelSettle();
        return;
      }
      paint(clamp(next));
      scheduleWheelSettle();
    };
    const click = event => {
      if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; return; }
      const anchor = event.target.closest?.('a[href^="#"]');
      if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const id = anchor.hash.slice(1);
      if (!STORY_PAGES.some(page => page.id === id)) return;
      event.preventDefault();
      event.stopPropagation();
      navigateTo(id);
    };
    const cardEnter = event => {
      const card = event.target.closest?.(cardSelector);
      if (!card || card === lastCard || card.contains(event.relatedTarget)) return;
      lastCard = card;
      if (performance.now() - feedbackAt < 280 || transition) return;
      feedbackAt = performance.now();
      const box = card.getBoundingClientRect();
      feedback('card', { x: (box.x + box.width / 2) / innerWidth, y: (box.y + box.height / 2) / innerHeight }, 0.65);
    };
    const cardLeave = event => { if (lastCard && !lastCard.contains(event.relatedTarget)) lastCard = null; };
    const ticketObserver = new MutationObserver(records => {
      if (transition) return;
      for (const record of records) {
        if (record.attributeName === 'data-used' && record.target.hasAttribute('data-used')) feedback('tear', null, 1.2);
        if (record.attributeName === 'data-grabbing') feedback(record.target.hasAttribute('data-grabbing') ? 'hold' : 'release', null, 0.5);
      }
    });
    sections[3].querySelectorAll('.tear-ticket').forEach(ticket => ticketObserver.observe(ticket, { attributes: true, attributeFilter: ['data-used', 'data-grabbing'] }));

    const readScroll = () => {
      scrollFrame = 0;
      if (transition || disposed) return;
      const readingLine = innerHeight * 0.35;
      let id = 'home';
      let rect = sections[0].getBoundingClientRect();
      for (const section of sections) {
        const bounds = section.getBoundingClientRect();
        if (bounds.top <= readingLine) { id = section.id; rect = bounds; }
      }
      if (id !== current) { updateCurrent(id); writeHash(id); enterText(id); }
      worlds.current?.setScrollProgress(clamp(-rect.top / Math.max(rect.height - innerHeight, 1)));
    };
    const scheduleScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll); };
    const hash = () => navigateTo(initialId(), { historyNavigation: true });
    const visibility = () => { if (document.hidden) cancel(); };
    const resize = () => { cancel(); scheduleScroll(); };

    api.current = { navigate: navigateTo, cancel };
    root.current.dataset.storyPage = current;
    root.current.addEventListener('pointerdown', down);
    root.current.addEventListener('click', click, true);
    root.current.addEventListener('pointerover', cardEnter);
    root.current.addEventListener('pointerout', cardLeave);
    root.current.addEventListener('focusin', cardEnter);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', keydown);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('hashchange', hash);
    document.addEventListener('visibilitychange', visibility);
    // A deep link must be placed after fonts settle; it must not play every earlier chapter.
    document.fonts.ready.then(() => { if (!disposed) { if (initialId() !== 'home') scrollInstant(readTop(sectionFor(initialId()))); scheduleScroll(); } });

    return () => {
      disposed = true;
      settleTween?.kill();
      clearTimeout(holdTimer);
      clearTimeout(wheelIdleTimer);
      cancelAnimationFrame(scrollFrame);
      entranceTweens.forEach(tween => tween.kill());
      ticketObserver.disconnect();
      if (transition) { transition.fromEl.style.removeProperty('opacity'); transition.toEl.style.removeProperty('opacity'); }
      root.current?.classList.remove('is-story-traveling', 'is-background-pressed');
      root.current?.removeEventListener('pointerdown', down);
      root.current?.removeEventListener('click', click, true);
      root.current?.removeEventListener('pointerover', cardEnter);
      root.current?.removeEventListener('pointerout', cardLeave);
      root.current?.removeEventListener('focusin', cardEnter);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('hashchange', hash);
      document.removeEventListener('visibilitychange', visibility);
      api.current = {};
    };
  }, { scope: root });

  const page = STORY_PAGES.find(page => page.id === activeId);
  const value = useMemo(() => ({ activeId, isTraveling, paused, reducedMotion, held, navigate, emit }), [activeId, isTraveling, paused, reducedMotion, held, navigate, emit]);
  return (
    <StoryContext.Provider value={value}>
      <div className="story-experience" ref={root}>
        <StoryWorlds ref={worlds} activeId={activeId} paused={paused} reducedMotion={reducedMotion} />
        {children}
        <div className="hands-stage story-travel-hands" ref={travelHands} aria-hidden="true">
          <img className="hands-layer hands-layer--left" src="/assets/fde-hand-robot-interaction.png" alt="" draggable="false" />
          <img className="hands-layer hands-layer--right" src="/assets/fde-hand-robot-interaction.png" alt="" draggable="false" />
        </div>
        <div className="story-gesture-mark" ref={gestureMark} aria-hidden="true"><i /></div>
        <div className="story-controls">
          <button type="button" className="story-direction-cue" onClick={() => page.next ? navigate(page.next) : emit('tap')} disabled={isTraveling} aria-label={page.next ? `前往${STORY_PAGES.find(item => item.id === page.next).label}，也可按住背景${page.cue}` : '点亮科技场景的信号'}>
            <span aria-hidden="true">{page.arrow}</span><span className="story-direction-cue__desktop">{page.cue}</span><span className="story-direction-cue__mobile">{page.next ? '继续探索' : '点亮信号'}</span>
          </button>
          <button type="button" className="story-motion-toggle" aria-pressed={paused || reducedMotion} disabled={reducedMotion} onClick={() => setPaused(value => !value)} aria-label={reducedMotion ? '已跟随系统减少动态效果' : paused ? '播放背景动态' : '暂停背景动态'} title={reducedMotion ? '已跟随系统减少动态效果' : paused ? '播放背景动态' : '暂停背景动态'}>
            <svg viewBox="0 0 20 20" aria-hidden="true">{paused || reducedMotion ? <path d="M7 4.5 15 10l-8 5.5Z" /> : <path d="M6 5h2v10H6zm6 0h2v10h-2z" />}</svg>
          </button>
        </div>
        <span className="story-sr-only" role="status" aria-live="polite">{isTraveling ? '正在进入下一个场景' : `${page.label}，${page.next ? page.cue : '科技空间'}`}</span>
      </div>
    </StoryContext.Provider>
  );
}
