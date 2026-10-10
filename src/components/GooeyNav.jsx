'use client';

import { useLayoutEffect, useRef } from 'react';
import './GooeyNav.css';

const DEFAULT_DISTANCES = [90, 10];
const DEFAULT_COLORS = [1, 2, 3, 1, 2, 3, 1, 4];
const noise = (n = 1) => n / 2 - Math.random() * n;
const getXY = (distance, index, total) => {
  const angle = ((360 + noise(8)) / total) * index * Math.PI / 180;
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
};

export default function GooeyNav({
  items, activeIndex = 0, reducedMotion = false,
  animationTime = 600, particleCount = 15, particleDistances = DEFAULT_DISTANCES,
  particleR = 100, timeVariance = 300, colors = DEFAULT_COLORS,
  className = '', label = '页面导航'
}) {
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const previousIndex = useRef(activeIndex);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const filter = filterRef.current;
    const text = textRef.current;
    const item = navRef.current.children[activeIndex];
    if (!item) return;
    const position = () => {
      const outer = container.getBoundingClientRect();
      const rect = item.getBoundingClientRect();
      const style = { left: `${rect.left - outer.left}px`, top: `${rect.top - outer.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
      Object.assign(filter.style, style);
      Object.assign(text.style, style);
      text.textContent = items[activeIndex].label;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(container);
    observer.observe(item);
    let timer;
    let frame;
    if (previousIndex.current !== activeIndex && !reducedMotion) {
      // One bounded burst, canceled on every selection. No lingering particle
      // timers or blur work while the navigation is idle.
      const total = Math.min(15, Math.max(0, particleCount));
      const fragment = document.createDocumentFragment();
      let longest = 0;
      for (let i = 0; i < total; i++) {
        const start = getXY(particleDistances[0], total - i, total);
        const end = getXY(particleDistances[1] + noise(7), total - i, total);
        const time = Math.max(200, animationTime * 2 + noise(timeVariance * 2));
        let rotate = noise(particleR / 10);
        rotate = (rotate + (rotate > 0 ? 1 : -1) * particleR / 20) * 10;
        longest = Math.max(longest, time);
        const particle = document.createElement('span');
        particle.className = 'particle';
        const properties = {
          '--start-x': `${start[0]}px`, '--start-y': `${start[1]}px`,
          '--end-x': `${end[0]}px`, '--end-y': `${end[1]}px`,
          '--time': `${time}ms`, '--scale': `${1 + noise(0.2)}`,
          '--color': `var(--color-${colors[Math.floor(Math.random() * colors.length)]}, white)`,
          '--rotate': `${rotate}deg`
        };
        Object.entries(properties).forEach(([key, value]) => particle.style.setProperty(key, value));
        const point = document.createElement('span');
        point.className = 'point';
        particle.appendChild(point);
        fragment.appendChild(particle);
      }
      frame = requestAnimationFrame(() => {
        filter.replaceChildren(fragment);
        filter.classList.add('active');
        timer = window.setTimeout(() => {
          filter.replaceChildren();
          filter.classList.remove('active');
        }, longest);
      });
    }
    previousIndex.current = activeIndex;
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      filter.replaceChildren();
      filter.classList.remove('active');
    };
  }, [activeIndex, items, reducedMotion, animationTime, particleCount, particleDistances, particleR, timeVariance, colors]);

  return (
    <div className={`gooey-nav-container ${className}`.trim()} ref={containerRef}>
      <nav aria-label={label}>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={item.href} className={activeIndex === index ? 'active' : ''}>
              <a href={item.href} aria-current={activeIndex === index ? 'page' : undefined}
                onKeyDown={event => {
                  if (event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
                }}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} aria-hidden="true" />
      <span className="effect text active" ref={textRef} aria-hidden="true" />
    </div>
  );
}
