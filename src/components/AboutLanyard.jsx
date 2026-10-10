import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStory } from './StoryContext';
import StrokeText from './StrokeText';
import './AboutLanyard.css';

const loadLanyard = () => import('./Lanyard');
const Lanyard = lazy(loadLanyard);
const WEBSITE = 'https://www.huakefuture.com/';

export default function AboutLanyard() {
  const { activeId, destinationId, isTraveling, reducedMotion } = useStory();
  const stage = useRef(null);
  const lanyard = useRef(null);
  const previouslyVisible = useRef(false);
  const [viewportHost, setViewportHost] = useState(null);
  const [stageInView, setStageInView] = useState(false);
  const [keepMounted, setKeepMounted] = useState(false);
  const [face, setFace] = useState('front');
  const [portrait, setPortrait] = useState(() => matchMedia('(max-width: 767px)').matches);
  const visible = activeId === 'about' || destinationId === 'about';
  useLayoutEffect(() => {
    // Reuse GPU resources, but replay the same initial pose on a chapter visit.
    // The first lazy mount initializes itself if the ref is not ready yet.
    if (visible && !previouslyVisible.current) lanyard.current?.restartIntro();
    previouslyVisible.current = visible;
  }, [visible]);
  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      if (!cancelled) loadLanyard().catch(() => { /* The normal lazy load handles an import error on entry. */ });
    };
    // Fetch/evaluate the module while idle; no renderer is created until the
    // chapter first becomes visible, preserving its original first entrance.
    const idle = typeof window.requestIdleCallback === 'function';
    const handle = idle ? window.requestIdleCallback(preload) : window.setTimeout(preload, 1500);
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);
  useEffect(() => { if (visible) setKeepMounted(true); }, [visible]);
  useEffect(() => {
    const query = matchMedia('(max-width: 767px)');
    const update = () => setPortrait(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const placeholder = stage.current;
    if (!placeholder) return undefined;
    setViewportHost(placeholder.closest('#about'));
    const observer = new IntersectionObserver(([entry]) => {
      // On phones, show the floating card once its section is in view so the
      // strap and card don't obscure the introduction or the central beam.
      const visibleHeight = Math.min(entry.boundingClientRect.height * .85,
        (entry.rootBounds?.height || window.innerHeight) * .7);
      setStageInView(entry.isIntersecting && entry.intersectionRect.height >= visibleHeight);
    }, { root: placeholder.closest('[data-story-scroll]'), threshold: Array.from({ length: 21 }, (_, index) => index / 20) });
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, []);
  const paused = activeId !== 'about' || isTraveling;
  const stageVisible = !portrait || stageInView;
  const viewportVisible = visible && stageVisible;

  return (
    <div className="about-lanyard">
      <div ref={stage} className="about-lanyard__stage" aria-hidden="true" />
      {(visible || keepMounted) && viewportHost && createPortal(
        <div className="about-lanyard__viewport" data-visible={viewportVisible} aria-hidden={!viewportVisible} inert={!paused && viewportVisible ? undefined : ''}>
        <Suspense fallback={<div className="about-lanyard__loading">正在展开这张邀请卡…</div>}>
          <Lanyard ref={lanyard} layoutRef={stage} orientation={portrait ? 'portrait' : 'landscape'} cardColor="#f4f6fa" backColor="#0d1421"
            finish="glossy" size={.72} strapLength={portrait ? .18 : .2} strapWidth={.55} strapColor="#3278d2"
            metal="silver" breeze={.16} damping={.7} elasticity={.4} cornerRadius={.3}
            intro={!reducedMotion} paused={paused || !stageVisible} interactive={!paused && stageVisible} onFaceChange={setFace}
            frontContent={<div className="fde-card fde-card--front">
              <div className="fde-card__topline"><span>HUA KE FUTURE · FDE</span><span>FDE / 06</span></div>
              <div className="fde-card__identity">
                <img src="/assets/huake-logo-transparent.png" alt="华科未来·FDE 标志" draggable={false} />
                <div><h3>华科未来·FDE</h3><p>以共学，致未来。</p></div>
              </div>
              <div className="fde-card__rule" />
              <p className="fde-card__belief">让技术的可能，成为更多人的可能。</p>
              <div className="fde-card__bottomline">
                <a className="fde-card__website" href={WEBSITE} target="_blank" rel="noopener noreferrer">访问华科未来·FDE 官网</a>
                <span className="fde-card__domain">huakefuture.com</span>
              </div>
            </div>}
            backContent={<div className="fde-card fde-card--back">
              <div className="fde-card__topline"><span>FORWARD / DEPLOYED / ENGINEER</span><span>FDE</span></div>
              <div className="fde-card__metal" aria-label="FDE 液态金属字母">
                <StrokeText text="FDE" material="liquid-metal" strokeColor="#C4D7E8" fillColor="#F8FAFC"
                  strokeWidth={1.4} drawDuration={1.2} fillDelay={.2} stagger={.05}
                  trigger="mount" fillMode="wipe" fontSize={190} fontWeight={700} letterSpacing={10}
                  active={visible && stageVisible && face === 'back'} paused={paused || !stageVisible} reducedMotion={reducedMotion} />
              </div>
              <p className="fde-card__motto">Together We Grow.<br />Further We Go.</p>
              <div className="fde-card__backline"><span>以共学，致未来。</span><span>HUA KE FUTURE · FDE</span></div>
            </div>} />
        </Suspense>
        </div>, viewportHost)}
    </div>
  );
}
