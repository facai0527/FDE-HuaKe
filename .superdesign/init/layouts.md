# Shared layouts

App assembles five sections below a fixed header; normal document scroll.

## src/App.jsx

```jsx
import SiteNavigation from './components/SiteNavigation';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import ProjectsPage from './pages/ProjectsPage';
import StudentCasesPage from './pages/StudentCasesPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <>
      <SiteNavigation />
      <main className="site-shell">
        <HomePage />
        <ActivityPage />
        <ProjectsPage />
        <StudentCasesPage />
        <AboutPage />
      </main>
    </>
  );
}

```
## src/main.jsx

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```
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
