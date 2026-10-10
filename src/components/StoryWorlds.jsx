import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import CrystalizedBall from './CrystalizedBall';
import HomeHands from './HomeHands';
import './StoryWorlds.css';

const WORLD_FOR_PAGE = {
  home: 'crystal', team: 'crystal', activity: 'crystal', projects: 'crystal',
  'student-cases': 'crystal', about: 'crystal'
};
const worldFor = id => WORLD_FOR_PAGE[id] || 'crystal';
const logoPage = id => id === 'projects' || id === 'student-cases';
const spiralPage = id => id === 'activity' || id === 'about';
const gatheredPage = id => logoPage(id) || spiralPage(id);
const expandedPage = id => id === 'team' || gatheredPage(id);

const StoryWorlds = forwardRef(function StoryWorlds({ activeId, destinationId, reducedMotion, transitioning }, ref) {
  const layers = useRef({});
  const anchor = useRef(null);
  const framing = useRef(null);
  const expansion = useRef(expandedPage(activeId) ? 1 : 0);
  const logo = useRef(gatheredPage(activeId) ? 1 : 0);
  const spiral = useRef(spiralPage(activeId) ? 1 : 0);
  const beam = useRef(activeId === 'about' ? 1 : 0);
  const casesSpread = useRef(activeId === 'student-cases' ? 1 : 0);
  const command = useRef(0);
  const reduced = useRef(reducedMotion);
  reduced.current = reducedMotion;
  const currentPage = useRef(activeId);
  const flight = useRef(null);
  const bounds = useRef(null);
  const crystalElement = useRef(null);
  const published = useRef({});
  const frozen = reducedMotion || transitioning;
  const orbJourney = transitioning && worldFor(activeId) === 'crystal' && worldFor(destinationId) === 'crystal';
  const crystalVisible = worldFor(activeId) === 'crystal' || worldFor(destinationId) === 'crystal';

  const applyFrame = (value, logoValue = logo.current, spiralValue = spiral.current, beamValue = beam.current, spreadValue = casesSpread.current) => {
    expansion.current = value;
    logo.current = logoValue;
    spiral.current = spiralValue;
    beam.current = beamValue;
    casesSpread.current = spreadValue;
    if (!bounds.current) return;
    const { x, y, radius, width, height, largeRadius, pointRadius, logoWidth } = bounds.current;
    // Update the existing uniform data without allocating arrays every frame.
    const frame = framing.current ||= { center: [0, 0], spiralScale: [0, 0], logoCenter: [0, 0] };
    frame.center[0] = x;
    frame.center[1] = height - (y + (height * .5 - y) * value);
    frame.radius = radius + (largeRadius - radius) * value;
    frame.pointRadius = radius + (pointRadius - radius) * value;
    frame.detailRadius = radius;
    frame.galaxy = value;
    frame.spiral = spiralValue;
    frame.beam = beamValue;
    frame.casesSpread = spreadValue;
    frame.spiralScale[0] = width * .62 / largeRadius;
    frame.spiralScale[1] = height * .9 / largeRadius;
    frame.rimVisibility = (1 - Math.min(1, Math.max(0, (value - .35) / .5))) * (1 - logoValue);
    frame.logo = logoValue;
    frame.logoCenter[0] = width * .5;
    frame.logoCenter[1] = height * .5;
    frame.logoWidth = logoWidth;
    const layer = layers.current.crystal;
    const publish = (key, next) => {
      if (published.current[key] === next) return;
      published.current[key] = next;
      layer.dataset[key] = next;
    };
    publish('logoProgress', logoValue.toFixed(4));
    publish('spiralProgress', spiralValue.toFixed(4));
    publish('beamProgress', beamValue.toFixed(4));
    publish('casesSpread', spreadValue.toFixed(4));
    if (published.current.background !== beamValue) {
      published.current.background = beamValue;
      layer.style.backgroundColor = `rgb(${6 * (1 - beamValue)}, ${11 * (1 - beamValue)}, ${16 * (1 - beamValue)})`;
    }
    // These inherited CSS values only drive the no-WebGL fallback. Writing
    // them during GPU motion needlessly invalidated styles across the stage.
    if (crystalElement.current?.dataset.fallback === 'true') {
      layer.style.setProperty('--orb-radius', `${frame.radius}px`);
      layer.style.setProperty('--orb-center-y', `${height - frame.center[1]}px`);
      layer.style.setProperty('--orb-rim', frame.rimVisibility);
      layer.style.setProperty('--beam-progress', beamValue);
    }
  };
  const stopFlight = () => {
    if (flight.current) {
      cancelAnimationFrame(flight.current.raf);
      flight.current.resolve();
      flight.current = null;
    }
  };
  const expandTo = (target, targetLogo = 0, duration = 1650, targetSpiral = 0, targetBeam = 0, targetSpread = 0) => {
    stopFlight();
    if (reduced.current) {
      applyFrame(target, targetLogo, targetSpiral, targetBeam, targetSpread);
      return Promise.resolve();
    }
    const start = expansion.current;
    const startLogo = logo.current;
    const startSpiral = spiral.current;
    const startBeam = beam.current;
    const startSpread = casesSpread.current;
    const started = performance.now();
    return new Promise(resolve => {
      const journey = { resolve, raf: 0 };
      flight.current = journey;
      const frame = now => {
        const t = Math.min(1, (now - started) / duration);
        const eased = t * t * t * (t * (t * 6 - 15) + 10);
        applyFrame(start + (target - start) * eased, startLogo + (targetLogo - startLogo) * eased,
          startSpiral + (targetSpiral - startSpiral) * eased,
          startBeam + (targetBeam - startBeam) * eased,
          startSpread + (targetSpread - startSpread) * eased);
        if (t < 1) journey.raf = requestAnimationFrame(frame);
        else { flight.current = null; resolve(); }
      };
      journey.raf = requestAnimationFrame(frame);
    });
  };
  useLayoutEffect(() => {
    const measure = () => {
      const rect = anchor.current.getBoundingClientRect();
      const width = layers.current.crystal.clientWidth;
      const height = layers.current.crystal.clientHeight;
      crystalElement.current = layers.current.crystal.querySelector('.crystalized-ball');
      bounds.current = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
        radius: rect.width / 2, width, height,
        largeRadius: Math.hypot(width, height) * .72,
        pointRadius: Math.max(width * .515, height * .59),
        logoWidth: Math.min(width * (width < 768 ? .9 : .82), height * 1.65) };
      applyFrame(expansion.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor.current);
    // WebGL availability is resolved after layout; initialize the CSS fallback
    // once if the renderer reports that it could not start.
    const fallbackObserver = new MutationObserver(() => {
      if (crystalElement.current?.dataset.fallback === 'true') applyFrame(expansion.current);
    });
    if (crystalElement.current) fallbackObserver.observe(crystalElement.current, { attributes: true, attributeFilter: ['data-fallback'] });
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); fallbackObserver.disconnect(); window.removeEventListener('resize', measure); stopFlight(); };
  }, []);
  useImperativeHandle(ref, () => ({
    show(id) {
      command.current++;
      stopFlight();
      currentPage.current = id;
      applyFrame(expandedPage(id) ? 1 : 0, gatheredPage(id) ? 1 : 0, spiralPage(id) ? 1 : 0,
        id === 'about' ? 1 : 0, id === 'student-cases' ? 1 : 0);
      layers.current.crystal.dataset.scene = id;
      Object.entries(layers.current).forEach(([name, layer]) => {
        if (!layer) return;
        layer.classList.toggle('is-current', name === worldFor(id));
        layer.classList.remove('is-entering');
      });
    },
    enter(id) {
      const request = ++command.current;
      stopFlight();
      const layer = layers.current[worldFor(id)];
      const from = currentPage.current;
      if (from === 'about' || id === 'about') {
        layer.dataset.scene = 'beam-journey';
        let release;
        // Let the outgoing content leave, then gather these same particles
        // into the laser before revealing the next chapter.
        return { layer: null, kind: 'about-beam', startDispersal() {
          if (request !== command.current) return Promise.resolve();
          release ||= expandTo(expandedPage(id) ? 1 : 0, gatheredPage(id) ? 1 : 0,
            2600, spiralPage(id) ? 1 : 0, id === 'about' ? 1 : 0);
          return release;
        } };
      }
      // Keep the same Logo field through the content exit. The student cases
      // release its outer particles only when their components start entering.
      if (logoPage(from) && logoPage(id)) return { layer: null };
      if ((logoPage(from) && id === 'activity') || (from === 'activity' && logoPage(id))) {
        layer.dataset.scene = 'galaxy-journey';
        let release;
        // Keep the current shape while content exits. The same population
        // then either releases into the activity galaxy or gathers back.
        return { layer: null, startDispersal() {
          if (request !== command.current) return Promise.resolve();
          release ||= expandTo(1, 1, 2400, id === 'activity' ? 1 : 0);
          return release;
        } };
      }
      if (worldFor(from) === 'crystal' && worldFor(id) === 'crystal') {
        layers.current.crystal.dataset.scene = 'journey';
        const hands = layer.querySelector('.home-crystal-hands');
        const logoJourney = logoPage(from) || logoPage(id);
        return { layer: null,
          finished: expandTo(id === 'home' ? 0 : 1, gatheredPage(id) ? 1 : 0,
            id === 'activity' || from === 'activity' ? 2400 : logoJourney ? 2800 : 1650,
            id === 'activity' ? 1 : 0),
          contentDelay: logoPage(id) ? 3100 : logoJourney ? 1300 : 0,
          reveal: id === 'home' ? hands : null, conceal: from === 'home' ? hands : null };
      }
      if (worldFor(id) === 'crystal') {
        applyFrame(expandedPage(id) ? 1 : 0, gatheredPage(id) ? 1 : 0, id === 'activity' ? 1 : 0);
        layer.dataset.scene = id;
      }
      layer.classList.add('is-entering');
      return { layer };
    },
    revealContent(id) {
      const target = id === 'student-cases' ? 1 : 0;
      if (Math.abs(casesSpread.current - target) < .001) return Promise.resolve();
      return expandTo(expansion.current, logo.current, target ? 1600 : 1000,
        spiral.current, beam.current, target);
    },
    stop() {
      command.current++;
      stopFlight();
      layers.current.crystal.dataset.scene = currentPage.current;
    }
  }), []);

  return (
    <div className="story-worlds" aria-hidden="true">
      <div ref={element => { layers.current.crystal = element; }} className="story-world-layer" data-world="crystal">
        <div ref={anchor} className="home-orb-anchor" />
        <div className="home-crystal-stage">
          <CrystalizedBall preset="plasma" color="#3F7BFF" size={0.76}
            crackle={0.85} fill={0.5} hoverStrength={0.7}
            framingRef={framing}
            interactive={!frozen && (activeId === 'home' || activeId === 'team')}
            logoFollowPointer={!frozen && activeId === 'projects'}
            casesScatterPointer={!frozen && activeId === 'student-cases'}
            paused={reducedMotion || !crystalVisible || (transitioning && !orbJourney)} intro={!reducedMotion} />
        </div>
        <HomeHands active={activeId === 'home' || destinationId === 'home'} transitioning={transitioning}
          paused={frozen || activeId !== 'home'} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
});

export default StoryWorlds;
