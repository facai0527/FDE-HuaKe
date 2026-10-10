import { STORY_PAGES, useStory } from './StoryContext';
import './ScrollCue.css';

export default function ScrollCue() {
  const { activeId, isTraveling, reducedMotion } = useStory();
  const index = STORY_PAGES.findIndex(page => page.id === activeId);
  const nextPage = STORY_PAGES[(index + 1) % STORY_PAGES.length];
  const returningHome = index === STORY_PAGES.length - 1;

  return (
    <div className="scroll-cue" data-paused={isTraveling || reducedMotion}
      data-returning-home={returningHome} inert={isTraveling ? '' : undefined}>
      <a className="scroll-cue__link" href={`#${nextPage.id}`}
        aria-label={returningHome ? '返回首页' : `向下滚动，进入${nextPage.label}`}>
        <span className="scroll-cue__mouse" aria-hidden="true"><span className="scroll-cue__wheel" /></span>
        <span className="scroll-cue__direction" aria-hidden="true"><span className="scroll-cue__arrow" /></span>
      </a>
    </div>
  );
}
