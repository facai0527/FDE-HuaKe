import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TearTicket from '../components/TearTicket';
import { useStory } from '../components/StoryContext';
import { studentCases } from '../data/studentCases';
import ChapterText from '../components/ChapterText';
import TextType from '../components/TextType';
import ShinyText from '../components/ShinyText';
import SpecularButton from '../components/SpecularButton';
import './StudentCasesPage.css';

function StudentTicket({ entry, onDetails, torn }) {
  const ticket = useRef(null);
  const { activeId, isTraveling, reducedMotion } = useStory();
  return (
    <article ref={ticket} className="student-case" aria-labelledby={`case-title-${entry.id}`}>
      <div className="student-case__ticket">
        <TearTicket image={entry.image} imageAlt={`${entry.name}的${entry.title}作品截图`} torn={torn}
          onTear={() => onDetails(entry, ticket.current?.querySelector('.tear-ticket__piece--stub'))}
          width={560} height={320} stubSize={196} radius={16} imageRadius={8} holes={15} holeSize={5} notch={5}
          tearAngle={26} stretch={26} resistance={0.4} rotate={entry.rotation}
          tilt={activeId === 'student-cases' && !isTraveling && !reducedMotion} tiltMax={1.5} tiltReach={24} parallax={1}
          scrim={false}
          background={entry.dark ? '#101827' : '#f3f6fa'} color={entry.dark ? '#f8fafc' : '#142033'}
          stubBackground="#e7eef9" borderColor={entry.dark ? '#344359' : '#d7e0ec'}
          ariaLabel={`撕开${entry.name}的作品票根，查看作品亮点`}
          stub={<div className="student-case__stub">
            <span className="student-case__name">{entry.name}</span>
            <h3 id={`case-title-${entry.id}`}>{entry.title}</h3>
            <strong className="student-case__tear-hint">撕开看看 <span aria-hidden="true">↗</span></strong>
            <i className="student-case__barcode" aria-hidden="true" />
          </div>}
        >
          <a className="student-case__image-link" href={entry.href} target="_blank" rel="noopener noreferrer"
            aria-label={`查看${entry.name}的${entry.title}作品（新窗口）`} />
        </TearTicket>
      </div>
    </article>
  );
}

export default function StudentCasesPage() {
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  const { activeId, enteringId, isTraveling, reducedMotion } = useStory();
  const textActive = activeId === 'student-cases' || enteringId === 'student-cases';
  const textPaused = isTraveling && enteringId !== 'student-cases';
  const shineEffect = { color: '#a1a1aa', shineColor: '#ffffff', speed: 1.8,
    delay: 0.25, shineWidth: 55, softness: 0.45, angle: 110, direction: 'right',
    easing: 'linear', trigger: 'loop', paused: !textActive || textPaused || reducedMotion };
  const openDetails = (entry, trigger) => { returnFocus.current = trigger; setSelected(entry); };
  useLayoutEffect(() => { if (selected && !dialog.current.open) dialog.current.showModal(); }, [selected]);
  useEffect(() => { if (activeId !== 'student-cases' && dialog.current.open) dialog.current.close(); }, [activeId]);
  const closeDetails = () => {
    setSelected(null);
    if (activeId === 'student-cases') requestAnimationFrame(() => returnFocus.current?.focus({ preventScroll: true }));
  };
  return (
    <section className="student-cases-page" id="student-cases" aria-labelledby="student-cases-title" data-story-scroll>
      <div className="student-cases-page__intro">
        <div className="student-cases-page__heading">
          <h2 id="student-cases-title"><TextType as="span" text="把所学，写进作品。"
            typingSpeed={100} initialDelay={150} loop={false} active={textActive}
            paused={textPaused} reducedMotion={reducedMotion} /></h2>
          <p className="chapter-english"><ShinyText {...shineEffect} text="Learning Made Visible." /></p>
        </div>
        <p className="student-cases-page__description">从一次提问、一个原型，到一件逐步完善的作品。我们关注每位学员如何理解问题、尝试方案，并在交流与复盘中形成自己的判断。</p>
        <div className="student-cases-page__actions">
          <SpecularButton size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0}
            textColor="#f5f5f5" lineColor="#ffffff" baseColor="#3F7BFF"
            intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35}
            followMouse proximity={250} autoAnimate={false}
            active={activeId === 'student-cases'}
            paused={activeId !== 'student-cases' || isTraveling} reducedMotion={reducedMotion}
            onClick={() => { window.location.href = '/student-portfolio'; }}>
            <ShinyText {...shineEffect} color="#d4d4d8" text="查看更多" />
          </SpecularButton>
        </div>
      </div>
      <div className="student-cases-page__gallery">
        <ol className="student-ticket-grid" aria-label="五位学员的作品">
          {studentCases.map(entry => <li key={entry.id}><StudentTicket entry={entry} onDetails={openDetails} torn={selected?.id === entry.id} /></li>)}
        </ol>
      </div>
      <dialog ref={dialog} className="student-case-dialog" aria-labelledby="case-dialog-title" onClose={closeDetails} onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
        {selected && <div className="student-case-dialog__inner">
          <button className="student-case-dialog__close" type="button" onClick={() => dialog.current.close()} aria-label="关闭作品亮点" autoFocus>×</button>
          <p className="section-kicker">WORK {selected.number} / {selected.name}</p>
          <h2 id="case-dialog-title"><ChapterText chapter="student-cases" effect="split" text={selected.title} /></h2>
          <h3>{selected.subtitle}</h3>
          <p><ChapterText chapter="student-cases" effect="blur" delay={0.15} text={selected.description} /></p>
          <ul>{selected.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
          <a href={selected.href} target="_blank" rel="noopener noreferrer">查看完整作品 ↗</a>
        </div>}
      </dialog>
    </section>
  );
}
