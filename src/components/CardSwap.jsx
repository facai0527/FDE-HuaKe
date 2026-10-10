import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';
import './CardSwap.css';

export const Card = forwardRef(({ customClass, className = '', ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    className={`card-swap-card ${customClass ?? ''} ${className}`.trim()}
  />
));
Card.displayName = 'Card';

const makeSlot = (position, distance, verticalDistance, total) => ({
  x: position * distance,
  y: -position * verticalDistance,
  z: -position * distance * 1.5,
  zIndex: total - position,
});

const CardSwap = forwardRef(function CardSwap(
  {
    width = 500,
    height = 400,
    cardDistance = 60,
    verticalDistance = 70,
    delay = 5000,
    pauseOnHover = true,
    active = true,
    paused = false,
    reducedMotion = false,
    onCardClick,
    onActiveChange,
    skewAmount = 6,
    easing = 'elastic',
    className = '',
    style,
    children,
    ...props
  },
  forwardedRef,
) {
  const cards = Children.toArray(children).filter(isValidElement);
  const total = cards.length;
  const cardRefs = useMemo(() => Array.from({ length: total }, () => React.createRef()), [total]);
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const syncRef = useRef(null);
  const orderRef = useRef([]);
  const settingsRef = useRef({});
  const [frontIndex, setFrontIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);
  settingsRef.current = { active, paused, reducedMotion, pauseOnHover, delay, onActiveChange };

  useImperativeHandle(forwardedRef, () => ({
    next: () => apiRef.current?.next() ?? false,
    previous: () => apiRef.current?.previous() ?? false,
    goTo: index => apiRef.current?.goTo(index) ?? false,
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !total) return undefined;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true;
    let hovered = false;
    let focused = container.contains(document.activeElement) && Boolean(document.activeElement?.closest('[data-card-pause]'));
    let timeline = null;
    let schedule = null;
    let hoverSchedule = null;
    let hoverHeader = null;
    let pointerPosition = null;
    let selectionPosition = null;
    let hoverLocked = false;
    let targetOrder = null;
    let pendingTarget = null;
    const config = easing === 'elastic'
      ? { ease: 'elastic.out(0.6,0.9)', drop: 1.15, move: 1.25, back: 1.3, overlap: 0.78 }
      : { ease: 'power2.inOut', drop: 0.6, move: 0.65, back: 0.7, overlap: 0.45 };

    const reduced = () => settingsRef.current.reducedMotion || media.matches;
    const available = () => alive && settingsRef.current.active && !document.hidden;
    const runnable = () => available() && !settingsRef.current.paused && !reduced() && !focused && !(settingsRef.current.pauseOnHover && hovered);
    const slot = position => makeSlot(position, cardDistance, verticalDistance, total);
    const place = order => order.forEach((index, position) => {
      gsap.set(cardRefs[index].current, {
        ...slot(position),
        xPercent: -50,
        yPercent: -50,
        skewY: skewAmount,
        transformOrigin: 'center center',
        force3D: true,
      });
    });

    // Preserve the visible project when responsive layout values change.
    const oldFront = orderRef.current[0] ?? 0;
    const initialFront = oldFront < total ? oldFront : 0;
    orderRef.current = Array.from({ length: total }, (_, i) => (initialFront + i) % total);
    place(orderRef.current);
    setFrontIndex(initialFront);
    setSwapping(false);

    const cancelSchedule = () => {
      schedule?.kill();
      schedule = null;
    };

    const cancelHover = () => {
      hoverSchedule?.kill();
      hoverSchedule = null;
    };

    const setBodyAccess = (front, moving = false) => {
      cardRefs.forEach((ref, index) => {
        const interactive = available() && index === front && !moving;
        if (ref.current) ref.current.dataset.interactive = String(interactive);
        ref.current?.querySelectorAll('[data-card-body]').forEach(body => {
          body.inert = !interactive;
          body.setAttribute('aria-hidden', String(!interactive));
        });
      });
    };

    const refreshPointerRegion = () => {
      const target = pointerPosition
        ? document.elementFromPoint(pointerPosition.x, pointerPosition.y)
        : null;
      hovered = Boolean(target && container.contains(target) && target.closest('[data-card-pause]'));
      return target && container.contains(target) ? target : null;
    };

    const planNext = () => {
      cancelSchedule();
      const wait = Number(settingsRef.current.delay);
      if (!runnable() || total < 2 || !Number.isFinite(wait) || wait <= 0 || timeline) return;
      schedule = gsap.delayedCall(Math.max(0.25, wait / 1000), () => {
        schedule = null;
        if (runnable()) moveTo((orderRef.current[0] + 1) % total, false);
      });
    };

    const finish = () => {
      if (!alive || !targetOrder) return;
      orderRef.current = targetOrder;
      targetOrder = null;
      timeline = null;
      place(orderRef.current);
      setFrontIndex(orderRef.current[0]);
      setSwapping(false);
      setBodyAccess(orderRef.current[0]);
      // The cards moved under a stationary cursor. Only its next deliberate
      // movement can select another strip, avoiding cascading hover swaps.
      refreshPointerRegion();
      settingsRef.current.onActiveChange?.(orderRef.current[0]);
      const requested = pendingTarget;
      pendingTarget = null;
      if (requested !== null && requested !== orderRef.current[0] && available()) {
        moveTo(requested, true);
      } else {
        sync();
      }
    };

    const moveTo = (requested, manual = true) => {
      if (!available() || total < 2 || !Number.isFinite(requested)) return false;
      if (!manual && settingsRef.current.paused) return false;
      const index = ((Math.trunc(requested) % total) + total) % total;
      // Pausing automatic rotation never disables explicit project selection.
      // Finish manual changes immediately while paused, including a request
      // that replaces an already paused in-flight swap.
      if (manual && settingsRef.current.paused && timeline) {
        timeline.kill();
        timeline = null;
        targetOrder = null;
        pendingTarget = null;
        place(orderRef.current);
        setSwapping(false);
      }
      if (timeline) {
        if (manual) pendingTarget = index;
        return false;
      }
      if (index === orderRef.current[0]) return false;
      cancelSchedule();
      cancelHover();
      hoverLocked = true;
      selectionPosition = pointerPosition;
      const currentOrder = orderRef.current;
      const targetPosition = currentOrder.indexOf(index);
      targetOrder = [...currentOrder.slice(targetPosition), ...currentOrder.slice(0, targetPosition)];
      if (reduced() || (manual && settingsRef.current.paused)) {
        finish();
        return true;
      }
      setSwapping(true);
      setBodyAccess(orderRef.current[0], true);
      const oldFront = currentOrder[0];
      const front = cardRefs[oldFront].current;
      const dropDistance = Math.max(380, container.getBoundingClientRect().height * 1.12);
      const promoteAt = config.drop * (1 - config.overlap);
      const frontSlot = slot(targetOrder.indexOf(oldFront));
      timeline = gsap.timeline({ onComplete: finish });
      timeline.to(front, { y: dropDistance, duration: config.drop, ease: config.ease });
      targetOrder.forEach((cardIndex, position) => {
        if (cardIndex === oldFront) return;
        const nextSlot = slot(position);
        timeline.set(cardRefs[cardIndex].current, { zIndex: nextSlot.zIndex }, promoteAt);
        timeline.to(cardRefs[cardIndex].current, {
          x: nextSlot.x,
          y: nextSlot.y,
          z: nextSlot.z,
          duration: config.move,
          ease: config.ease,
        }, promoteAt + position * 0.055);
      });
      timeline.set(front, { zIndex: frontSlot.zIndex }, config.drop);
      timeline.to(front, {
        x: frontSlot.x,
        y: frontSlot.y,
        z: frontSlot.z,
        duration: config.back,
        ease: config.ease,
      }, config.drop);
      return true;
    };

    const sync = () => {
      if (!alive) return;
      setBodyAccess(orderRef.current[0], Boolean(timeline));
      // Restoring inert/pointer access can reveal media under a stationary
      // pointer without a matching pointerover event from the browser.
      if (!timeline) refreshPointerRegion();
      if (!available()) cancelHover();
      if ((reduced() || settingsRef.current.paused) && timeline) {
        timeline.kill();
        timeline = null;
        finish();
        return;
      }
      const canRun = runnable();
      container.dataset.paused = String(!canRun);
      if (canRun) {
        if (timeline) timeline.resume();
        else if (!schedule) planNext();
        else schedule.resume();
      } else {
        schedule?.pause();
        // Hover and focus pause the next rotation, never freeze a card in
        // mid-flight. Inactive/hidden pages still suspend all animation.
        if (available()) timeline?.resume();
        else timeline?.pause();
      }
    };

    const regionAt = target => target instanceof Element && container.contains(target) ? target : null;
    const selectHeader = header => {
      const index = Number(header?.dataset.cardSelect);
      if (header && Number.isFinite(index)) moveTo(index, true);
    };
    const planHover = header => {
      cancelHover();
      if (!header || timeline || hoverLocked || !available() || Number(header.dataset.cardSelect) === orderRef.current[0]) return;
      hoverSchedule = gsap.delayedCall(0.18, () => {
        hoverSchedule = null;
        if (hoverHeader === header && !timeline && !hoverLocked && available()) selectHeader(header);
      });
    };
    const pointerOver = event => {
      if (event.pointerType === 'touch') return;
      pointerPosition = { x: event.clientX, y: event.clientY };
      const target = regionAt(event.target);
      hovered = Boolean(target?.closest('[data-card-pause]'));
      const header = target?.closest('[data-card-select]') ?? null;
      if (header !== hoverHeader) {
        hoverHeader = header;
        planHover(header);
      }
      sync();
    };
    const pointerMove = event => {
      if (event.pointerType === 'touch') return;
      pointerPosition = { x: event.clientX, y: event.clientY };
      const target = refreshPointerRegion();
      sync();
      if (timeline) return;
      if (hoverLocked && (!selectionPosition || Math.hypot(event.clientX - selectionPosition.x, event.clientY - selectionPosition.y) > 5)) {
        hoverLocked = false;
        hoverHeader = target?.closest('[data-card-select]') ?? null;
        planHover(hoverHeader);
      }
    };
    const pointerDown = event => {
      if (event.pointerType === 'touch') return;
      pointerPosition = { x: event.clientX, y: event.clientY };
      sync();
    };
    const pointerOut = event => {
      const target = regionAt(event.relatedTarget);
      hovered = Boolean(target?.closest('[data-card-pause]'));
      if (!target || !target.closest('[data-card-select]')) {
        hoverHeader = null;
        cancelHover();
      }
      sync();
    };
    const pointerLeave = () => {
      hovered = false;
      hoverHeader = null;
      pointerPosition = null;
      hoverLocked = false;
      cancelHover();
      sync();
    };
    const click = event => {
      const header = regionAt(event.target)?.closest('[data-card-select]');
      if (header) selectHeader(header);
    };
    const focusIn = event => { focused = Boolean(regionAt(event.target)?.closest('[data-card-pause]')); sync(); };
    const focusOut = event => {
      focused = Boolean(regionAt(event.relatedTarget)?.closest('[data-card-pause]'));
      sync();
    };
    container.addEventListener('pointerover', pointerOver);
    container.addEventListener('pointerout', pointerOut);
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('pointerdown', pointerDown);
    container.addEventListener('pointerleave', pointerLeave);
    container.addEventListener('click', click);
    container.addEventListener('focusin', focusIn);
    container.addEventListener('focusout', focusOut);
    document.addEventListener('visibilitychange', sync);
    media.addEventListener('change', sync);
    apiRef.current = {
      next: () => moveTo(((pendingTarget ?? targetOrder?.[0] ?? orderRef.current[0]) + 1) % total),
      previous: () => moveTo(((pendingTarget ?? targetOrder?.[0] ?? orderRef.current[0]) - 1 + total) % total),
      goTo: index => moveTo(index),
    };
    syncRef.current = () => { cancelSchedule(); sync(); };
    sync();

    return () => {
      alive = false;
      timeline?.kill();
      cancelSchedule();
      cancelHover();
      apiRef.current = null;
      syncRef.current = null;
      container.removeEventListener('pointerover', pointerOver);
      container.removeEventListener('pointerout', pointerOut);
      container.removeEventListener('pointermove', pointerMove);
      container.removeEventListener('pointerdown', pointerDown);
      container.removeEventListener('pointerleave', pointerLeave);
      container.removeEventListener('click', click);
      container.removeEventListener('focusin', focusIn);
      container.removeEventListener('focusout', focusOut);
      document.removeEventListener('visibilitychange', sync);
      media.removeEventListener('change', sync);
    };
  }, [cardRefs, total, cardDistance, verticalDistance, skewAmount, easing]);

  useEffect(() => {
    syncRef.current?.();
  }, [active, paused, reducedMotion, pauseOnHover, delay]);

  return (
    <div
      {...props}
      ref={containerRef}
      className={`card-swap-container ${className}`.trim()}
      data-active-index={frontIndex}
      data-swapping={swapping}
      data-paused={!active || paused || reducedMotion}
      style={{ width, height, ...style }}
    >
      {cards.map((child, index) => {
        const isFront = index === frontIndex;
        const interactive = active && isFront && !swapping;
        return cloneElement(child, {
          ref: cardRefs[index],
          inert: active ? undefined : '',
          'data-front': isFront,
          'data-interactive': interactive,
          style: { width: '100%', height: '100%', ...child.props.style },
          onClick: event => {
            if (!interactive) return;
            child.props.onClick?.(event);
            onCardClick?.(index);
          },
        });
      })}
    </div>
  );
});

export default CardSwap;
