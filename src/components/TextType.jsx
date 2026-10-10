'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './TextType.css';

// Adapted from the supplied React Bits TextType source.
// License: ../../licenses/react-bits.txt. Adds chapter-aware pause/replay,
// reduced motion, stable sizing and a full accessible copy of each sentence.
export default function TextType({
  text, as: Component = 'div', typingSpeed = 50, initialDelay = 0,
  pauseDuration = 2000, deletingSpeed = 30, loop = true,
  className = '', showCursor = true, hideCursorWhileTyping = false,
  cursorCharacter = '|', cursorClassName = '', cursorBlinkDuration = 0.5,
  textColors = [], variableSpeed, onSentenceComplete, startOnVisible = false,
  reverseMode = false, active = true, paused = false, reducedMotion = false,
  ...props
}) {
  const rootRef = useRef(null);
  const cursorRef = useRef(null);
  const callbackRef = useRef(onSentenceComplete);
  const completedRef = useRef(-1);
  const [sentence, setSentence] = useState(0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [visible, setVisible] = useState(!startOnVisible);
  const [documentVisible, setDocumentVisible] = useState(() => !document.hidden);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const textKey = JSON.stringify(Array.isArray(text) ? text : [text ?? '']);
  const sentences = useMemo(() => {
    const source = JSON.parse(textKey);
    return (source.length ? source : ['']).map(value => String(value ?? ''));
  }, [textKey]);
  const index = Math.min(sentence, sentences.length - 1);
  const characters = useMemo(() => {
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
    const glyphs = segmenter ? [...segmenter.segment(sentences[index])].map(part => part.segment) : Array.from(sentences[index]);
    return reverseMode ? glyphs.reverse() : glyphs;
  }, [sentences, index, reverseMode]);
  const reduce = reducedMotion || systemReduced;
  const running = active && !paused && visible && documentVisible && !reduce;
  const complete = !deleting && count >= characters.length;
  const displayedText = reduce ? characters.join('') : characters.slice(0, count).join('');
  callbackRef.current = onSentenceComplete;

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setSystemReduced(motion.matches);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    motion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    setSentence(0);
    setCount(0);
    setDeleting(false);
    completedRef.current = -1;
  }, [sentences, active, reverseMode]);

  useEffect(() => {
    if (!running) return undefined;
    let timer;
    if (deleting) {
      if (count > 0) timer = setTimeout(() => setCount(value => value - 1), Math.max(1, deletingSpeed));
      else {
        completedRef.current = -1;
        setDeleting(false);
        setSentence(value => (value + 1) % sentences.length);
      }
    } else if (count < characters.length) {
      const min = Math.max(1, variableSpeed?.min ?? typingSpeed);
      const max = Math.max(min, variableSpeed?.max ?? typingSpeed);
      const delay = min + Math.random() * (max - min) + (count === 0 ? initialDelay : 0);
      timer = setTimeout(() => setCount(value => value + 1), Math.max(1, delay));
    } else {
      if (completedRef.current !== index) {
        completedRef.current = index;
        callbackRef.current?.(sentences[index], index);
      }
      if (characters.length && (loop || index < sentences.length - 1)) {
        timer = setTimeout(() => setDeleting(true), Math.max(0, pauseDuration));
      }
    }
    return () => clearTimeout(timer);
  }, [running, count, deleting, characters, sentences, index, typingSpeed, initialDelay,
    deletingSpeed, pauseDuration, loop, variableSpeed?.min, variableSpeed?.max]);

  const cursorHidden = reduce || count === 0 || (hideCursorWhileTyping && !complete);
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !showCursor || cursorHidden) return undefined;
    gsap.set(cursor, { opacity: 1 });
    if (!running) return undefined;
    const blink = gsap.to(cursor, {
      opacity: 0, duration: Math.max(0.1, cursorBlinkDuration), repeat: -1,
      yoyo: true, ease: 'power2.inOut',
    });
    return () => blink.kill();
  }, [showCursor, cursorHidden, cursorBlinkDuration, running]);

  return createElement(Component, {
    ...props, ref: rootRef, className: `text-type ${className}`.trim(),
    'data-state': reduce ? 'static' : !running ? 'paused' : complete && !loop ? 'complete' : deleting ? 'deleting' : 'typing',
  },
  <span className="text-type__sizer" aria-hidden="true">
    {sentences.map((value, item) => <span key={item}>{value}{showCursor && <span className="text-type__cursor-space">{cursorCharacter}</span>}</span>)}
  </span>,
  <span className="text-type__visual" aria-hidden="true">
    <span className="text-type__content" style={{ color: textColors[index % textColors.length] || 'inherit' }}>{displayedText}</span>
    {showCursor && <span ref={cursorRef} className={`text-type__cursor ${cursorClassName} ${cursorHidden ? 'text-type__cursor--hidden' : ''}`.trim()}>{cursorCharacter}</span>}
  </span>,
  <span className="text-type__accessible">{sentences[index]}</span>);
}
