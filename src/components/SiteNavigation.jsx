import { useStory } from './StoryContext';
import './SiteNavigation.css';

const pages = [
  { id: 'home', label: '首页' },
  { id: 'activity', label: '活动场域' },
  { id: 'projects', label: '项目' },
  { id: 'student-cases', label: '学生案例' },
  { id: 'about', label: '关于' },
];

export default function SiteNavigation() {
  const { activeId } = useStory();

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
