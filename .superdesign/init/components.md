# Shared UI

React 18 / Vite / plain CSS. No generic button/input library. SiteNavigation is shared by all five sections. Gallery, ticket, and tilted card components are page-specific.

## src/components/SiteNavigation.jsx

```jsx
import { useEffect, useState } from 'react';
import './SiteNavigation.css';

const pages = [
  { id: 'home', label: '首页' },
  { id: 'activity', label: '活动场域' },
  { id: 'projects', label: '项目' },
  { id: 'student-cases', label: '学生案例' },
  { id: 'about', label: '关于' },
];

export default function SiteNavigation() {
  const [activeId, setActiveId] = useState('home');

  useEffect(() => {
    const sections = pages.map(({ id }) => document.getElementById(id));
    let frame = 0;

    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.35;
      let current = 'home';
      sections.forEach((section) => {
        if (section && section.getBoundingClientRect().top <= readingLine) {
          current = section.id;
        }
      });
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const pageNumber = String(pages.findIndex(({ id }) => id === activeId) + 1).padStart(2, '0');

  return (
    <header className="site-header">
      <nav className="jelly-radio" aria-label="FDE 页面导航">
        {pages.map(({ id, label }) => (
          <a
            className={`jelly-radio__chip${activeId === id ? ' is-active' : ''}`}
            href={`#${id}`}
            key={id}
            aria-current={activeId === id ? 'page' : undefined}
          >
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="header-meta">
        <span>HUAKE FUTURE · WUHAN</span>
        <span>PAGE {pageNumber} / 05</span>
      </div>
    </header>
  );
}

```
## src/components/SiteNavigation.css

```css
.site-header {
  position: fixed;
  z-index: 100;
  inset: 0 0 auto;
  display: flex;
  height: 94px;
  align-items: center;
  justify-content: flex-end;
  padding: 0 7vw;
  pointer-events: none;
}

.jelly-radio {
  position: absolute;
  left: 50%;
  display: inline-flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, .7);
  border-radius: 999px;
  background: rgba(255, 255, 255, .88);
  box-shadow: 0 12px 32px rgba(37, 99, 235, .10), inset 0 0 0 1px rgba(255, 255, 255, .75);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.jelly-radio__chip {
  color: rgba(23, 23, 23, .64);
  font-family: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .08em;
  transition: color .2s ease;
}

.jelly-radio__chip span {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 999px;
  white-space: nowrap;
  transition: background .2s ease, box-shadow .2s ease;
}

.jelly-radio__chip:hover { color: #0f172a; }
.jelly-radio__chip:hover span { background: rgba(59, 130, 246, .1); }
.jelly-radio__chip.is-active { color: #0f172a; }
.jelly-radio__chip.is-active span {
  border-color: rgba(59, 130, 246, .26);
  background: linear-gradient(135deg, rgba(96, 165, 250, .25), rgba(14, 165, 233, .13));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .85), 0 5px 16px rgba(37, 99, 235, .14);
}
.jelly-radio__chip:focus-visible { outline: 2px solid #2563eb; outline-offset: 4px; border-radius: 999px; }

.header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  color: #7b8491;
  font-family: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  font-size: 9px;
  letter-spacing: .24em;
}

@media (max-width: 1000px) {
  .header-meta { display: none; }
}

@media (max-width: 767px) {
  .site-header { height: 76px; padding: 0 5vw; }
  .jelly-radio { max-width: calc(100% - 24px); gap: 0; padding: 4px; }
  .jelly-radio__chip span { min-height: 34px; padding: 0 11px; font-size: 11px; }
}

@media (max-width: 360px) {
  .jelly-radio__chip span { padding: 0 8px; }
}

```
