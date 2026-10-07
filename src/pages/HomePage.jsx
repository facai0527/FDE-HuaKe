import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStory } from '../components/StoryContext';
import './HomePage.css';

gsap.registerPlugin(useGSAP);

const INTRO_END = 3.3;

export default function HomePage() {
  const sceneRef = useRef(null);
  const leftMotionRef = useRef(null);
  const rightMotionRef = useRef(null);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  const motionRef = useRef(null);
  const { activeId, isTraveling, paused, reducedMotion, held, navigate } = useStory();

  useGSAP(() => {
    const hands = [leftMotionRef.current, rightMotionRef.current];

    if (reducedMotion) {
      gsap.set(hands, { x: 0, y: 0 });
      gsap.set('.hero-letter, .hero-copy__eyebrow, .hero-copy__body, .scroll-cue', {
        autoAlpha: 1,
        y: 0,
      });
      return;
    }

    // Wrappers own approach and breathing; each image owns the held response.
    const timeline = gsap.timeline({ paused: true });
    motionRef.current = timeline;
    timeline
      .fromTo(hands, {
        x: (index) => (index === 0 ? -1 : 1) * window.innerWidth * 0.06,
        y: 0,
      }, { x: 0, duration: 3.2, ease: 'power2.out' }, 0.1)
      .fromTo('.hero-letter', { autoAlpha: 0 }, {
        autoAlpha: 1, duration: 0.8, stagger: 0.12, ease: 'power1.out',
      }, 1.15)
      .fromTo('.hero-copy__eyebrow, .hero-copy__body', { autoAlpha: 0, y: 8 }, {
        autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.16, ease: 'power2.out',
      }, 1.8)
      .fromTo('.scroll-cue', { autoAlpha: 0 }, {
        autoAlpha: 1, duration: 0.65, ease: 'power1.out',
      }, 2.6)
      .to(leftMotionRef.current, {
        x: 1.2, y: -1.4, duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut',
      }, INTRO_END)
      .to(rightMotionRef.current, {
        x: -1, y: 1.1, duration: 4.6, repeat: -1, yoyo: true, ease: 'sine.inOut',
      }, INTRO_END + 0.8);

    return () => {
      if (motionRef.current === timeline) motionRef.current = null;
    };
  }, { scope: sceneRef, dependencies: [reducedMotion], revertOnUpdate: true });

  useGSAP(() => {
    const timeline = motionRef.current;
    if (!timeline) return;
    if (paused && activeId === 'home' && !isTraveling && timeline.time() < INTRO_END) {
      timeline.time(INTRO_END);
    }
    timeline.paused(activeId !== 'home' || isTraveling || paused || reducedMotion);
  }, { scope: sceneRef, dependencies: [activeId, isTraveling, paused, reducedMotion] });

  useGSAP(() => {
    const amount = held && activeId === 'home' && !paused && !isTraveling && !reducedMotion ? 2 : 0;
    gsap.to([leftHandRef.current, rightHandRef.current], {
      x: (index) => (index === 0 ? amount : -amount),
      duration: reducedMotion ? 0 : 0.32,
      ease: 'sine.out',
      overwrite: 'auto',
    });
  }, { scope: sceneRef, dependencies: [held, activeId, paused, isTraveling, reducedMotion] });

  return (
    <section className="home-scene" id="home" ref={sceneRef} aria-label="首页">
      <div className="hero">
        <div className="hero__main">
          <div className="hands-stage" aria-hidden="true">
            <div className="hand-motion hand-motion--left" ref={leftMotionRef}>
                <img ref={leftHandRef} className="hands-layer hands-layer--left" src="/assets/fde-hand-robot-interaction.png" alt="" fetchpriority="high" draggable={false} />
            </div>
            <div className="hand-motion hand-motion--right" ref={rightMotionRef}>
              <img ref={rightHandRef} className="hands-layer hands-layer--right" src="/assets/fde-hand-robot-interaction.png" alt="" draggable={false} />
            </div>
          </div>
          <div className="hero-copy">
            <div className="hero-copy__motion">
              <h1 className="hero-tech-text" aria-label="FDE"><span className="hero-letter" aria-hidden="true">F</span>{' '}<span className="hero-letter" aria-hidden="true">D</span>{' '}<span className="hero-letter" aria-hidden="true">E</span></h1>
              <p className="hero-copy__eyebrow">Future · Design · Exploration</p>
              <p className="hero-copy__body">与华科未来一起，把想法带到真实世界。</p>
            </div>
          </div>
          <div className="scroll-cue">
            <a className="hero-copy__link" href="#activity" onClick={(event) => {
              event.preventDefault();
              navigate('activity');
            }}>向左拖动，走进自然 <span aria-hidden="true">←</span></a>
            <span>或向下滚动探索</span>
            <span className="scroll-cue__mouse" aria-hidden="true"><i /></span>
          </div>
        </div>
      </div>
    </section>
  );
}
