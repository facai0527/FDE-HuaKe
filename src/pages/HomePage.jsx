import { useStory } from '../components/StoryContext';
import ShinyText from '../components/ShinyText';
import StrokeText from '../components/StrokeText';
import './HomePage.css';

export default function HomePage() {
  const { activeId, isTraveling, reducedMotion } = useStory();
  const textPaused = activeId !== 'home' || isTraveling || reducedMotion;
  return (
    <section className="home-scene" id="home" aria-label="首页">
      <div className="hero"><div className="hero__main">
        <div className="hero-heading">
          <h1 className="hero-title">
            <StrokeText text="F·D·E" material="liquid-metal" smoothMetal strokeColor="#C4D7E8" fillColor="#F8FAFC"
              strokeWidth={1.4} drawDuration={1.4} fillDelay={0.3} stagger={0.05}
              ease="power2.out" trigger="mount" fillMode="wipe" fontSize={160}
              fontWeight={700} letterSpacing={8} active={activeId === 'home'}
              paused={isTraveling} reducedMotion={reducedMotion} />
          </h1>
          <div className="hero-caption">
            <p className="hero-caption__eyebrow">
              <ShinyText text="Together We Grow. Further We Go." color="#ffffff" shineColor="#3F7BFF"
                speed={2} shineWidth={31} softness={0.8} trigger="loop" easing="linear"
                pauseOnHover paused={textPaused} />
            </p>
            <p className="hero-caption__body">
              <ShinyText text="以共学，致未来。" color="#ffffff" shineColor="#3F7BFF"
                speed={2} shineWidth={31} softness={0.8} trigger="loop" easing="linear"
                pauseOnHover paused={textPaused} />
            </p>
          </div>
        </div>
      </div></div>
    </section>
  );
}
