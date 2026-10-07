import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import './StoryWorlds.css';

gsap.registerPlugin(useGSAP);

const WORLDS = [
  { id: 'home', scene: 'home' },
  { id: 'activity', scene: 'nature' },
  { id: 'projects', scene: 'machine' },
  { id: 'student-cases', scene: 'sky' },
  { id: 'about', scene: 'technology' },
];
const validId = id => WORLDS.some(world => world.id === id);
const limit = (n, min = 0, max = 1) => Math.max(min, Math.min(max, Number(n) || 0));
const smooth = value => { const p = limit(value); return p * p * (3 - 2 * p); };
const asset = name => `/assets/story-worlds/${name}.webp`;
const PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 61 + 7) % 100}%`,
  size: `${index % 3 === 0 ? 3 : index % 2 === 0 ? 2 : 1}px`,
}));

const StoryWorlds = forwardRef(function StoryWorlds({ activeId = 'home', paused = false, reducedMotion = false }, ref) {
  const rootRef = useRef(null);
  const apiRef = useRef({});
  const optionsRef = useRef({ activeId, paused, reducedMotion });
  optionsRef.current = { activeId, paused, reducedMotion };

  useImperativeHandle(ref, () => ({
    prepareTransition: value => apiRef.current.prepareTransition?.(value),
    progress: value => apiRef.current.progress?.(value),
    finish: id => apiRef.current.finish?.(id),
    react: (kind, value) => apiRef.current.react?.(kind, value),
    setScrollProgress: value => apiRef.current.setScrollProgress?.(value),
  }), []);

  useGSAP((context, contextSafe) => {
    const root = rootRef.current;
    const worlds = new Map(WORLDS.map(({ id }) => [id, root.querySelector(`[data-world="${id}"]`)]));
    const loops = new Map();
    const reactions = new Map();
    const edges = Object.fromEntries(['nature', 'machine', 'cloud'].map(name => [name, root.querySelector(`[data-edge="${name}"]`)]));
    const transit = root.querySelector('.story-worlds__transit');
    let current = validId(optionsRef.current.activeId) ? optionsRef.current.activeId : 'home';
    let lastProp = current;
    let transition = null;
    let lastCardReaction = 0;
    let viewport = { width: window.innerWidth, height: window.innerHeight };
    let pointerRaf = 0;
    let pointerState = { x: 0.5, y: 0.5 };

    const runAmbient = () => {
      const stopped = optionsRef.current.paused || optionsRef.current.reducedMotion || document.hidden;
      loops.forEach((items, id) => items.forEach(tween => {
        const visible = transition ? id === transition.from || id === transition.to : id === current;
        if (!stopped && visible) tween.play(); else tween.pause();
      }));
      reactions.forEach((timeline, id) => {
        if (stopped || id !== current) timeline.pause(); else timeline.resume();
      });
    };

    worlds.forEach((world, id) => {
      const items = [];
      const animate = (selector, values) => {
        const nodes = world.querySelectorAll(selector);
        if (nodes.length) items.push(gsap.to(nodes, { paused: true, repeat: -1, yoyo: true, ease: 'sine.inOut', ...values }));
      };
      animate('.story-world__light', { opacity: 0.18, scaleX: 1.05, duration: id === 'activity' ? 11 : 17 });
      animate('.story-world__mist', { x: 20, y: -5, opacity: 0.13, duration: 19 });
      animate('.story-world__foliage', { rotation: 0.3, x: 3, y: 2, duration: 6.8 });
      animate('.story-world__mote', { y: -38, x: 13, opacity: 0.55, stagger: 0.7, duration: 9 });
      animate('.story-world__joint', { rotation: 0.7, duration: 8.5 });
      animate('.story-world__scan', { yPercent: 210, opacity: 0.28, duration: 7.5, repeatDelay: 2 });
      animate('.story-world__cloud--near', { x: -28, y: 7, duration: 25 });
      animate('.story-world__cloud--far', { x: 35, y: -9, duration: 36 });
      animate('.story-world__led', { opacity: 0.8, stagger: 0.33, duration: 1.8 });
      animate('.story-world__fiber', { yPercent: 145, opacity: 0.7, stagger: 1.4, duration: 5.5, repeatDelay: 1.8 });
      animate('.story-world__particle', { x: (id === 'projects' ? 22 : 15), y: -34, opacity: 0.62, duration: id === 'student-cases' ? 8.5 : 11, stagger: 0.24 });
      animate('.story-world__orb', { scale: 1.34, opacity: 0.38, duration: id === 'projects' ? 4.5 : 7.5, stagger: 1.1 });
      animate('.story-world__wave', { xPercent: 12, opacity: 0.48, duration: id === 'home' ? 13 : 17, stagger: 1.6 });
      loops.set(id, items);
    });

    const resetWorld = world => {
      world.style.clipPath = 'none';
      world.style.opacity = '1';
      world.style.zIndex = '0';
      world.style.willChange = '';
      const camera = world.querySelector('.story-world__camera');
      camera.style.transform = '';
      camera.style.transformOrigin = '';
      camera.style.willChange = '';
      gsap.set(world.querySelector('.story-world__parallax'), { x: 0, y: 0, rotation: 0 });
    };
    const finish = id => {
      current = validId(id) ? id : current;
      transition = null;
      worlds.forEach((world, key) => {
        resetWorld(world);
        world.style.visibility = key === current ? 'visible' : 'hidden';
        world.classList.toggle('is-current', key === current);
      });
      Object.values(edges).forEach(edge => { edge.style.visibility = 'hidden'; });
      transit.classList.remove('is-active');
      transit.style.opacity = '0';
      reactions.forEach(timeline => timeline.kill());
      reactions.clear();
      gsap.set(root.querySelectorAll('.story-world__response'), { x: 0, y: 0, rotation: 0, scale: 1 });
      gsap.set(root.querySelectorAll('.story-world__glint'), { opacity: 0 });
      runAmbient();
    };

    const progress = value => {
      if (!transition) return;
      transition.value = limit(value);
      const { from, to, direction, edge, oldCamera, nextCamera } = transition;
      const oldWorld = worlds.get(from);
      const nextWorld = worlds.get(to);
      if (optionsRef.current.reducedMotion) {
        oldWorld.style.opacity = transition.value < 0.5 ? '1' : '0';
        nextWorld.style.opacity = transition.value < 0.5 ? '0' : '1';
        nextWorld.style.clipPath = 'none';
        edge.style.visibility = 'hidden';
        transit.style.opacity = '0';
        return;
      }
      const p = smooth((transition.value - 0.09) / 0.73);
      const distant = smooth((transition.value - 0.18) / 0.73);
      const { width: w, height: h } = viewport;
      const vertical = direction === 'up' || direction === 'down';
      const edgeHeight = h * (vertical ? 1.3 : 1.2);
      const edgeWidth = edgeHeight * 2;
      let x = 0, y = vertical ? 0 : -h * 0.1, boundary = 0;
      if (direction === 'left') {
        const span = edgeWidth * 0.52;
        x = -span + (w + span) * p;
        boundary = limit((x + edgeWidth * 0.16) / w);
        nextWorld.style.clipPath = `inset(0 ${(1 - boundary) * 100}% 0 0)`;
      } else if (direction === 'right') {
        const span = edgeWidth * 0.32;
        x = w - (w + span) * p - edgeWidth * 0.68;
        boundary = limit((x + edgeWidth * 0.91) / w);
        nextWorld.style.clipPath = `inset(0 0 0 ${boundary * 100}%)`;
      } else {
        x = (w - edgeWidth) / 2;
        y = direction === 'up' ? -edgeHeight + (h + edgeHeight) * p : h - (h + edgeHeight) * p;
        boundary = limit((y + edgeHeight * 0.76) / h);
        nextWorld.style.clipPath = direction === 'up'
          ? `inset(0 0 ${(1 - boundary) * 100}% 0)` : `inset(${boundary * 100}% 0 0 0)`;
      }
      if (edge.style.width !== `${edgeWidth}px`) edge.style.width = `${edgeWidth}px`;
      if (edge.style.height !== `${edgeHeight}px`) edge.style.height = `${edgeHeight}px`;
      edge.style.transform = `translate3d(${x}px,${y}px,0)`;
      oldCamera.style.transform = `scale(${1 + p * 0.055})`;
      nextCamera.style.transform = `scale(${1 + (1 - distant) * 0.055})`;
      transit.style.setProperty('--transit-progress', String(p));
      transit.style.setProperty('--transit-x', `${x * 0.18}px`);
      transit.style.setProperty('--transit-y', `${y * 0.18}px`);
      transit.style.setProperty('--transit-scale', String(0.9 + p * 0.18));
      transit.style.opacity = String(Math.sin(Math.PI * p) * 0.62);
    };

    const prepareTransition = ({ from = current, to, direction = 'left' } = {}) => {
      if (!validId(from) || !validId(to) || from === to) return false;
      finish(from);
      const travel = ['left', 'right', 'up', 'down'].includes(direction) ? direction : 'left';
      const edge = edges[travel === 'left' ? 'nature' : travel === 'right' ? 'machine' : 'cloud'];
      const oldCamera = worlds.get(from).querySelector('.story-world__camera');
      const nextCamera = worlds.get(to).querySelector('.story-world__camera');
      transition = { from, to, direction: travel, edge, oldCamera, nextCamera, value: 0 };
      worlds.get(to).style.visibility = 'visible';
      worlds.get(to).style.zIndex = '1';
      worlds.get(to).style.willChange = 'clip-path';
      oldCamera.style.willChange = nextCamera.style.willChange = 'transform';
      const origins = { left: ['left center', 'right center'], right: ['right center', 'left center'], up: ['center top', 'center bottom'], down: ['center bottom', 'center top'] };
      oldCamera.style.transformOrigin = origins[travel][0];
      nextCamera.style.transformOrigin = origins[travel][1];
      edge.style.visibility = optionsRef.current.reducedMotion ? 'hidden' : 'visible';
      transit.dataset.direction = travel;
      transit.style.setProperty('--transit-angle', `${{ left: 0, right: 180, up: -90, down: 90 }[travel]}deg`);
      transit.classList.add('is-active');
      progress(0);
      runAmbient();
      return true;
    };

    const react = contextSafe((kind, { strength = 1, x = 0.5, y = 0.5 } = {}) => {
      if (transition || optionsRef.current.paused || optionsRef.current.reducedMotion || document.hidden) return;
      if (kind === 'card') {
        const now = performance.now();
        if (now - lastCardReaction < 240) return;
        lastCardReaction = now;
      }
      const world = worlds.get(current);
      const response = world.querySelector('.story-world__response');
      const glint = world.querySelector('.story-world__glint');
      const amount = limit(strength, 0, 2);
      glint.style.backgroundPosition = `${limit(x) * 100}% ${limit(y) * 100}%`;
      reactions.get(current)?.kill();
      const timeline = gsap.timeline();
      reactions.set(current, timeline);
      if (kind === 'release') {
        timeline.to(response, { x: 0, y: 0, scale: 1, rotation: 0, duration: 1.2, ease: 'elastic.out(1,0.7)' })
          .to(glint, { opacity: 0, duration: 0.65 }, 0);
        return;
      }
      const nature = current === 'activity' || current === 'home';
      const machine = current === 'projects';
      const sky = current === 'student-cases';
      const hold = kind === 'hold';
      timeline.to(response, {
        x: nature ? 11 * amount : 0, y: sky ? -9 * amount : 0,
        rotation: nature ? 0.12 * amount : machine ? 1.4 * amount : 0, scale: sky ? 1 + 0.015 * amount : 1,
        duration: hold ? 0.7 : 0.4, ease: 'power2.out',
      }).to(glint, { opacity: (nature ? 0.17 : 0.25) * amount, duration: 0.25 }, 0);
      if (!hold) timeline.to(response, { x: 0, y: 0, scale: 1, rotation: 0, duration: kind === 'tear' ? 1.6 : 1.1, ease: 'sine.inOut' }, 0.45)
        .to(glint, { opacity: 0, duration: 1 }, 0.45);
    });

    const paintPointer = () => {
      pointerRaf = 0;
      const { x, y } = pointerState;
      root.style.setProperty('--pointer-x', String(x));
      root.style.setProperty('--pointer-y', String(y));
      root.style.setProperty('--pointer-dx', String(x - 0.5));
      root.style.setProperty('--pointer-dy', String(y - 0.5));
      if (optionsRef.current.paused || optionsRef.current.reducedMotion || transition || document.hidden) return;
      const world = worlds.get(current);
      const parallax = world.querySelector('.story-world__parallax');
      const glint = world.querySelector('.story-world__glint');
      gsap.to(parallax, {
        x: (x - 0.5) * -22,
        y: (y - 0.5) * -16,
        rotation: (x - 0.5) * 0.4,
        duration: 0.9,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      glint.style.backgroundPosition = `${x * 100}% ${y * 100}%`;
    };
    const pointerMove = event => {
      pointerState = { x: limit(event.clientX / Math.max(innerWidth, 1)), y: limit(event.clientY / Math.max(innerHeight, 1)) };
      if (!pointerRaf) pointerRaf = requestAnimationFrame(paintPointer);
    };
    const pointerDown = event => {
      if (optionsRef.current.paused || optionsRef.current.reducedMotion || transition || document.hidden) return;
      const world = worlds.get(current);
      const ripple = world.querySelector('.story-world__ripple');
      ripple.style.left = `${event.clientX / Math.max(innerWidth, 1) * 100}%`;
      ripple.style.top = `${event.clientY / Math.max(innerHeight, 1) * 100}%`;
      ripple.classList.remove('is-burst');
      void ripple.offsetWidth;
      ripple.classList.add('is-burst');
    };

    const resize = () => {
      viewport = { width: window.innerWidth, height: window.innerHeight };
      if (transition) progress(transition.value);
    };
    apiRef.current = {
      prepareTransition: contextSafe(prepareTransition), progress, finish: contextSafe(finish), react,
      setScrollProgress: value => worlds.get(current)?.style.setProperty('--story-scroll', String(limit(value))),
      sync: () => {
        const next = optionsRef.current.activeId;
        if (next !== lastProp && validId(next)) { lastProp = next; if (!transition) finish(next); }
        if (optionsRef.current.reducedMotion && transition) progress(transition.value);
        runAmbient();
      },
    };
    document.addEventListener('visibilitychange', runAmbient);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('pointerdown', pointerDown, { passive: true });
    finish(current);
    return () => {
      document.removeEventListener('visibilitychange', runAmbient);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerdown', pointerDown);
      cancelAnimationFrame(pointerRaf);
      reactions.forEach(timeline => timeline.kill());
      apiRef.current = {};
    };
  }, { scope: rootRef });

  useEffect(() => { apiRef.current.sync?.(); }, [activeId, paused, reducedMotion]);

  return (
    <div ref={rootRef} className="story-worlds" aria-hidden="true" data-reduced-motion={reducedMotion || undefined}>
      {WORLDS.map(({ id, scene }) => (
        <div key={id} className={`story-world story-world--${scene}`} data-world={id}>
          <div className="story-world__camera">
            <div className="story-world__parallax">
              <img className="story-world__photo" src={asset(scene)} alt="" draggable="false" decoding="async" fetchpriority={id === 'home' ? 'high' : 'low'} />
              <div className="story-world__response">
                {scene === 'nature' && <img className="story-world__foliage" src={asset('nature-edge')} alt="" draggable="false" />}
                {scene === 'machine' && <img className="story-world__joint" src={asset('machine-edge')} alt="" draggable="false" />}
                {scene === 'sky' && <>
                  <img className="story-world__cloud story-world__cloud--far" src={asset('cloud-edge')} alt="" draggable="false" />
                  <img className="story-world__cloud story-world__cloud--near" src={asset('cloud-edge')} alt="" draggable="false" />
                </>}
                <div className="story-world__light" /><div className="story-world__mist" />
                {(scene === 'home' || scene === 'nature') && <div className="story-world__motes">{[0, 1, 2, 3, 4].map(i => <i key={i} className="story-world__mote" style={{ left: `${8 + i * 8}%`, top: `${38 + (i % 3) * 17}%` }} />)}</div>}
                {(scene === 'machine' || scene === 'technology') && <>
                  <div className="story-world__scan-window"><div className="story-world__scan" /></div>
                  <div className="story-world__signals">{[0, 1, 2, 3, 4, 5].map(i => <i key={i} className="story-world__led" style={{ left: `${i < 3 ? 10 : 88}%`, top: `${24 + (i % 3) * 19}%` }} />)}</div>
                </>}
                {scene === 'technology' && <div className="story-world__fiber-window"><i className="story-world__fiber" /><i className="story-world__fiber story-world__fiber--right" /></div>}
                <div className="story-world__shade" /><div className="story-world__glint" />
              </div>
            </div>
            <div className="story-world__atmosphere">
              <div className="story-world__aurora" />
              <div className="story-world__orb story-world__orb--one" />
              <div className="story-world__orb story-world__orb--two" />
              <div className="story-world__particles">
                {PARTICLES.map((particle, index) => <i key={index} className="story-world__particle" style={{ left: particle.left, top: particle.top, '--particle-size': particle.size }} />)}
              </div>
              <div className="story-world__wave story-world__wave--one" />
              <div className="story-world__wave story-world__wave--two" />
              <div className="story-world__ripple" />
            </div>
          </div>
        </div>
      ))}
      {['nature', 'machine', 'cloud'].map(name => <img key={name} data-edge={name} className={`story-worlds__edge story-worlds__edge--${name}`} src={asset(`${name}-edge`)} alt="" draggable="false" />)}
      <div className="story-worlds__transit" aria-hidden="true">
        <i className="story-worlds__transit-sheen" />
        <i className="story-worlds__transit-streak story-worlds__transit-streak--one" />
        <i className="story-worlds__transit-streak story-worlds__transit-streak--two" />
        <i className="story-worlds__transit-streak story-worlds__transit-streak--three" />
      </div>
    </div>
  );
});

export default StoryWorlds;
