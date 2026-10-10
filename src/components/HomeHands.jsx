import { useEffect, useRef } from 'react';

// Both crops are from the supplied reference; the photo shading stays visible
// through the dot mask so the fingers, nails and mechanical joints read clearly.
const HANDS = [
  { side: 'human', source: '/assets/story-worlds/human-hand.webp' },
  { side: 'robot', source: '/assets/story-worlds/robot-hand.webp' },
];

export default function HomeHands({ active = true, paused = false, reducedMotion = false, transitioning = false }) {
  const root = useRef(null);
  const settings = useRef(null);
  const syncRef = useRef(null);
  settings.current = { active, paused, reducedMotion, transitioning };

  useEffect(() => {
    const element = root.current;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const entranceLayers = Array.from(element.querySelectorAll('.home-crystal-hand__entrance'));
    let frame = 0;
    let disposed = false;
    let entrance = 'waiting';
    let entranceVersion = 0;
    let entranceAnimations = [];
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    const prefersStill = () => settings.current.reducedMotion || motionPreference.matches;
    const canMove = () => !disposed && settings.current.active && !settings.current.paused &&
      !settings.current.transitioning && !prefersStill() && !document.hidden;
    const canFollowPointer = () => canMove() && entrance === 'entered';
    const setEntrance = phase => {
      entrance = phase;
      element.dataset.entrance = phase;
    };
    const stopEntrance = () => {
      entranceVersion += 1;
      entranceAnimations.forEach(animation => animation.cancel());
      entranceAnimations = [];
    };
    const finishEntrance = () => {
      setEntrance('entered');
      stopEntrance();
    };
    const startEntrance = () => {
      if (!entranceLayers.every(layer => typeof layer.animate === 'function')) {
        finishEntrance();
        return;
      }
      setEntrance('entering');
      const version = ++entranceVersion;
      entranceAnimations = entranceLayers.map((layer, index) => layer.animate([
        { opacity: 0, transform: `translate3d(${index === 0 ? '-85%' : '85%'}, 6px, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], {
        duration: 1120,
        delay: index * 130,
        easing: 'cubic-bezier(.2, .75, .15, 1)',
        fill: 'both'
      }));
      Promise.all(entranceAnimations.map(animation => animation.finished)).then(() => {
        if (!disposed && version === entranceVersion) finishEntrance();
      }).catch(() => { /* Leaving the page cancels a pending entrance. */ });
    };
    const resetLook = () => {
      x = y = targetX = targetY = 0;
      element.style.removeProperty('--hand-look-x');
      element.style.removeProperty('--hand-look-y');
    };
    const render = () => {
      frame = 0;
      if (!canFollowPointer()) return;
      x += (targetX - x) * 0.075;
      y += (targetY - y) * 0.075;
      element.style.setProperty('--hand-look-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--hand-look-y', `${y.toFixed(2)}px`);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.05) frame = requestAnimationFrame(render);
    };
    const wake = () => {
      if (!frame && canFollowPointer() && Math.abs(targetX - x) + Math.abs(targetY - y) > 0.05) {
        frame = requestAnimationFrame(render);
      }
    };
    const reset = () => { targetX = 0; targetY = 0; wake(); };
    const move = event => {
      if (event.pointerType === 'touch' || !canFollowPointer()) return;
      targetX = (event.clientX / innerWidth - 0.5) * 18;
      targetY = (event.clientY / innerHeight - 0.5) * 12;
      wake();
    };
    const sync = () => {
      const moving = canMove();
      element.dataset.paused = String(!moving);
      if (!settings.current.active) {
        stopEntrance();
        setEntrance('waiting');
        resetLook();
      } else if (prefersStill()) {
        finishEntrance();
        resetLook();
      } else if (entrance === 'waiting' && moving) {
        // The page becomes active after PixelSwap finishes; entrance never runs
        // behind its mask or restarts when a running transition is paused.
        startEntrance();
      }
      entranceAnimations.forEach(animation => moving ? animation.play() : animation.pause());
      if (!moving) { cancelAnimationFrame(frame); frame = 0; }
      else wake();
    };
    syncRef.current = sync;
    sync();
    document.addEventListener('visibilitychange', sync);
    motionPreference.addEventListener('change', sync);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      stopEntrance();
      syncRef.current = null;
      document.removeEventListener('visibilitychange', sync);
      motionPreference.removeEventListener('change', sync);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      resetLook();
    };
  }, []);

  useEffect(() => { syncRef.current?.(); }, [active, paused, reducedMotion, transitioning]);

  return (
    <div ref={root} className="home-crystal-hands" data-paused="true" data-entrance="waiting">
      {HANDS.map(({ side, source }) => (
        <div key={side} className={`home-crystal-hand home-crystal-hand--${side}`}>
          <div className="home-crystal-hand__entrance"><div className="home-crystal-hand__motion">
            <img className="home-crystal-hand__detail" src={source} alt="" width="1086" height="724" draggable={false} />
            <img className="home-crystal-hand__dots" src={source} alt="" width="1086" height="724" draggable={false} />
            <span className="home-crystal-hand__contact" />
          </div></div>
        </div>
      ))}
    </div>
  );
}
