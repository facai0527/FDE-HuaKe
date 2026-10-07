import BounceCards from '../components/BounceCards';

const aboutImages = [
  '/assets/cases/case-travel.png',
  '/assets/cases/case-byd.png',
  '/assets/cases/case-job.png',
  '/assets/cases/case-video.png',
];

export default function AboutPage() {
  return (
    <section className="about-teaser" id="about">
      <div className="about-teaser__identity">
        <p className="section-kicker">05 / 05 — ABOUT FDE</p>
        <img className="about-teaser__logo" src="/assets/fde-logo.png" alt="华科未来" />
        <h2>fde团队属于华科未来，<br />从真实问题出发，做真实的事。</h2>
        <p className="about-teaser__body">Future · Design · Exploration。我们相信，好的探索最终会留下一个可使用的结果。</p>
        <div className="about-bounce">
          <div className="about-bounce__label">ABOUT / BOUNCE CARDS · 把作品带回桌面</div>
          <BounceCards images={aboutImages} containerWidth={520} containerHeight={290} animationDelay={0.35} animationStagger={0.08} enableHover transformStyles={['rotate(7deg) translate(-120px)', 'rotate(3deg) translate(-60px)', 'rotate(-2deg)', 'rotate(-5deg) translate(60px)']} />
        </div>
        <a className="about-teaser__link" href="https://huakefuture.com/" target="_blank" rel="noreferrer">
          访问华科未来官网 <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
