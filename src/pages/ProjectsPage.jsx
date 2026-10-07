import TiltedCard from '../components/TiltedCard';
import './ProjectsPage.css';

export default function ProjectsPage() {
  return (
    <section className="projects-section" id="projects">
      <div className="section-heading"><p className="section-kicker">03 / 05 — PROJECTS</p><h2>把想法，做成<br />可以运行的东西。</h2><p>从文化内容到 AI 工具，FDE 团队把探索落在真实的页面、流程和交付物里。</p></div>
      <div className="tilted-project-grid">
        <a className="tilted-project tilted-project--feature" href="https://facai0527.github.io/qiniandian/" target="_blank" rel="noreferrer">
          <div className="tilted-project__tag">01 · WEB EXPERIENCE <span>↗</span></div>
          <TiltedCard
            imageSrc="/assets/projects/qiniandian.png"
            altText="祈年殿网站项目截图"
            captionText="打开祈年殿网站 ↗"
            containerHeight="100%"
            imageHeight="100%"
            imageWidth="100%"
            rotateAmplitude={10}
            scaleOnHover={1.035}
            overlayContent={<div><strong>祈年殿网站</strong><small>让文化遗产在新的交互里被看见。</small></div>}
            displayOverlayContent
          />
        </a>
        <a className="tilted-project" href="https://facai0527.github.io/tea-shichagundong/" target="_blank" rel="noreferrer">
          <div className="tilted-project__tag">02 · STORYTELLING <span>↗</span></div>
          <TiltedCard
            imageSrc="/assets/projects/tea.png"
            altText="山间一盏茶叶网站项目截图"
            captionText="打开茶叶网站 ↗"
            containerHeight="100%"
            imageHeight="100%"
            imageWidth="100%"
            rotateAmplitude={12}
            scaleOnHover={1.05}
            overlayContent={<div><strong>山间一盏</strong><small>一片茶叶，先在光里醒来。</small></div>}
            displayOverlayContent
          />
        </a>
        <article className="tilted-project tilted-project--blue">
          <div className="tilted-project__tag">03 · PRODUCT</div>
          <TiltedCard
            imageSrc="/assets/projects/xiaohongshu-matrix.png"
            altText="小红书矩阵运营工作台截图"
            captionText="小红书矩阵运营工作台"
            containerHeight="100%"
            imageHeight="100%"
            imageWidth="100%"
            rotateAmplitude={12}
            scaleOnHover={1.05}
            overlayContent={<div><strong>小红书自动发布工作台</strong><small>从内容整理到发布动作，一条链路完成。</small></div>}
            displayOverlayContent
          />
        </article>
        <article className="tilted-project tilted-project--dark">
          <div className="tilted-project__tag">04 · FILM</div>
          <TiltedCard
            mediaType="video"
            videoSrc="/assets/projects/fde-project.mp4"
            altText="FDE 项目纪录视频"
            captionText="播放 FDE 项目纪录"
            containerHeight="100%"
            imageHeight="100%"
            imageWidth="100%"
            rotateAmplitude={10}
            scaleOnHover={1.04}
            overlayContent={<div><strong>FDE 项目纪录</strong><small>把一次次探索，剪成可以分享的现场。</small></div>}
            displayOverlayContent
          />
        </article>
      </div>
      <div className="projects-footnote"><span>PROJECTS / TILTED CARD GALLERY</span><span>悬停卡片查看细节 · 点击前两张打开项目</span></div>
    </section>
  );
}
