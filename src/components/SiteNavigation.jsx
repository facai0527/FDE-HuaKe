import { STORY_CHAPTERS, chapterIdFor, useStory } from './StoryContext';
import GooeyNav from './GooeyNav';
import SmoothMetalLogo from './SmoothMetalLogo';
import './SiteNavigation.css';

const pages = STORY_CHAPTERS;
const navItems = pages.map(({ id, label }) => ({ label, href: `#${id}` }));
const particleDistances = [44, 8];

export default function SiteNavigation() {
  const { destinationId, isTraveling, reducedMotion } = useStory();

  return (
    <header className="site-header" data-theme="dark">
      <a className="header-logo" href="#home" aria-label="华科未来 HUA KE FUTURE 首页">
        <SmoothMetalLogo paused={isTraveling} reducedMotion={reducedMotion} />
      </a>
      <GooeyNav className="site-navigation" label="FDE 页面导航" items={navItems}
        activeIndex={pages.findIndex(({ id }) => id === chapterIdFor(destinationId))}
        reducedMotion={reducedMotion} particleCount={10} particleDistances={particleDistances}
        animationTime={400} timeVariance={100} />
    </header>
  );
}
