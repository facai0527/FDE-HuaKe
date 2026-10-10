'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LiquidMetalDefs from './LiquidMetalDefs';
import './StrokeText.css';

// Adapted from the supplied React Bits StrokeText component.
// React Bits license and attribution: ../../licenses/react-bits.txt
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

const cssLength = value => typeof value === 'number' ? `${value}px` : String(value);

export default function StrokeText({
  text = 'Draw Attention', strokeColor = '#A78BFA', fillColor = '#F8FAFC',
  strokeWidth = 1.4, drawDuration = 1.6, fillDelay = 0.2, stagger = 0.05,
  ease = 'power2.out', trigger = 'mount', fillMode = 'wipe', fontSize = 128,
  fontWeight = 800, letterSpacing = -4, reverse = false, material = 'solid', smoothMetal = false, bevel = true,
  active = true, paused = false, reducedMotion = false, className = '', style = {}
}) {
  const rootRef = useRef(null);
  const strokeTextRef = useRef(null);
  const wipeRectRef = useRef(null);
  const settingsRef = useRef(null);
  const syncRef = useRef(null);
  const completedCopyRef = useRef(null);
  const [box, setBox] = useState(null);
  const rawId = useId();
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const metalId = `${wipeId}-metal`;
  const liquidMetal = material === 'liquid-metal';
  const copy = String(text ?? '');
  const characters = useMemo(() => Array.from(copy), [copy]);
  const fontStyle = useMemo(() => ({
    fontSize: cssLength(fontSize), fontWeight, letterSpacing: cssLength(letterSpacing)
  }), [fontSize, fontWeight, letterSpacing]);
  settingsRef.current = { active, paused, reducedMotion };

  useLayoutEffect(() => {
    const node = strokeTextRef.current;
    if (!node) return undefined;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const measure = () => {
      if (cancelled) return;
      let bounds;
      try { bounds = node.getBBox(); } catch { return; }
      if (!bounds.width || !bounds.height) return;
      const computed = getComputedStyle(node);
      const size = parseFloat(computed.fontSize) || 128;
      let top = bounds.y;
      let height = bounds.height;
      // SVG getBBox includes a font's line box on some browsers. Canvas ink
      // metrics keep the visible capitals tightly framed without cropping them.
      if (context) {
        context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
        const ink = context.measureText(copy);
        const inkHeight = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
        if (Number.isFinite(inkHeight) && inkHeight > 0) {
          top = -ink.actualBoundingBoxAscent;
          height = inkHeight;
        }
      }
      const pad = Math.max(Number(strokeWidth) * 1.5 || 2, size * 0.015);
      const next = { x: bounds.x - pad, y: top - pad, width: bounds.width + pad * 2, height: height + pad * 2, fontSize: size };
      setBox(previous => previous && Object.keys(next).every(key => Math.abs(previous[key] - next[key]) < 0.1) ? previous : next);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    document.fonts?.addEventListener('loadingdone', measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener('loadingdone', measure);
      window.removeEventListener('resize', measure);
    };
  }, [copy, fontStyle, strokeWidth]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !box) return undefined;
    const strokes = [...root.querySelectorAll('[data-stroke-char]')];
    const fills = [...root.querySelectorAll('[data-fill-char]')];
    const wipe = wipeRectRef.current;
    const dash = Math.max(box.fontSize * 7, 200);
    const fillEnabled = fillMode !== 'none';
    const useWipe = fillMode === 'wipe';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = [...strokes, ...fills, wipe].filter(Boolean);
    const metalFlows = [...root.querySelectorAll('[data-metal-flow]')];
    const metalGradient = root.querySelector('[data-metal-gradient]');
    const metalTimeline = liquidMetal ? gsap.timeline({ paused: true, repeat: -1, yoyo: true }) : null;
    if (metalTimeline) {
      metalTimeline
        .fromTo(metalFlows[0], { attr: { transform: 'translate(-70 -9)' } },
          { attr: { transform: 'translate(65 12)' }, duration: 7, ease: 'sine.inOut' }, 0)
        .fromTo(metalFlows[1], { attr: { transform: 'translate(60 10)' } },
          { attr: { transform: 'translate(-90 -15)' }, duration: 7, ease: 'sine.inOut' }, 0)
        .fromTo(metalGradient, { attr: { gradientTransform: 'rotate(-9 .5 .5)' } },
          { attr: { gradientTransform: 'rotate(12 .5 .5)' }, duration: 7, ease: 'sine.inOut' }, 0);
    }
    let visible = true;
    let previousActive = settingsRef.current.active;
    // Font subsets can finish after the entrance. Re-measure the SVG without
    // erasing/replaying text that has already finished drawing on this visit.
    const alreadyComplete = completedCopyRef.current === copy;
    let pending = !alreadyComplete;
    let requested = trigger === 'mount' || trigger === 'loop';
    let completed = alreadyComplete;
    let wasReduced = false;
    const setAnimating = value => { root.dataset.animating = String(value); };
    const setStart = () => {
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
      root.dataset.phase = 'waiting';
    };
    const setEnd = () => {
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
      root.dataset.phase = 'complete';
    };
    if (alreadyComplete) setEnd(); else setStart();
    const timeline = gsap.timeline({
      paused: true, repeat: trigger === 'loop' ? -1 : 0,
      repeatDelay: trigger === 'loop' ? 0.9 : 0,
      onComplete: () => { completed = true; completedCopyRef.current = copy; root.dataset.phase = 'complete'; setAnimating(false); }
    });
    const staggerConfig = reverse ? { each: stagger, from: 'end' } : stagger;
    timeline.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig }, 0);
    if (useWipe && wipe) {
      timeline.to(wipe, { attr: { width: box.width }, duration: Math.max(0.4, drawDuration * 0.5), ease: 'power2.inOut' }, drawDuration + fillDelay);
    } else if (fillEnabled) {
      timeline.to(fills, { opacity: 1, duration: Math.max(0.4, drawDuration * 0.5), ease: 'power2.out', stagger: staggerConfig }, drawDuration + fillDelay);
    }
    if (trigger === 'hover') setEnd();

    const sync = () => {
      const settings = settingsRef.current;
      const reduce = settings.reducedMotion || motionQuery.matches;
      const materialMoving = liquidMetal && settings.active && !settings.paused && !document.hidden && visible && !reduce && fillEnabled;
      if (materialMoving) metalTimeline?.resume(); else metalTimeline?.pause();
      root.dataset.materialAnimating = String(materialMoving);
      if (settings.active !== previousActive) {
        previousActive = settings.active;
        completedCopyRef.current = null;
        timeline.pause(0);
        pending = true;
        completed = false;
        requested = trigger === 'mount' || trigger === 'loop' || (trigger === 'scroll' && visible);
        if (trigger === 'hover') setEnd(); else setStart();
      }
      if (reduce) {
        timeline.pause();
        setEnd();
        setAnimating(false);
        wasReduced = true;
        return;
      }
      if (wasReduced) {
        wasReduced = false;
        completedCopyRef.current = null;
        pending = true;
        completed = false;
        timeline.pause(0);
        if (trigger === 'hover') setEnd(); else setStart();
      }
      if (!settings.active || settings.paused || document.hidden || !visible || !requested || completed) {
        timeline.pause();
        setAnimating(false);
        return;
      }
      if (pending) {
        pending = false;
        setStart();
        timeline.restart();
      } else timeline.resume();
      root.dataset.phase = 'drawing';
      setAnimating(true);
    };
    const hover = () => {
      if (!settingsRef.current.active || settingsRef.current.paused) return;
      completedCopyRef.current = null;
      timeline.pause(0);
      pending = true;
      completed = false;
      requested = true;
      sync();
    };
    let scrollTrigger;
    if (trigger === 'hover') root.addEventListener('pointerenter', hover);
    if (trigger === 'scroll') {
      scrollTrigger = ScrollTrigger.create({ trigger: root, start: 'top 82%', once: true, onEnter: () => { requested = true; sync(); } });
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      sync();
    });
    observer?.observe(root);
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    syncRef.current = sync;
    sync();
    return () => {
      syncRef.current = null;
      observer?.disconnect();
      scrollTrigger?.kill();
      root.removeEventListener('pointerenter', hover);
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
      timeline.kill();
      metalTimeline?.kill();
      gsap.killTweensOf(targets);
      setAnimating(false);
    };
  }, [box, copy, drawDuration, fillDelay, stagger, ease, trigger, fillMode, reverse, liquidMetal]);

  useLayoutEffect(() => { syncRef.current?.(); }, [active, paused, reducedMotion]);

  const fallbackSize = Number(fontSize) || 128;
  const viewBox = box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-fallbackSize} 600 ${fallbackSize * 1.3}`;
  return (
    <span ref={rootRef} className={`stroke-text ${liquidMetal ? 'stroke-text--metal' : ''} ${trigger === 'hover' ? 'stroke-text--hover' : ''} ${className}`.trim()}
      style={{ '--stroke-text-height': `${Math.round((box?.fontSize || fallbackSize) * 1.3)}px`, ...style }}
      data-ready={Boolean(box)} role="img" aria-label={copy}>
      <svg className="stroke-text__svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          {fillMode === 'wipe' && box && <clipPath id={wipeId} clipPathUnits="userSpaceOnUse"><rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} /></clipPath>}
          {liquidMetal && box && <LiquidMetalDefs id={metalId} box={box} smooth={smoothMetal} />}
        </defs>
        <text ref={strokeTextRef} className="stroke-text__stroke" x="0" y="0" fill="none" stroke={liquidMetal && box ? `url(#${metalId}-edge)` : strokeColor}
          strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle}>
          {characters.map((char, index) => <tspan data-stroke-char key={`s-${index}`}>{char}</tspan>)}
        </text>
        <text className="stroke-text__fill" x="0" y="0" fill={liquidMetal && box ? `url(#${metalId})` : fillColor} stroke="none" style={fontStyle}
          filter={liquidMetal && bevel && box ? `url(#${metalId}-bevel)` : undefined}
          clipPath={fillMode === 'wipe' && box ? `url(#${wipeId})` : undefined}>
          {characters.map((char, index) => <tspan data-fill-char key={`f-${index}`}>{char}</tspan>)}
        </text>
      </svg>
    </span>
  );
}
