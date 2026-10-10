import { useCallback, useEffect, useRef, useState } from 'react';
import CardSwap, { Card } from '../components/CardSwap';
import { useStory } from '../components/StoryContext';
import ChapterText from '../components/ChapterText';
import TextType from '../components/TextType';
import ShinyText from '../components/ShinyText';
import './ProjectsPage.css';

const projects = [
  { title: '祈年殿', type: 'WEB EXPERIENCE', image: '/assets/projects/qiniandian.png',
    alt: '祈年殿网站项目截图', href: 'https://facai0527.github.io/qiniandian/',
    description: '用交互呈现文化内容，探索让理解与参与更容易的方式。' },
  { title: '山间一盏', type: 'STORYTELLING', image: '/assets/projects/tea-hero.png', fit: 'contain',
    alt: '山间一盏茶叶网站项目截图', href: 'https://facai0527.github.io/tea-shichagundong/',
    description: '从一片茶叶的故事出发，练习内容、视觉与交互的共同表达。' },
  { title: '小红书自动发布工作台', type: 'PRODUCT', image: '/assets/projects/xiaohongshu-matrix.png',
    alt: '小红书矩阵运营工作台截图',
    description: '从具体工作环节出发，探索工具如何协作、流程如何推进。' },
  { title: 'AIGC视频', type: 'FILM', video: '/assets/projects/fde-project.mp4#t=0.1',
    description: '记录动手、交流与复盘，让实践中的经验可以被分享。' },
];

export default function ProjectsPage() {
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  const video = useRef(null);
  const [current, setCurrent] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const active = activeId === 'projects';
  const textActive = active || enteringId === 'projects';
  const textPaused = isTraveling && enteringId !== 'projects';
  const typingEffect = { as: 'span', typingSpeed: 100, loop: false,
    active: textActive, paused: textPaused, reducedMotion };
  const shineEffect = { color: '#a1a1aa', shineColor: '#ffffff', speed: 1.8,
    delay: 0.25, shineWidth: 55, softness: 0.45, angle: 110, direction: 'right',
    easing: 'linear', trigger: 'loop', paused: !textActive || textPaused || reducedMotion };
  const changeCard = useCallback(index => { setCurrent(index); }, []);

  useEffect(() => {
    if (!active || current !== 3) video.current?.pause();
  }, [active, current]);

  return (
    <section className="projects-section" id="projects" aria-labelledby="projects-title" data-story-scroll>
      <div className="projects-composition">
        <div className="projects-intro">
          <h2 id="projects-title">
            <TextType {...typingEffect} className="projects-headline" text="让想法，" initialDelay={150} showCursor={false} />
            <TextType {...typingEffect} className="projects-headline projects-headline--offset" text="成为作品。" initialDelay={650} cursorCharacter="|" />
          </h2>
          <p className="projects-english"><ShinyText {...shineEffect} text="Ideas into Practice." /></p>
          <p className="projects-description">我们用项目记录共同探索的过程：问题如何被理解，想法怎样被验证，方案又如何逐步完善。每一件作品，都是下一次讨论的起点。</p>
        </div>
        <div className="projects-showcase" aria-label="四个团队项目">
          <CardSwap width="var(--project-card-width)" height="var(--project-card-height)"
            cardDistance={38} verticalDistance={56} delay={5000} skewAmount={5} easing="linear"
            pauseOnHover active={active && !isTraveling} paused={videoPlaying}
            reducedMotion={reducedMotion} onActiveChange={changeCard}>
            {projects.map((project, index) => {
              const Content = project.href ? 'a' : 'div';
              const linkProps = project.href ? { href: project.href, target: '_blank', rel: 'noreferrer' } : {};
              return (
                <Card key={project.title} className="project-deck-card" aria-label={project.title}>
                  <div className="project-deck-card__content">
                    <button type="button" className="project-deck-card__header" data-card-select={index}
                      aria-label={`查看${project.title}`} aria-pressed={current === index}>
                      <span className="project-deck-card__number">0{index + 1}</span>
                      <span className="project-deck-card__title">{project.title}</span>
                      <span className="project-deck-card__type">{project.type}</span>
                    </button>
                    <Content {...linkProps} data-card-body data-card-pause
                      inert={active && current === index ? undefined : ''}
                      className={`project-deck-card__media${project.video ? ' project-deck-card__media--video' : ''}${project.fit ? ` project-deck-card__media--${project.fit}` : ''}`}>
                      {project.video
                        ? <video ref={video} src={project.video} preload="metadata" controls playsInline
                            aria-label="FDE 项目纪录视频" onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)} onEnded={() => setVideoPlaying(false)} />
                        : <img src={project.image} alt={project.alt} decoding="async" />}
                    </Content>
                    <Content {...linkProps} data-card-body data-card-pause
                      inert={active && current === index ? undefined : ''}
                      className="project-deck-card__footer"><p><ChapterText chapter="projects" enabled={current === index} effect="blur" text={project.description} /></p>{project.href && <span>打开项目 ↗</span>}</Content>
                  </div>
                </Card>
              );
            })}
          </CardSwap>
        </div>
      </div>
    </section>
  );
}
