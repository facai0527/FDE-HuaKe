'use client';

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './PixelSwap.css';

// Reveal live content and conceal outgoing layers with bounded SVG grids.
// No page clones, media snapshots, inverse transforms or per-frame React work.
const MAX_PIXELS = 220;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const noise = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const PATTERNS = {
  random: () => null,
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  'left-to-right': x => x,
  'right-to-left': x => 1 - x,
  'top-to-bottom': (_x, y) => y,
  'bottom-to-top': (_x, y) => 1 - y,
  diagonal: (x, y) => (x + y) / 2,
  spiral: (x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
    return (angle + Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2) % 1;
  }
};

const buildGrid = ({ width, height, pixelSize, gap, pattern, randomness }) => {
  let size = Math.max(8, Math.round(pixelSize));
  let columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
  let rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
  while (columns * rows > MAX_PIXELS) {
    size = Math.ceil(size * Math.sqrt(columns * rows / MAX_PIXELS));
    columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
    rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
  }
  const stride = size + gap;
  const originX = (width - (columns * stride - gap)) / 2;
  const originY = (height - (rows * stride - gap)) / 2;
  const order = PATTERNS[pattern] ?? PATTERNS.random;
  const mix = clamp(randomness, 0, 1);
  const pixels = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const base = order(columns <= 1 ? 0.5 : column / (columns - 1), rows <= 1 ? 0.5 : row / (rows - 1));
      const random = noise(index + 1);
      pixels.push({ id: index, left: originX + column * stride, top: originY + row * stride, offset: base === null ? random : base * (1 - mix) + random * mix });
    }
  }
  return { pixels, size, gap, width, height };
};

const coverScale = (size, gap, radius) => {
  const p = clamp(radius, 0, 50) / 100;
  const corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
  // A small overlap prevents antialiasing seams between adjacent windows.
  return ((size + gap + 1) / size) * Math.max(1, corner);
};

