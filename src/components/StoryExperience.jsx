import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StoryContext, STORY_PAGES, STORY_CHAPTERS, chapterIdFor } from './StoryContext';
import StoryWorlds from './StoryWorlds';
import PixelSwap from './PixelSwap';
import { chapterContentTransition } from './chapterContentTransition';
import './StoryExperience.css';

const initialId = () => STORY_PAGES.find(page => `#${page.id}` === window.location.hash)?.id || 'home';
const editable = 'input,textarea,select,[contenteditable="true"]';

export default function StoryExperience({ children }) {
  const root = useRef(null);
  const pixelSwap = useRef(null);
  const worlds = useRef(null);
  const api = useRef({});
  const [activeId, setActiveId] = useState(initialId);
  const [destinationId, setDestinationId] = useState(initialId);
  const [isTraveling, setTraveling] = useState(false);
  const [enteringId, setEnteringId] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const settings = useRef({});
  settings.current = { reducedMotion };
  const navigate = useCallback(id => api.current.navigate?.(id), []);

  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('perf')) return;
    let canceled = false;
    let disconnect;
    import('./transitionMetrics').then(({ observeTransitionFrames }) => {
      if (!canceled) disconnect = observeTransitionFrames(root.current);
    });
    return () => { canceled = true; disconnect?.(); };
  }, []);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (reducedMotion) api.current.complete?.();
  }, [reducedMotion]);

  useEffect(() => {
    // Decode already-loaded gallery images during idle time, before their first
    // visible frame. Work one image at a time and yield during navigation.
    const images = [...root.current.querySelectorAll('.site-shell img')];
    let canceled = false;
    let scheduled;
    const schedule = window.requestIdleCallback
      ? callback => window.requestIdleCallback(callback, { timeout: 1500 })
      : callback => window.setTimeout(callback, 150);
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const next = () => {
      if (canceled || !images.length) return;
      if (root.current.classList.contains('is-story-traveling')) { scheduled = schedule(next); return; }
      const image = images.shift();
      image.decoding = 'async';
      image.decode().catch(() => {}).finally(() => { if (!canceled) scheduled = schedule(next); });
    };
    scheduled = schedule(next);
    return () => { canceled = true; cancel(scheduled); };
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    const sections = STORY_PAGES.map(page => element.querySelector(`.site-shell > #${page.id}`));
    let current = initialId();
    let transition = null;
    let animations = [];
    let wheelTotal = 0;
    let wheelTime = -Infinity;
    let wheelLocked = false;
    let nativeScrolling = false;
    let touch = null;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    const sectionFor = id => sections[STORY_PAGES.findIndex(page => page.id === id)];
    const canScroll = (region, direction) => region && /^(auto|scroll|overlay)$/.test(getComputedStyle(region).overflowY) && region.scrollHeight > region.clientHeight + 1 &&
      (direction > 0 ? region.scrollTop + region.clientHeight < region.scrollHeight - 1 : region.scrollTop > 1);
    const writeHash = (id, push) => {
      if (location.hash !== `#${id}`) history[push ? 'pushState' : 'replaceState'](history.state, '', `${location.pathname}${location.search}#${id}`);
    };
    const showPage = (id, moveFocus = false) => {
      const focusWasInside = sectionFor(current)?.contains(document.activeElement);
      const next = sectionFor(id);
      next.inert = false;
      next.removeAttribute('aria-hidden');
      next.classList.add('is-current');
      if (moveFocus || focusWasInside) next.focus({ preventScroll: true });
      sections.forEach(section => {
        const visible = section.id === id;
        section.classList.toggle('is-current', visible);
        section.classList.remove('is-entering', 'is-leaving');
        section.inert = !visible;
        if (!visible) section.setAttribute('aria-hidden', 'true');
        // Pages share a fixed stage; transitions never move the document.
        if (!visible) section.querySelectorAll('video').forEach(video => video.pause());
      });
      current = id;
      worlds.current?.show(id);
      element.dataset.storyPage = id;
      setActiveId(id);
      setDestinationId(id);
    };
    const finish = () => {
      if (!transition) return;
      const { to, push, focus } = transition;
      clearTimeout(transition.contentTimer);
      transition.sequence?.cancel();
      transition = null;
      pixelSwap.current?.cancel();
      animations.forEach(animation => animation.cancel());
      animations = [];
      showPage(to, focus);
      writeHash(to, push);
      element.classList.remove('is-story-traveling');
      delete element.dataset.transitionKind;
      delete element.dataset.transitionPhase;
      setEnteringId(null);
      setTraveling(false);
    };
    const navigateTo = (id, { historyNavigation = false, focus = false } = {}) => {
      if (!STORY_PAGES.some(page => page.id === id)) return;
      if (transition?.to === id && !historyNavigation) return;
      if (transition && historyNavigation) {
        // Back/forward owns the URL; never push the interrupted destination.
        animations.forEach(animation => animation.cancel());
        clearTimeout(transition.contentTimer);
        transition.sequence?.cancel();
        animations = [];
        pixelSwap.current?.cancel();
        transition = null;
        showPage(current);
        element.classList.remove('is-story-traveling');
        delete element.dataset.transitionKind;
        delete element.dataset.transitionPhase;
        setEnteringId(null);
        setTraveling(false);
      } else if (transition) finish();
      if (current === id) return;
      wheelLocked = true;
      wheelTotal = 0;
      transition = { to: id, push: !historyNavigation, focus };
      setDestinationId(id);
      if (settings.current.reducedMotion || historyNavigation) { finish(); return; }
      const from = sectionFor(current);
      const to = sectionFor(id);
      from.classList.add('is-leaving');
      to.classList.add('is-entering');
      element.classList.add('is-story-traveling');
      setTraveling(true);
      const world = worlds.current?.enter(id);
      const journey = transition;
      const projectContent = chapterIdFor(current) === 'projects' && chapterIdFor(id) === 'projects';
      if (projectContent || world?.startDispersal) {
        element.dataset.transitionKind = world?.kind || (projectContent ? 'project-content' : 'project-activity');
        element.dataset.transitionPhase = 'leaving';
        journey.sequence = chapterContentTransition({ from, to,
          onEnter() {
            if (transition !== journey) return;
            element.dataset.transitionPhase = 'entering';
            setEnteringId(id);
            return worlds.current?.revealContent(id);
          },
          onBackground: world?.startDispersal ? () => {
            if (transition !== journey) return Promise.resolve();
            element.dataset.transitionPhase = 'dispersing';
            return world?.startDispersal?.() ?? Promise.resolve();
          } : undefined,
        });
        journey.sequence.finished.then(() => { if (transition === journey) finish(); });
        return;
      }
      // Other routes retain the shared pixel mask and background reveal.
      journey.worldReady = !world?.finished;
      journey.pixelsReady = false;
      world?.finished?.then(() => {
        if (transition !== journey) return;
        journey.worldReady = true;
        if (journey.pixelsReady) finish();
      });
      const revealContent = () => {
        if (transition !== journey) return;
        pixelSwap.current?.play([to, world?.layer, world?.reveal], { conceal: world?.conceal, hold: true });
      };
      // Let the existing galaxy become the logo before the project content arrives.
      if (world?.contentDelay) journey.contentTimer = setTimeout(revealContent, world.contentDelay);
      else revealContent();
      animations = [
        from.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'both' }),
      ];
    };
    const stepPage = (step, options) => {
      const index = STORY_PAGES.findIndex(page => page.id === current);
      const page = STORY_PAGES[index + step];
      if (page) navigateTo(page.id, options);
    };
    const wheel = event => {
      if (document.querySelector('dialog[open]')) return;
      if (event.ctrlKey || event.metaKey || event.target.closest?.(editable)) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (!delta) return;
      const now = performance.now();
      const freshGesture = now - wheelTime > 200;
      wheelTime = now;
      if (freshGesture) { wheelLocked = false; wheelTotal = 0; nativeScrolling = false; }
      const region = event.target.closest?.('[data-story-scroll]');
      if (!transition && canScroll(region, delta) && (!wheelLocked || nativeScrolling)) {
        // Read long chapters before turning the page. A new gesture is needed
        // at the boundary so trackpad momentum cannot skip the chapter ending.
        nativeScrolling = true;
        wheelLocked = true;
        wheelTotal = 0;
        return;
      }
      event.preventDefault();
      if (transition) { wheelLocked = true; return; }
      if (wheelLocked && !freshGesture) return;
      if (Math.sign(wheelTotal) !== Math.sign(delta)) wheelTotal = 0;
      wheelTotal += delta;
      if (Math.abs(wheelTotal) < 38) return;
      wheelLocked = true;
      stepPage(Math.sign(wheelTotal));
      wheelTotal = 0;
    };
    const keydown = event => {
      if (document.querySelector('dialog[open]')) return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.(editable)) return;
      if (event.key === 'Escape') { finish(); return; }
      if (event.target.closest?.('button,a,video,[role="tab"],[role="button"],.ag-panel')) return;
      const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': event.shiftKey ? -1 : 1 }[event.key];
      const region = event.target.closest?.('[data-story-scroll]') || sectionFor(current)?.querySelector('[data-story-scroll]');
      if (!transition && step && canScroll(region, step)) {
        event.preventDefault();
        region.scrollBy({ top: step * (event.key.startsWith('Arrow') ? 48 : region.clientHeight * .8) });
        return;
      }
      if (step || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (transition || event.repeat) return;
        if (step) stepPage(step, { focus: true });
        else navigateTo(STORY_PAGES[event.key === 'Home' ? 0 : STORY_PAGES.length - 1].id, { focus: true });
      }
    };
    const touchStart = event => {
      if (document.querySelector('dialog[open]') || transition || event.touches.length !== 1 || event.target.closest?.(`${editable},[role="button"],button,a,video,[data-story-interactive]`)) { touch = null; return; }
      const region = event.target.closest?.('[data-story-scroll]');
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY,
        scrollDown: canScroll(region, 1), scrollUp: canScroll(region, -1) };
    };
    const touchEnd = event => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      const reading = dy < 0 ? touch.scrollDown : touch.scrollUp;
      touch = null;
      if (reading) return;
      if (!transition && Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx) * 1.2) stepPage(dy < 0 ? 1 : -1);
    };
    const touchCancel = () => { touch = null; };
    const click = event => {
      const anchor = event.target.closest?.('a[href^="#"]');
      if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const id = anchor.hash.slice(1);
      if (!STORY_PAGES.some(page => page.id === id)) return;
      event.preventDefault();
      navigateTo(id);
    };
    const hash = () => navigateTo(initialId(), { historyNavigation: true });
    const visibility = () => { if (document.hidden) finish(); };
    sections.forEach(section => section.setAttribute('tabindex', '-1'));
    showPage(current);
    writeHash(current, false);
    api.current = { navigate: navigateTo, complete: finish, revealComplete: () => {
      if (!transition) return;
      transition.pixelsReady = true;
      if (transition.worldReady) finish();
    } };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown);
    window.addEventListener('hashchange', hash);
    window.addEventListener('popstate', hash);
    window.addEventListener('resize', finish);
    document.addEventListener('visibilitychange', visibility);
    element.addEventListener('click', click);
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchend', touchEnd, { passive: true });
    element.addEventListener('touchcancel', touchCancel, { passive: true });
    return () => {
      const interrupted = transition;
      transition = null;
      clearTimeout(interrupted?.contentTimer);
      interrupted?.sequence?.cancel();
      animations.forEach(animation => animation.cancel());
      history.scrollRestoration = previousRestoration;
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('popstate', hash);
      window.removeEventListener('resize', finish);
      document.removeEventListener('visibilitychange', visibility);
      element.removeEventListener('click', click);
      element.removeEventListener('touchstart', touchStart);
      element.removeEventListener('touchend', touchEnd);
      element.removeEventListener('touchcancel', touchCancel);
      api.current = {};
    };
  }, []);

  const index = STORY_CHAPTERS.findIndex(page => page.id === chapterIdFor(activeId));
  const page = STORY_CHAPTERS[index];
  const value = useMemo(() => ({ activeId, destinationId, enteringId, isTraveling, reducedMotion, navigate }), [activeId, destinationId, enteringId, isTraveling, reducedMotion, navigate]);
  return (
    <StoryContext.Provider value={value}>
      <div className="story-experience" ref={root} data-story-page={activeId}>
        <StoryWorlds ref={worlds} activeId={activeId} destinationId={destinationId} reducedMotion={reducedMotion} transitioning={isTraveling} />
        {children}
        <PixelSwap
          ref={pixelSwap}
          className="story-pixel-transition"
          trigger="manual"
          pixelSize={96}
          duration={700}
          pixelDuration={320}
          pixelScale={0.35}
          pattern="random"
          onComplete={() => api.current.revealComplete?.()}
          style={{ aspectRatio: 'auto' }}
        />
        <span className="story-sr-only" role="status" aria-live="polite">{isTraveling ? '正在切换场景' : `第 ${index + 1} 章，共 ${STORY_CHAPTERS.length} 章，${page.label}${activeId === 'student-cases' ? ' · 学生案例' : ''}`}</span>
      </div>
    </StoryContext.Provider>
  );
}
