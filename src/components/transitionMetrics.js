// Opt-in development diagnostics. No observer or animation loop runs in the
// normal preview or production build; measurements stay in this local page.
export function observeTransitionFrames(root) {
  let raf = 0;
  let previous = 0;
  let sample = null;
  const reports = [];
  const finish = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!sample) return;
    const times = sample.times.sort((a, b) => a - b);
    if (times.length) {
      reports.push({ from: sample.from, to: root.dataset.storyPage, frames: times.length,
        meanMs: +(times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1),
        p95Ms: +times[Math.min(times.length - 1, Math.floor(times.length * .95))].toFixed(1),
        over50Ms: times.filter(value => value > 50).length });
      root.dataset.frameReports = JSON.stringify(reports.slice(-12));
    }
    sample = null;
  };
  const frame = now => {
    if (!sample || document.hidden) return;
    if (previous) sample.times.push(now - previous);
    previous = now;
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    if (!root.classList.contains('is-story-traveling')) { finish(); return; }
    if (sample || document.hidden) return;
    sample = { from: root.dataset.storyPage, times: [] };
    previous = 0;
    raf = requestAnimationFrame(frame);
  };
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); sample = null; } else sync(); };
  document.addEventListener('visibilitychange', visibility);
  sync();
  return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); cancelAnimationFrame(raf); };
}
