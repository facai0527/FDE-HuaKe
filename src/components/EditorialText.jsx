import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './EditorialText.css';

/**
 * Adapted from React Bits BlurText, SplitText and DecryptedText.
 * https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations
 * Copyright (c) 2026 David Haz — MIT + Commons Clause; see ../../licenses/react-bits.txt.
 *
 * This edition follows the site's chapter lifecycle instead of a window scroll
 * trigger. Inline glyphs preserve Chinese line-breaking and punctuation rules;
 * the real text stays in the document throughout the animation.
 */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const prefersLessMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function segmentText(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text), part => part.segment);
  }
  return Array.from(text);
}

/** delay/duration/stagger are seconds. String children may be used instead of text. */
export default function EditorialText({
  as: Tag = 'span',
  effect = 'blur',
  text,
  children,
  active = true,
  paused = false,
  reducedMotion = false,
  delay = 0,
  duration = 0.7,
  stagger = 0.028,
  className = '',
  style,
  onAnimationComplete,
  ...props
}) {
  const content = String(text ?? (typeof children === 'string' || typeof children === 'number' ? children : ''));
  const variant = ['blur', 'split', 'decrypt'].includes(effect) ? effect : 'blur';
  const glyphs = useMemo(() => segmentText(content), [content]);
  const rootRef = useRef(null);
  const playbackRef = useRef(null);
  const callbackRef = useRef(onAnimationComplete);
  const pausedRef = useRef(paused);
  const [systemReducedMotion, setSystemReducedMotion] = useState(prefersLessMotion);
  const motionDisabled = reducedMotion || systemReducedMotion;
  callbackRef.current = onAnimationComplete;
  pausedRef.current = paused;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.dataset.state = !active ? 'inactive' : motionDisabled ? 'static' : 'running';
    if (!active || motionDisabled || !content) return undefined;

    let cancelled = false;
    let finished = false;
    let frameId = 0;
    let lastFrameTime = null;
    let elapsed = 0;
    let lastScrambleTick = -1;
    const animations = [];
    const wait = clamp(Number(delay) || 0, 0, 3) * 1000;
    const time = clamp(Number(duration) || 0.7, 0.2, 2) * 1000;
    const shouldPause = () => pausedRef.current || document.hidden;
    const encoded = variant === 'decrypt'
      ? Array.from(root.querySelectorAll('[data-editorial-code]'))
      : [];

    const clearEncoded = () => encoded.forEach(element => {
      delete element.dataset.encoded;
      const overlay = element.querySelector('.editorial-text__cipher');
      if (overlay) overlay.textContent = '';
    });
    const complete = () => {
      if (cancelled || finished) return;
      finished = true;
      clearEncoded();
      animations.forEach(animation => animation.cancel());
      root.dataset.state = 'complete';
      callbackRef.current?.();
    };

    const scramble = (progress, tick) => {
      const revealed = Math.floor(progress * encoded.length);
      encoded.forEach((element, index) => {
        const overlay = element.querySelector('.editorial-text__cipher');
        if (!overlay) return;
        if (index < revealed) {
          delete element.dataset.encoded;
          overlay.textContent = '';
        } else {
          element.dataset.encoded = 'true';
          // Deterministic variation avoids random width/layout changes: every
          // cipher sits over its real character, which retains its exact width.
          overlay.textContent = SCRAMBLE_CHARS[(index * 13 + tick * 7) % SCRAMBLE_CHARS.length];
        }
      });
    };

    const frame = now => {
      frameId = 0;
      if (cancelled || finished || shouldPause()) return;
      if (lastFrameTime !== null) elapsed += now - lastFrameTime;
      lastFrameTime = now;
      const progress = clamp((elapsed - wait) / time, 0, 1);
      const tick = Math.floor(elapsed / 45);
      if (progress >= 1) { complete(); return; }
      if (tick !== lastScrambleTick) {
        lastScrambleTick = tick;
        scramble(progress, tick);
      }
      frameId = requestAnimationFrame(frame);
    };

    const updatePlayback = () => {
      if (cancelled || finished) return;
      const stopped = shouldPause();
      root.dataset.state = stopped ? 'paused' : 'running';
      animations.forEach(animation => stopped ? animation.pause() : animation.play());
      if (variant === 'decrypt') {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        lastFrameTime = null;
        if (!stopped) frameId = requestAnimationFrame(frame);
      }
    };

    if (variant === 'decrypt') {
      if (!encoded.length) { complete(); return undefined; }
      scramble(0, 0);
    } else if (typeof root.animate === 'function') {
      const targets = variant === 'split'
        ? Array.from(root.querySelectorAll('.editorial-text__unit'))
        : [root];
      // Long headings still resolve promptly rather than waiting per letter.
      const step = targets.length > 1
        ? Math.min(clamp(Number(stagger) || 0, 0, 0.15) * 1000, 420 / (targets.length - 1))
        : 0;
      targets.forEach((element, index) => {
        const animation = element.animate(
          variant === 'split'
            ? [{ opacity: 0, top: '.48em', filter: 'blur(2px)' }, { opacity: 1, top: '0em', filter: 'blur(0px)' }]
            : [{ opacity: 0.08, filter: 'blur(5px)', top: '8px' }, { opacity: 1, filter: 'blur(0px)', top: '0px' }],
          { duration: time, delay: wait + index * step, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }
        );
        animations.push(animation);
      });
      Promise.all(animations.map(animation => animation.finished)).then(complete).catch(() => {});
    } else {
      complete();
      return undefined;
    }

    playbackRef.current = updatePlayback;
    updatePlayback();
    document.addEventListener('visibilitychange', updatePlayback);
    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      animations.forEach(animation => animation.cancel());
      clearEncoded();
      document.removeEventListener('visibilitychange', updatePlayback);
      if (playbackRef.current === updatePlayback) playbackRef.current = null;
    };
  }, [active, motionDisabled, content, variant, delay, duration, stagger]);

  useLayoutEffect(() => { playbackRef.current?.(); }, [paused]);

  return (
    <Tag
      {...props}
      ref={rootRef}
      className={`editorial-text editorial-text--${variant} ${className}`.trim()}
      data-text-effect={variant}
      style={content.includes('\n') ? { whiteSpace: 'pre-line', ...style } : style}
    >
      {variant === 'blur' ? content : glyphs.map((glyph, index) => {
        if (/\s/u.test(glyph)) return glyph;
        if (variant === 'decrypt' && /[A-Za-z0-9]/.test(glyph)) {
          return (
            <i className="editorial-text__code" data-editorial-code key={index}>
              <b className="editorial-text__original">{glyph}</b>
              <b className="editorial-text__cipher" aria-hidden="true" />
            </i>
          );
        }
        return variant === 'split'
          ? <i className="editorial-text__unit" key={index}>{glyph}</i>
          : glyph;
      })}
    </Tag>
  );
}
