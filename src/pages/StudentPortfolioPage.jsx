import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TearTicket from '../components/TearTicket';
import { studentCases } from '../data/studentCases';
import './StudentPortfolioPage.css';

function PortfolioStamp({ entry, onDetails, torn }) {
  const stamp = useRef(null);
  return (
    <article ref={stamp} className="portfolio-stamp" aria-labelledby={`portfolio-title-${entry.id}`}>
      <TearTicket
        image={entry.image}
        imageAlt={`${entry.name}的${entry.title}作品截图`}
        width={560}
        height={320}
        stubSize={196}
        radius={16}
        imageRadius={8}
        holes={15}
        holeSize={5}
        notch={5}
        tearAngle={26}
        stretch={26}
        resistance={0.4}
        rotate={entry.rotation}
        torn={torn}
        onTear={() => onDetails(entry, stamp.current?.querySelector('.tear-ticket__piece--stub'))}
        scrim={false}
        tilt={false}
        tiltMax={0}
        parallax={0}
        loading="lazy"
        background={entry.dark ? '#101827' : '#f3f6fa'}
        color={entry.dark ? '#f8fafc' : '#142033'}
        stubBackground="#e7eef9"
        borderColor={entry.dark ? '#344359' : '#d7e0ec'}
        ariaLabel={`撕开${entry.name}的作品票根，查看${entry.title}作品亮点`}
        stub={(
          <div className="portfolio-stamp__stub">
            <span className="portfolio-stamp__name">{entry.name}</span>
            <h2 id={`portfolio-title-${entry.id}`}>{entry.title}</h2>
            <strong className="portfolio-stamp__tear-hint">撕开看看 <span aria-hidden="true">↗</span></strong>
            <i className="portfolio-stamp__barcode" aria-hidden="true" />
          </div>
        )}
      >
        <a
          className="portfolio-stamp__image-link"
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`查看${entry.name}的${entry.title}作品（新窗口）`}
        />
      </TearTicket>
    </article>
  );
}

export default function StudentPortfolioPage() {
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    document.title = '学员作品集 · 华科未来';
    document.documentElement.classList.add('student-portfolio-route');
    document.body.classList.add('student-portfolio-route');
    const root = document.getElementById('root');
    root?.classList.add('student-portfolio-route');
    const previousOverflow = {
      html: document.documentElement.style.overflowY,
      body: document.body.style.overflowY,
      root: root?.style.overflowY || '',
    };
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    if (root) root.style.overflowY = 'visible';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return () => {
      document.documentElement.classList.remove('student-portfolio-route');
      document.body.classList.remove('student-portfolio-route');
      root?.classList.remove('student-portfolio-route');
      document.documentElement.style.overflowY = previousOverflow.html;
      document.body.style.overflowY = previousOverflow.body;
      if (root) root.style.overflowY = previousOverflow.root;
    };
  }, []);

  useLayoutEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  const openDetails = (entry, trigger) => {
    returnFocus.current = trigger;
    setSelected(entry);
  };

  const closeDetails = () => {
    setSelected(null);
    requestAnimationFrame(() => returnFocus.current?.focus({ preventScroll: true }));
  };

  return (
    <main className="student-portfolio-page">
      <div className="portfolio-decor portfolio-decor--top-left" aria-hidden="true">
        <div className="portfolio-label portfolio-label--top">
          <span className="portfolio-label__rule" />
          <span>FROM THE WORKSHOP</span>
          <span className="portfolio-label__rule" />
        </div>
        <span className="portfolio-paperclip" />
      </div>
      <div className="portfolio-decor portfolio-decor--top-right" aria-hidden="true">
        <span className="portfolio-binder-clip">
          <i />
          <i />
        </span>
      </div>
      <div className="portfolio-decor portfolio-decor--bottom-left" aria-hidden="true">
        <div className="portfolio-label portfolio-label--bottom">
          <strong>HUAK FUTURE</strong>
          <span>STUDENT WORKS · 2026</span>
        </div>
      </div>
      <div className="student-portfolio-paper">
        <header className="student-portfolio-header">
          <div className="student-portfolio-header__topline">
            <p>HUAK FUTURE / STUDENT WORKS</p>
            <a className="student-portfolio-back-button" href="/#student-cases">
              <span>返回华科未来</span>
              <span className="student-portfolio-back-button__arrow" aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="student-portfolio-heading">
            <span className="student-portfolio-heading__eyebrow">学员作品集 / 001</span>
            <h1><span>把所学，</span><em>寄成作品。</em></h1>
            <p>一张张贴票，记录每一次从想法到实践。</p>
          </div>
          <div className="student-portfolio-heading__rule" aria-hidden="true" />
          <p className="student-portfolio-heading__note">从一次提问、一个原型，到一件逐步完善的作品。</p>
        </header>
        <section className="student-portfolio-grid" aria-label="学员作品集">
          {studentCases.map(entry => (
            <PortfolioStamp
              entry={entry}
              key={entry.id}
              onDetails={openDetails}
              torn={selected?.id === entry.id}
            />
          ))}
        </section>
        <footer className="student-portfolio-footer">
          <span>每一次出发，都值得寄出。</span>
          <span>华科未来 · 学员作品集</span>
        </footer>
      </div>
      <dialog
        ref={dialog}
        className="student-portfolio-dialog"
        aria-labelledby="portfolio-dialog-title"
        onClose={closeDetails}
        onClick={event => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        {selected && (
          <div className="student-portfolio-dialog__inner">
            <button
              className="student-portfolio-dialog__close"
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="关闭作品亮点"
              autoFocus
            >
              ×
            </button>
            <p className="student-portfolio-dialog__kicker">WORK {selected.number} / {selected.name}</p>
            <h2 id="portfolio-dialog-title">{selected.title}</h2>
            <h3>{selected.subtitle}</h3>
            <p>{selected.description}</p>
            <ul>
              {selected.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
            </ul>
            <a href={selected.href} target="_blank" rel="noopener noreferrer">查看完整作品 ↗</a>
          </div>
        )}
      </dialog>
    </main>
  );
}