const PixelSwap = forwardRef(function PixelSwap({
  firstContent, secondContent,
  pixelSize = 64, gap = 0, pixelRadius = 0, pixelSpin = 0, pixelScale = 0.35,
  fade = true, duration = 1400, pixelDuration = 450,
  pattern = 'random', randomness = 0, easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  trigger = 'hover', initialActive = false, active, onActiveChange, onComplete,
  aspectRatio = '16 / 10', className = '', style
}, ref) {
  const [internalActive, setInternalActive] = useState(initialActive);
  const [shownActive, setShownActive] = useState(active ?? initialActive);
  const [transition, setTransition] = useState(null);
  const [maskActive, setMaskActive] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const layerRefs = useRef([]);
  const pixelRefs = useRef([]);
  const concealPixelRefs = useRef([]);
  const animationsRef = useRef([]);
  const restoreRef = useRef(null);
  const clipId = `pixel-swap-${useId().replace(/:/g, '')}`;
  const desiredActive = active ?? internalActive;
  const grid = useMemo(() => buildGrid({ ...box, pixelSize, gap: Math.max(0, Math.round(gap)), pattern, randomness }), [box, pixelSize, gap, pattern, randomness]);
  const configRef = useRef(null);
  const gridRef = useRef(grid);
  configRef.current = { duration, pixelDuration, pixelSpin, pixelScale, pixelRadius, fade, easing, onComplete };
  gridRef.current = grid;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = () => {
      const width = container.clientWidth, height = container.clientHeight;
      if (width && height) setBox(current => current.width === width && current.height === height ? current : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const cancelAnimations = useCallback(() => {
    animationsRef.current.forEach(animation => animation.cancel());
    animationsRef.current = [];
  }, []);
  const stopAnimations = useCallback(() => {
    cancelAnimations();
    restoreRef.current?.();
    restoreRef.current = null;
  }, [cancelAnimations]);

  useImperativeHandle(ref, () => ({
    // Accept a mounted page, or a page and its separate background layer.
    play(source, { conceal = [], hold = false } = {}) {
      stopAnimations();
      setMaskActive(true);
      setTransition({ source, conceal, hold, to: desiredActive, grid: gridRef.current });
    },
    cancel() {
      stopAnimations();
      setMaskActive(false);
      setTransition(null);
    }
  }), [desiredActive, stopAnimations]);

  useEffect(() => {
    if (!transition && desiredActive !== shownActive) {
      setMaskActive(true);
      setTransition({ to: desiredActive, grid: gridRef.current });
    }
  }, [desiredActive, shownActive, transition]);

  useLayoutEffect(() => {
    if (!transition) return;
    const settings = configRef.current;
    const { grid: frozenGrid, to } = transition;
    const source = transition.source ?? layerRefs.current[to ? 1 : 0];
    const sources = [...new Set((Array.isArray(source) ? source : [source]).filter(Boolean))];
    const outgoing = (Array.isArray(transition.conceal) ? transition.conceal : [transition.conceal]).filter(Boolean);
    const previousClips = sources.map(layer => layer.style.clipPath);
    const previousMasks = outgoing.map(layer => layer.style.mask);
    const affected = [...sources, ...outgoing];
    const previous = affected.map(layer => Object.fromEntries(['clipPath', 'mask', 'visibility', 'opacity', 'zIndex'].map(key => [key, layer.style[key]])));
    restoreRef.current = () => affected.forEach((layer, index) => Object.assign(layer.style, previous[index]));
    sources.forEach(layer => Object.assign(layer.style, { visibility: 'visible', opacity: '1', zIndex: '2' }));
    let running = true;
    const finish = () => {
      if (!running) return;
      running = false;
      // The background can keep moving while the owner waits to commit. Once
      // the grid is complete, ordinary visibility retains the final result
      // without repainting a full-screen SVG clip/mask on every world frame.
      if (transition.hold) {
        sources.forEach((layer, index) => { layer.style.clipPath = previousClips[index]; });
        outgoing.forEach((layer, index) => {
          layer.style.visibility = 'hidden';
          layer.style.mask = previousMasks[index];
        });
        cancelAnimations();
        setMaskActive(false);
        settings.onComplete?.(to);
        return;
      }
      stopAnimations();
      setMaskActive(false);
      setShownActive(to);
      setTransition(null);
      settings.onComplete?.(to);
    };
    if (!sources.length || !frozenGrid.width || !frozenGrid.height || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return () => { running = false; stopAnimations(); };
    }

    sources.forEach(layer => { layer.style.clipPath = `url("#${clipId}")`; });
    outgoing.forEach(layer => { layer.style.mask = `url("#${clipId}-out")`; });
    const total = Math.max(200, settings.duration);
    const pixelMs = clamp(settings.pixelDuration, 60, total);
    const spread = total - pixelMs;
    const endScale = coverScale(frozenGrid.size, frozenGrid.gap, settings.pixelRadius);
    // Clip paths do not blend alpha. A zero-size start gives the same soft
    // growing-window appearance without multiplying full-screen paint layers.
    const startScale = settings.fade ? 0 : clamp(settings.pixelScale, 0.05, 1) * endScale;
    const keyframes = [
      { transform: `rotate(${settings.pixelSpin}deg) scale(${startScale})` },
      { transform: `rotate(0deg) scale(${endScale})` }
    ];
    const animateGrid = refs => frozenGrid.pixels.map((pixel, index) => refs.current[index].animate(keyframes, {
      duration: pixelMs, delay: pixel.offset * spread, easing: settings.easing, fill: 'both'
    }));
    animationsRef.current = [...animateGrid(pixelRefs), ...(outgoing.length ? animateGrid(concealPixelRefs) : [])];
    Promise.all(animationsRef.current.map(animation => animation.finished)).then(finish).catch(() => { /* Navigation or resizing canceled this reveal. */ });
    return () => { running = false; stopAnimations(); };
  }, [transition, clipId, cancelAnimations, stopAnimations]);

  const requestActive = useCallback(next => {
    if (active === undefined) setInternalActive(next);
    onActiveChange?.(next);
  }, [active, onActiveChange]);
  const interactionProps = useMemo(() => {
    if (trigger === 'hover') return {
      onMouseEnter: () => requestActive(true), onMouseLeave: () => requestActive(false),
      onFocus: () => requestActive(true), onBlur: () => requestActive(false), tabIndex: 0
    };
    if (trigger === 'click') return {
      onClick: () => requestActive(!desiredActive),
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); requestActive(!desiredActive); }
      }, role: 'button', tabIndex: 0
    };
    return {};
  }, [desiredActive, requestActive, trigger]);
  const renderLayer = (content, index) => (
    <div key={index} ref={element => { layerRefs.current[index] = element; }} className="pixel-swap__layer"
      data-visible={index === Number(shownActive)} aria-hidden={index !== Number(shownActive)}
      style={{ zIndex: index === Number(shownActive) ? 1 : 0 }}>
      {content}
    </div>
  );
  const hasConceal = transition && (Array.isArray(transition.conceal)
    ? transition.conceal.some(Boolean) : Boolean(transition.conceal));

  return (
    <div ref={containerRef} className={`pixel-swap ${className}`.trim()} style={{ aspectRatio, ...style }}
      data-active={shownActive} data-transitioning={!!transition} {...interactionProps}>
      {renderLayer(firstContent, 0)}
      {renderLayer(secondContent, 1)}
      {transition && maskActive && <svg className="pixel-swap__mask" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {transition.grid.pixels.map((pixel, index) => <rect key={pixel.id}
              ref={element => { pixelRefs.current[index] = element; }} className="pixel-swap__pixel"
              x={pixel.left} y={pixel.top} width={transition.grid.size} height={transition.grid.size}
              rx={transition.grid.size * clamp(pixelRadius, 0, 50) / 100} />)}
          </clipPath>
          {hasConceal && <mask id={`${clipId}-out`} maskUnits="userSpaceOnUse" x="0" y="0" width={transition.grid.width} height={transition.grid.height} style={{ maskType: 'luminance' }}>
            <rect width={transition.grid.width} height={transition.grid.height} fill="white" />
            {transition.grid.pixels.map((pixel, index) => <rect key={pixel.id}
              ref={element => { concealPixelRefs.current[index] = element; }} className="pixel-swap__pixel" fill="black"
              x={pixel.left} y={pixel.top} width={transition.grid.size} height={transition.grid.size}
              rx={transition.grid.size * clamp(pixelRadius, 0, 50) / 100} />)}
          </mask>}
        </defs>
      </svg>}
    </div>
  );
});

export default PixelSwap;
