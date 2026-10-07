import { useRef, useState } from 'react';
import TearTicket from '../components/TearTicket';
import { studentCases } from '../data/studentCases';
import './StudentCasesPage.css';

function PullArrow({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6M4 5v14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudentTicket({ entry }) {
  const [torn, setTorn] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ticketRef = useRef(null);
  const toggleRef = useRef(null);
  const detailsId = `case-details-${entry.id}`;

  const handleTear = () => {
    setTorn(true);
    setExpanded(true);
    // A keyboard user should keep a useful focus target when the stub leaves.
    if (ticketRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus({ preventScroll: true });
    }
  };

  const restore = () => {
    setTorn(false);
    setExpanded(false);
    toggleRef.current?.focus({ preventScroll: true });
  };

  return (
    <article className="student-case" aria-labelledby={`case-title-${entry.id}`}>
      <div className="student-case__ticket" ref={ticketRef}>
        <TearTicket
          image={entry.image}
          imageAlt={`${entry.name}的${entry.title}作品截图`}
          torn={torn}
          onTear={handleTear}
          width={480}
          height={320}
          stubSize={112}
          radius={16}
          imageRadius={8}
          holes={15}
          holeSize={5}
          notch={5}
          tearAngle={26}
          stretch={26}
          resistance={0.4}
          rotate={entry.rotation}
          tiltMax={5}
          tiltReach={120}
          parallax={4}
          background={entry.dark ? '#101827' : '#f3f6fa'}
          color={entry.dark ? '#f8fafc' : '#142033'}
          stubBackground="#e7eef9"
          borderColor={entry.dark ? '#344359' : '#d7e0ec'}
          ariaLabel={`撕开${entry.name}的作品票根，展开作品亮点；也可按回车或空格`}
          stub={(
            <div className="student-case__stub">
              <span className="student-case__stub-top">FDE / WORKS</span>
              <div>
                <div className="student-case__stub-number">{entry.number}</div>
                <div className="student-case__stub-label">作品通行证</div>
              </div>
              <div className="student-case__stub-action">
                <PullArrow />
                <span>撕开看看</span>
              </div>
              <div className="student-case__barcode" aria-hidden="true" />
            </div>
          )}
        >
          <div className="student-case__body">
            <div className="student-case__author"><span>{entry.name}</span><i aria-hidden="true" /><span>{entry.category}</span></div>
            <h3 id={`case-title-${entry.id}`}>{entry.title}</h3>
            <p>{entry.description}</p>
          </div>
        </TearTicket>
      </div>
      <div className="student-case__actions">
        <a className="student-case__visit" href={entry.href} target="_blank" rel="noopener noreferrer" aria-label={`查看${entry.name}的${entry.title}作品（新窗口）`}>
          查看作品 <span aria-hidden="true">↗</span>
        </a>
        <button ref={toggleRef} className="student-case__toggle" type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}>
          {expanded ? '收起亮点' : '作品亮点'} <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
      </div>
      <div className="student-case__details" id={detailsId} hidden={!expanded}>
        <h4>{entry.subtitle}</h4>
        <ul>{entry.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
        {torn && <button className="student-case__reset" type="button" onClick={restore}>恢复票根，再试一次 <span aria-hidden="true">↺</span></button>}
      </div>
    </article>
  );
}

export default function StudentCasesPage() {
  return (
    <section className="student-cases-page" id="student-cases" aria-labelledby="student-cases-title">
      <div className="student-cases-page__inner">
        <div className="student-cases-page__index">
          <p className="section-kicker">04 / 05 — STUDENT CASES</p>
          <span className="student-cases-page__edition">SELECTED WORKS / 2026</span>
        </div>
        <div className="student-cases-page__intro">
          <h2 id="student-cases-title"><span>每一个作品，</span><span>都是一次真实的开始。</span></h2>
          <p>五位学员，用 WorkBuddy 把自己的问题做成可以使用、可以分享的产品。<br />撕开一张票，看看想法如何落地。</p>
        </div>
        <div className="student-cases-page__guide">
          <span><PullArrow />向外拖动票根，展开作品亮点</span>
          <span className="student-cases-page__count">05 份作品 / BUILT WITH WORKBUDDY</span>
        </div>
        <ol className="student-ticket-grid" aria-label="五位学员的作品">
          {studentCases.map(entry => <li key={entry.id}><StudentTicket entry={entry} /></li>)}
        </ol>
        <div className="student-cases-page__footer">
          <span>FROM AN IDEA TO SOMETHING REAL.</span>
          <span>每一张票，通往一个已经发生的实践。</span>
        </div>
      </div>
    </section>
  );
}
