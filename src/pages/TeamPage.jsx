import ChapterText from '../components/ChapterText';
import ShinyText from '../components/ShinyText';
import StrokeText from '../components/StrokeText';
import { useStory } from '../components/StoryContext';
import { useState } from 'react';
import './TeamPage.css';

const principles = [
  { label: '知识与学习', english: 'LEARN', title: '让理解有路可循。', body: '把知识讲清楚，在提问、分享与反馈中找到适合自己的学习路径，让每个人逐步形成自己的判断。' },
  { label: '技术与工具', english: 'EXPLORE', title: '让工具更容易上手。', body: '降低技术使用的门槛，理解工具的用途与边界，让不同背景的人都能动手解决身边的问题。' },
  { label: '创造', english: 'CREATE', title: '让想法有机会成为作品。', body: '借助 AI 探索创作的更多可能，让个人与小团队也能制作原型、验证想法，积累自己的实践成果。' },
  { label: '表达', english: 'EXPRESS', title: '让更多声音被听见。', body: '用语言、文字、视觉与声音打开交流的空间，让表达更容易，也珍惜每个人独立的声音与判断。' },
  { label: '参与与机会', english: 'CONNECT', title: '让不同起点的人有机会同行。', body: '让不同背景的人都能参与讨论与实践，让作品和贡献得到认真回应，在共同探索中找到自己的位置。' },
];

export default function TeamPage() {
  const [selectedPrinciple, setSelectedPrinciple] = useState(0);
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  const textActive = activeId === 'team' || enteringId === 'team';
  const textPaused = !textActive || (isTraveling && enteringId !== 'team');
  const selected = principles[selectedPrinciple];
  const titleEffect = {
    material: 'liquid-metal', smoothMetal: true, bevel: false,
    strokeColor: '#C4D7E8', fillColor: '#F8FAFC', strokeWidth: 0.65,
    drawDuration: 1.4, fillDelay: 0.3, stagger: 0.05,
    trigger: 'mount', fillMode: 'wipe', fontSize: 124, fontWeight: 700,
    letterSpacing: -4, active: textActive, paused: textPaused, reducedMotion,
  };
  const shineEffect = {
    color: '#a1a1aa', shineColor: '#ffffff', speed: 1.8, delay: 0.25,
    shineWidth: 55, softness: 0.45, angle: 110, direction: 'right',
    easing: 'linear', trigger: 'loop', paused: textPaused || reducedMotion,
  };
  return (
    <section className="team-page" id="team" aria-labelledby="team-title">
      <div className="team-page__scroll" data-story-scroll tabIndex={0} role="region" aria-label="共学理念与五个实践方向">
        <div className="team-page__layout">
          <div className="team-intro">
            <div className="team-intro__hero">
              <h2 id="team-title">
                <span className="team-intro__headline"><StrokeText {...titleEffect} text="以共学，致未来。" /></span>
              </h2>
              <p className="team-intro__english"><ShinyText {...shineEffect} text="Together We Grow. Further We Go." /></p>
            </div>
            <div className="team-intro__copy">
              <p className="team-intro__eyebrow"><ShinyText {...shineEffect} text="我们的理念 / OUR PHILOSOPHY" /></p>
              <p className="team-intro__lead"><ChapterText chapter="team" effect="split" delay={0.2} text="让技术的可能，" /><br /><ChapterText chapter="team" effect="split" delay={0.3} text="成为更多人的可能。" /></p>
              <p className="team-intro__body">我们相信，技术的进步应当让更多人拥有学习、创造与参与的机会。从共同提问到动手实践，让不同起点的人，都有机会开始。</p>
              <p className="team-intro__belief"><ShinyText {...shineEffect} color="#d4d4d8" text="共学是方式，平权是方向。" /></p>
            </div>
          </div>
          <div className="team-principles-panel">
            <ol className="team-principles" aria-label="理念的五个方向">
              {principles.map((principle, index) => (
                <li className="team-principle" key={principle.english}>
                  <button
                    type="button"
                    className={`team-principle__button${selectedPrinciple === index ? ' is-active' : ''}`}
                    aria-pressed={selectedPrinciple === index}
                    aria-controls="team-principle-detail"
                    onClick={() => setSelectedPrinciple(index)}
                  >
                    <span className="team-principle__number" aria-hidden="true">0{index + 1}</span>
                    <span className="team-principle__label"><span>{principle.label}</span><span lang="en">{principle.english}</span></span>
                  </button>
                </li>
              ))}
            </ol>
            <article className="team-principle__detail" id="team-principle-detail" aria-live="polite" key={selected.english}>
              <h3>{selected.title}</h3>
              <p>{selected.body}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
