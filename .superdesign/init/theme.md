# Theme

White #ffffff canvas; primary ink #0f172a / #111827; body slate #64748b; metadata #8290a2; blue #2563eb. Noto Serif SC for display, Noto Sans SC for body, Space Grotesk for metadata. Desktop side gutters 7vw, mobile 5vw; fixed navigation 94px / 76px. Large headings 40–92px; body 13–16px; meta 10px. Rounded gallery 14–18px; capsule navigation 999px. No Tailwind configuration; plain CSS. Breakpoints 767px and 1000px.

## src/styles.css

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap');

:root {
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  color: #171717;
  background: #fff;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: #fff; }
a { color: inherit; text-decoration: none; }
button, a { -webkit-tap-highlight-color: transparent; }

.site-shell { overflow: clip; background: #fff; }
html, body { overscroll-behavior-y: none; }
.hero-kicker, .section-kicker { color: #8290a2; font-family: 'Space Grotesk','Noto Sans SC',sans-serif; font-size: 10px; letter-spacing: .26em; text-transform: uppercase; }

.about-teaser { display: grid; min-height: 72vh; place-items: center; border-top: 1px solid rgba(23,23,23,.12); padding: 12vw 7vw; background: #f8fafc; text-align: center; }
.about-teaser__identity { display: flex; max-width: 720px; flex-direction: column; align-items: center; }
.about-teaser__logo { width: 108px; height: 62px; margin: 24px 0 14px; object-fit: contain; }
.about-teaser h2 { max-width: 680px; margin: 0; color: #111827; font-family: 'Noto Serif SC', serif; font-size: clamp(2.2rem, 5vw, 5rem); font-weight: 500; line-height: 1.08; letter-spacing: -.06em; }
.about-teaser__link { display: inline-flex; gap: 14px; align-items: center; margin-top: 28px; border-bottom: 1px solid rgba(37,99,235,.36); padding-bottom: 8px; color: #1d4ed8; font-family: 'Space Grotesk','Noto Sans SC',sans-serif; font-size: 12px; letter-spacing: .12em; }
.about-teaser__link span { font-size: 17px; }
.projects-section, .cases-section { border-top: 1px solid rgba(23,23,23,.12); padding: 12vw 7vw 10vw; background: #f8fafc; }
.cases-section { background: #fff; }
.section-heading { display: grid; grid-template-columns: 1fr 1.3fr .75fr; align-items: end; gap: 5vw; margin-bottom: 5vw; }
.section-heading h2 { margin: 0; color: #111827; font-family: 'Noto Serif SC',serif; font-size: clamp(2.5rem,5vw,5.4rem); font-weight: 500; line-height: 1.05; letter-spacing: -.06em; }
.section-heading > p:last-child { margin: 0 0 5px; color: #64748b; font-size: 14px; line-height: 1.9; }
.project-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
.project-card { position: relative; min-height: 260px; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; border: 1px solid rgba(15,23,42,.1); border-radius: 18px; background: #fff; transition: transform .3s ease, box-shadow .3s ease; }
.project-card:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(15,23,42,.1); }
.project-card--wide { grid-row: span 2; min-height: 534px; background: linear-gradient(145deg,#eff8fc,#d7edf6); }
.project-card--blue { background: #b9e5f5; }.project-card--dark { color: #f8fafc; background: #0d2b3b; }.project-card span, .case-card > span { font: 600 10px 'Space Grotesk',sans-serif; letter-spacing: .18em; text-transform: uppercase; opacity: .7; }
.project-card h3 { max-width: 500px; margin: 15px 0 0; font: 500 clamp(1.7rem,3vw,3.2rem)/1.1 'Noto Serif SC',serif; letter-spacing: -.04em; }.project-card p { max-width: 360px; margin: 14px 0 0; line-height: 1.8; opacity: .72; }.project-card b { align-self: flex-end; font-size: 28px; font-weight: 400; }.project-card video { width: 100%; max-height: 180px; margin-top: 16px; border-radius: 10px; object-fit: cover; }
.project-carousel { position: relative; height: 470px; margin-top: 14px; overflow: hidden; border: 1px solid rgba(15,23,42,.1); border-radius: 20px; background: linear-gradient(145deg,#e6f5fa,#bbdfea); color: #102a3b; }.project-carousel > .flex-carousel { height: 100%; padding-top: 34px; }.project-carousel .activity-bit__label { z-index: 3; }
.cases-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 12px; }.case-card { min-height: 330px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px; border: 1px solid rgba(15,23,42,.1); border-radius: 16px; background: #f8fafc; }.case-card img { width: calc(100% + 44px); height: 112px; margin: -22px -22px 16px; border-radius: 15px 15px 0 0; object-fit: cover; }.case-card small { color: #64748b; font-size: 12px; }.case-card h3 { margin: 10px 0; font: 600 1.45rem/1.25 'Noto Serif SC',serif; }.case-card p { color: #64748b; font-size: 13px; line-height: 1.7; }.case-card a { color: #1d4ed8; font-size: 12px; letter-spacing: .08em; }.about-teaser__body { max-width: 500px; margin: 20px 0 0; color: #64748b; line-height: 1.8; }
.about-bounce { position: relative; width: min(100%, 680px); min-height: 340px; margin-top: 42px; }.about-bounce__label { margin-bottom: 10px; color: #8290a2; font: 600 10px 'Space Grotesk','Noto Sans SC',sans-serif; letter-spacing: .16em; }.about-bounce .bounceCardsContainer { margin: 0 auto; }.about-bounce .bounceCardsContainer .card { border-color: rgba(255,255,255,.92); border-radius: 17px; box-shadow: 0 14px 28px rgba(15,23,42,.15); }


@media (max-width: 767px) {
  .about-bounce { min-height: 270px; margin-top: 34px; transform: scale(.7); transform-origin: top center; }
  .about-teaser { min-height: 76vh; padding: 24vw 5vw 18vw; }
  .section-heading { display: block; margin-bottom: 12vw; }
  .section-heading h2 { margin-top: 24px; font-size: clamp(2.5rem,12vw,4.6rem); }
  .section-heading > p:last-child { margin-top: 26px; }
  .projects-section, .cases-section { padding: 110px 5vw 16vw; }
  .project-list, .cases-grid { display: block; }
  .project-card, .project-card--wide { min-height: 300px; margin-top: 14px; }
  .case-card { min-height: 260px; margin-top: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}

```
