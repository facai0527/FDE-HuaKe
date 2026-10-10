const selectors = {
  projects: ['.projects-intro', '.projects-showcase', '.projects-footer'],
  'student-cases': ['.student-cases-page__intro', '.student-ticket-grid > li', '.student-cases-page__footer'],
  activity: ['.activity-intro', '.activity-accordion-wrap', '.activity-footer'],
  about: ['.about-teaser__identity', '.about-lanyard__viewport'],
};

const partsOf = section => {
  if (!selectors[section.id]) return { intro: section.firstElementChild, components: [], footer: null };
  const [intro, components, footer] = selectors[section.id];
  return { intro: section.querySelector(intro), components: [...section.querySelectorAll(components)],
    footer: section.querySelector(footer) };
};

// Project chapters replace only their content. When the background changes,
// finish its particle motion before starting the incoming text and components.
export function chapterContentTransition({ from, to, onEnter, onBackground }) {
  const animations = [];
  const originalOpacity = to.style.opacity;
  let canceled = false;
  const animate = (element, keyframes, options) => {
    if (!element) return Promise.resolve();
    const animation = element.animate(keyframes, {
      fill: 'both', easing: 'cubic-bezier(.22, 1, .36, 1)', ...options,
    });
    animations.push(animation);
    return animation.finished.catch(() => {});
  };

  const finished = (async () => {
    const outgoing = partsOf(from);
    await Promise.all([
      animate(outgoing.intro, [
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0, transform: 'translate3d(0, -36px, 0)' },
      ], { duration: 420 }),
      ...outgoing.components.map(component => animate(component, [
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        { opacity: 0, transform: 'translate3d(40px, 48px, 0) scale(.97)' },
      ], { duration: 540 })),
      animate(outgoing.footer, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 }),
      animate(from, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: 400 }),
    ]);
    if (canceled) return;
    if (onBackground) {
      await onBackground();
      if (canceled) return;
    }

    to.style.opacity = '1';
    const contentBackground = onEnter();
    const incoming = partsOf(to);
    await Promise.all([
      contentBackground,
      animate(incoming.intro, [
        { opacity: 0, transform: 'translate3d(0, 24px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 560 }),
      ...incoming.components.map((component, index) => animate(component, [
        { opacity: 0, transform: `translate3d(${index % 2 ? 28 : -28}px, 60px, 0) scale(.96)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ], { duration: 740, delay: 90 + index * 90 })),
      animate(incoming.footer, [
        { opacity: 0, transform: 'translate3d(0, 14px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 480, delay: 280 }),
    ]);
  })();

  return {
    finished,
    cancel() {
      canceled = true;
      animations.forEach(animation => animation.cancel());
      to.style.opacity = originalOpacity;
    },
  };
}
