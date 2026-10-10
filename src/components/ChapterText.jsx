import { useStory } from './StoryContext';
import EditorialText from './EditorialText';
import TechText from './TechText';
import './ChapterText.css';

// Text reveals follow the chapter lifecycle, including returning to a page.
export default function ChapterText({ chapter, enabled = true, ...props }) {
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  return <EditorialText {...props} active={(activeId === chapter || enteringId === chapter) && enabled}
    paused={isTraveling && enteringId !== chapter} reducedMotion={reducedMotion} />;
}

export function ChapterTechText({ chapter, className = '', ...props }) {
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  return <TechText fontWeight={400} letterSpacing={0.01} reach={90} softness={0.65}
    strokeWidth={0.75} specks={5} labels={false} draggable={false} sweep={false}
    {...props} className={`chapter-tech-text ${className}`.trim()}
    active={activeId === chapter || enteringId === chapter} paused={isTraveling && enteringId !== chapter} reducedMotion={reducedMotion} />;
}

export function ChapterTechParagraph({ chapter, ...props }) {
  return <ChapterTechText chapter={chapter} multiline align="left" sweep speed={0.85}
    color="#f5f5f5" accentColor="#ffffff" reveal="letter" dashLength={4} dashGap={2}
    strokeWidth={0.55} specks={3} className="chapter-tech-paragraph" {...props} />;
}
