import AboutLanyard from '../components/AboutLanyard';
import ShinyText from '../components/ShinyText';
import StrokeText from '../components/StrokeText';
import { useStory } from '../components/StoryContext';
import './AboutPage.css';

export default function AboutPage() {
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  const textActive = activeId === 'about' || enteringId === 'about';
  const textPaused = !textActive || (isTraveling && enteringId !== 'about');
  const titleEffect = {
    material: 'liquid-metal',
    smoothMetal: true,
    bevel: false,
    strokeColor: '#C4D7E8',
    fillColor: '#F8FAFC',
    strokeWidth: 0.65,
    drawDuration: 1.4,
    fillDelay: 0.3,
    stagger: 0.05,
    trigger: 'mount',
    fillMode: 'wipe',
    fontSize: 64,
    fontWeight: 700,
    letterSpacing: -2.88,
    active: textActive,
    paused: textPaused,
    reducedMotion,
  };
  const shineEffect = {
    color: '#a1a1aa',
    shineColor: '#ffffff',
    speed: 1.8,
    delay: 0.25,
    shineWidth: 55,
    softness: 0.45,
    angle: 110,
    direction: 'right',
    easing: 'linear',
    trigger: 'loop',
    paused: textPaused || reducedMotion,
  };

  return (
    <section className="about-teaser about-scene" id="about" aria-labelledby="about-title">
      <div className="about-scene__content" data-story-scroll tabIndex={0} role="region" aria-label="关于华科未来·FDE与挂绳卡片">
      <div className="about-teaser__identity">
        <h2 id="about-title">
          <span className="about-teaser__headline"><StrokeText {...titleEffect} text="下一段同行，" /></span>
          <span className="about-teaser__headline about-teaser__headline--offset"><StrokeText {...titleEffect} text="从这里开始。" /></span>
        </h2>
        <p className="chapter-english"><ShinyText {...shineEffect} text="Let’s Shape What’s Next." /></p>
        <p className="about-teaser__body">如果你也希望让技术更容易被理解和使用，愿意分享经验、尝试新的可能，欢迎与我们联系。</p>
        <p className="about-teaser__body">无论是项目合作、课程交流，还是一次共学活动，我们都愿意从具体的话题开始，与你探索下一步。</p>
        <div className="about-teaser__actions">
          <a className="about-teaser__button" href="https://www.huakefuture.com/contact.html" target="_blank" rel="noopener noreferrer">联系华科未来·FDE</a>
          <a className="about-teaser__button" href="https://www.huakefuture.com/" target="_blank" rel="noopener noreferrer">访问公司官网</a>
        </div>
      </div>
      <AboutLanyard />
      </div>
    </section>
  );
}
