import AccordionGallery from '../components/AccordionGallery';
import './ActivityPage.css';

const activityImages = [
  { image: '/assets/activity/activity-venue.jpg', label: 'AI-OPC 枢纽中心', alt: 'AI-OPC 枢纽中心活动场地' },
  { image: '/assets/activity/activity-lounge.jpg', label: '开放共创厅', alt: '开放共创厅活动现场' },
  { image: '/assets/activity/activity-studio.png', label: 'WorkBuddy 实战营', alt: 'WorkBuddy 实战营活动现场' },
  { image: '/assets/activity/activity-night.png', label: '夜间工作坊', alt: '夜间工作坊活动现场' },
];

export default function ActivityPage() {
  return (
    <section className="activity-teaser" id="activity" aria-labelledby="activity-title">
      <div className="activity-intro">
        <div className="activity-intro__heading">
          <p className="section-kicker">02 / 05 — ACTIVITY FIELD</p>
          <h2 id="activity-title"><span>华科未来 · AI 超级个体</span><strong>WorkBuddy 实战营</strong></h2>
        </div>
        <p className="activity-intro__body">从场地、课程到真实协作，把每一次相遇变成可以继续推进的实践。</p>
      </div>
      <div className="activity-accordion-wrap">
        <div className="activity-gallery-meta"><span>FIELD NOTES / 2026</span><span>01 — 04</span></div>
        <AccordionGallery
          className="activity-accordion"
          items={activityImages}
          defaultIndex={0}
          height={420}
          gap={12}
          radius={14}
          expandRatio={0.52}
          trigger="hover"
          accentColor="#2563eb"
          overlayColor="#081d2a"
          textColor="#ffffff"
          grayscale={false}
        />
      </div>
    </section>
  );
}
