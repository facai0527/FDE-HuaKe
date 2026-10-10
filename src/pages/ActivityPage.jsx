import AccordionGallery from '../components/AccordionGallery';
import TextType from '../components/TextType';
import ShinyText from '../components/ShinyText';
import { useStory } from '../components/StoryContext';
import { assetPath } from '../assetPath';
import './ActivityPage.css';

const activityImages = [
  { image: assetPath('assets/activity/activity-venue.jpg'),  alt: '交流与分享空间的展示参考图' },
  { image: assetPath('assets/activity/activity-lounge.jpg'),  alt: '相聚与讨论空间的展示参考图' },
  { image: assetPath('assets/activity/activity-studio.png'),  alt: '工作坊与共创空间的展示参考图' },
  { image: assetPath('assets/activity/activity-night.png'), alt: '活动现场的展示参考图' },
];

export default function ActivityPage() {
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  const textActive = activeId === 'activity' || enteringId === 'activity';
  const textPaused = isTraveling && enteringId !== 'activity';
  const shineEffect = { color: '#a1a1aa', shineColor: '#ffffff', speed: 1.8,
    delay: 0.25, shineWidth: 55, softness: 0.45, angle: 110, direction: 'right',
    easing: 'linear', trigger: 'loop', paused: !textActive || textPaused || reducedMotion };
  return (
    <section className="activity-teaser" id="activity" aria-labelledby="activity-title">
      <div className="activity-intro">
        <div className="activity-intro__heading">
          <h2 id="activity-title"><strong><TextType as="span" text="思想相遇的地方。"
            typingSpeed={100} initialDelay={150} loop={false} active={textActive}
            paused={textPaused} reducedMotion={reducedMotion} /></strong></h2>
          <p className="chapter-english"><ShinyText {...shineEffect} text="Where Ideas Meet." /></p>
        </div>
        <p className="activity-intro__body">共学需要相遇的机会，也需要让人愿意停留、交流和动手的空间。在面对面的分享与共创中，让问题得到回应，让想法继续生长。</p>
      </div>
      <div className="activity-accordion-wrap">
        <AccordionGallery
          className="activity-accordion"
          items={activityImages}
          defaultIndex={0}
          height={420}
          gap={12}
          radius={14}
          expandRatio={0.52}
          trigger="click"
          tilt={0}
          parallax={0}
          duration={0.32}
          accentColor="var(--accent)"
          showOverlay={false}
          textColor="#ffffff"
          grayscale={false}
        />
      </div>
    </section>
  );
}
