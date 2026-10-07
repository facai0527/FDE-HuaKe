# FDE Team — design system

## Product context

FDE is a team site for a team connected to 华科未来. The site tells one continuous story across five pages: home, activity venue, projects, student cases, and about. The homepage remains open for a later visual reference. This design system currently defines the confirmed visual language and page behavior for projects and student cases.

## Brand

- Team name: FDE 团队
- Use the supplied FDE / 华科未来 logo asset exactly wherever a logo position exists. Do not replace it with initials, emoji, generic marks, or an invented SVG.
- Preserve the identity of each featured project cover while keeping the surrounding FDE shell consistent.

## Visual direction

Primary style source: Superdesign's **Cinematic Style**. Adapt it for FDE as a dark editorial interface: deep black shell, oversized high-contrast Chinese typography, restrained glass borders, spatial depth, and project imagery that moves from monochrome framing into its native color. Warm amber belongs to the supplied project covers and activity imagery; the surrounding FDE chrome remains dark and controlled. The supplied blue logo is the identity accent.

## Color tokens

- ink: #050505
- panel: #111111
- panel-soft: #171717
- line: rgba(255,255,255,.14)
- text-primary: #FFFFFF
- text-secondary: #999999
- amber: #C7894B
- amber-light: #E4B879
- electric-blue: #1479E8
- cyan: #06B6D4
- violet: #7C3AED
- white: #FFFFFF

## Type

- Chinese display: a high-contrast Song/Ming style serif when available, with oversized editorial scale.
- Chinese body: a neutral sans-serif with clear screen rendering.
- Latin/UI metadata: a restrained grotesk or system sans; use monospace only for indexes, dates, and counters.
- Keep display headings short. Do not add invented project claims or metrics.

## Layout

- Desktop uses a 12-column editorial grid with generous outer margins.
- Mobile collapses to one column with 20–24px side padding.
- Use full-bleed media for hero/project covers and thin translucent borders for supporting content.
- Keep navigation, page index, and progress counters small and persistent.

## Confirmed page 3 — projects

- Four projects: 01 祈年殿, 02 山间一盏, 03 小红书自动发布工具 (screenshot only), 04 video project.
- Use the supplied 祈年殿 and 山间一盏 images as card covers.
- Use the supplied dashboard screenshot for project 03.
- Use a poster frame for project 04 and reveal the MP4 on selection.
- Use a four-card BounceCards-inspired stack as the visual index. Each card needs a real title, type, and accessible link or play action outside the image layer.

## Confirmed page 4 — student cases

Display exactly five cases in this order:

1. 范艳芳 · 途途 Travel
2. 付总 · 比亚迪高端品牌矩阵 2026 新品发布会
3. 李政诚 · 启程 · 学生求职工作台
4. 刘元和 · AI 视频创作台
5. 朱莉 · 留学规划顾问

Use the supplied five screenshots in this same order. The sixth case, 小冯 · NEXUS 企业执行操作系统, is excluded from the current site.

- Use a FlexCarousel-inspired center-focused case navigator.
- The focused card shows name, work title, type, one-sentence summary, and a link action.
- A readable detail panel or section must remain available without animation.
- Show a 01/05 counter and a visible progress indicator.

## Transitions and motion

- Page 2 → page 3 enters horizontally from the right when the user scrolls down or swipes right.
- Page 3 → page 4 enters horizontally from the left when the user scrolls down or swipes left.
- Page 4 → page 5 rises upward when the user scrolls down; the same transition remains reachable through the normal vertical wheel path.
- Vertical wheel input must always have a natural fallback path; do not trap the page in a canvas.
- Use GSAP timelines for staged entrances and ScrollTrigger for pinned horizontal sections, scrubbed media movement, and progress indicators.
- Use transform and autoAlpha properties; avoid layout animation.
- Use useGSAP with a scoped root in React and revert all contexts on unmount.
- Use matchMedia for desktop/mobile and prefers-reduced-motion. On reduced motion, show the focused card and content directly without pinning or scrub.
- Call ScrollTrigger.refresh after media and fonts settle.

## Accessibility and content rules

- Every project card and case card has a semantic focus target, visible focus ring, and keyboard activation.
- Captions and case text remain readable if all animation is disabled.
- Do not invent student metrics, project URLs, or names. Keep user-supplied names and links unchanged.
- Treat the supplied images as final content assets and the supplied logo as a durable brand asset.

## Confirmed page 5 — about

- Explain FDE's relationship to 华科未来 with a concise team statement, working principles, and a small milestone or capability strip.
- Keep the page calmer than the projects and student pages so the final call to action has room to breathe.
- Use the supplied logo in the page header or identity block.
- The primary external CTA must be a semantic link styled as a button:
  - Label: 访问华科未来官网
  - URL: https://huakefuture.com/
  - Open in a new tab with a visible focus state.
- Do not invent additional company metrics or claims. Any wording borrowed from the official site must be confirmed against the final copy supplied by the user.

## Open inputs

- Homepage visual reference and copy.
- Final video poster or permission to derive one from the MP4.
- Any missing student screenshot or link confirmation.

## Confirmed page 1 — homepage

- The homepage uses a pure white canvas. The only photographic visual is the transparent human-hand / robotic-hand interaction cutout at `homepage/fde-hand-robot-interaction.png`, centered in the stage with no scenery, architectural background, or colored image backdrop.
- Reference the structure of `dayinji/sen-3d-resume`: keep the visual subject in a fixed scene layer while HTML copy, page index, and section prompts scroll above it. The FDE identity remains editorial and sparse, with black, graphite, and pale gray typography.
- Use the supplied FDE / 华科未来 logo in the navigation and do not replace it with text-only initials.
- Keep `FDE` as the primary hero lettering without inventing an official expansion for the letters. The FDE label and short supporting copy sit over the robot's chest area so the robot remains the visual anchor.
- The main navigation follows the supplied JellyRadio prompt: a dark pill group with a white active chip, five destinations, keyboard/focus affordances, and a restrained spring-like hover treatment.
- The blue right-side copy panel is removed. The Huake Future location label moves into the upper-right metadata stack above the page counter.
- The first viewport should clearly route to activities, projects, student cases, and about. Keep a restrained page index and a visible scroll cue.

## Homepage motion handoff

- Use a GSAP timeline for the initial logo / FDE reveal and ScrollTrigger for the fixed-scene handoff.
- On desktop, pin the hand-interaction stage while the first scroll shifts the camera-like crop very slightly, moves the FDE lettering and copy out of the way, and reveals the activity section. The fingertips remain centered and legible throughout.
- Do not add a dark scrim, neon gradient, circuit-board texture, or scenic image background. A very soft CSS shadow or hairline rule is allowed to separate the cutout from the white canvas.
- Mobile uses a shorter pinned distance and lets the robot scale down to preserve the full bust. `prefers-reduced-motion` shows the centered cutout and all readable copy immediately without scrubbing.
