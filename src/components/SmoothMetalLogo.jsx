import { useId } from 'react';
import { assetPath } from '../assetPath';
import './SmoothMetalLogo.css';

const WORDMARK = assetPath('assets/huake-official-wordmark.svg');

/** The official vector silhouette, lit as polished chrome without a grain layer. */
export default function SmoothMetalLogo({ paused = false, reducedMotion = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="smooth-metal-logo" viewBox="-.4 -.4 106.11 21.39" aria-hidden="true" focusable="false"
      data-paused={paused || reducedMotion ? 'true' : 'false'}>
      <defs>
        <image id={`${id}-art`} href={WORDMARK} width="105.31" height="20.59" />
        <mask id={`${id}-shape`} x="0" y="0" width="105.31" height="20.59"
          maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
          <use href={`#${id}-art`} />
        </mask>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1.4" y2="20.59" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--metal-high)" />
          <stop offset=".16" stopColor="var(--metal-middle)" />
          <stop offset=".29" stopColor="var(--metal-low)" />
          <stop offset=".365" stopColor="var(--metal-dark)" />
          <stop offset=".425" stopColor="var(--metal-high)" />
          <stop offset=".5" stopColor="var(--metal-high)" />
          <stop offset=".67" stopColor="var(--metal-middle)" />
          <stop offset=".78" stopColor="var(--metal-low)" />
          <stop offset=".89" stopColor="var(--metal-high)" />
          <stop offset="1" stopColor="var(--metal-middle)" />
        </linearGradient>
        <linearGradient id={`${id}-small-type`} x1="0" y1="14.5" x2="0" y2="19.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--metal-type-light)" />
          <stop offset=".52" stopColor="var(--metal-type-mid)" />
          <stop offset="1" stopColor="var(--metal-type-light)" />
        </linearGradient>
        <radialGradient id={`${id}-sheen`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity=".76" />
          <stop offset=".38" stopColor="#f1f8ff" stopOpacity=".38" />
          <stop offset="1" stopColor="#e4f2ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset=".28" stopColor="#ffffff" stopOpacity=".93" />
          <stop offset=".68" stopColor="#e0efff" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-depth`} x="-2%" y="-5%" width="104%" height="115%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceAlpha" dx=".1" dy=".23" result="raised" />
          <feFlood floodColor="var(--metal-depth)" />
          <feComposite in2="raised" operator="in" />
        </filter>
        <filter id={`${id}-bevel`} x="-2%" y="-5%" width="104%" height="110%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceAlpha" dx=".12" dy=".17" result="down" />
          <feComposite in="SourceAlpha" in2="down" operator="out" result="upper-rim" />
          <feFlood floodColor="#ffffff" floodOpacity=".95" />
          <feComposite in2="upper-rim" operator="in" result="rim-light" />
          <feOffset in="SourceAlpha" dx="-.09" dy="-.13" result="up" />
          <feComposite in="SourceAlpha" in2="up" operator="out" result="lower-rim" />
          <feFlood floodColor="var(--metal-dark)" floodOpacity=".7" />
          <feComposite in2="lower-rim" operator="in" result="rim-shade" />
          <feMerge><feMergeNode in="rim-shade" /><feMergeNode in="rim-light" /></feMerge>
        </filter>
        <clipPath id={`${id}-relief-region`}>
          <rect width="39" height="21" />
          <rect x="46" width="60" height="13.7" />
        </clipPath>
      </defs>
      <use href={`#${id}-art`} filter={`url(#${id}-depth)`} />
      <g mask={`url(#${id}-shape)`}>
        <rect width="105.31" height="20.59" fill={`url(#${id}-chrome)`} />
        <g className="smooth-metal-logo__reflection">
          <ellipse cx="12" cy="7" rx="23" ry="16" fill={`url(#${id}-sheen)`} />
          <path d="M-2-3C15 1 5 17 19 24" stroke={`url(#${id}-glint)`} strokeWidth="1.15" fill="none" />
        </g>
        {/* Fine English outlines keep one continuous reflective tone for legibility. */}
        <rect x="46" y="14" width="60" height="6" fill={`url(#${id}-small-type)`} />
      </g>
      <use href={`#${id}-art`} filter={`url(#${id}-bevel)`} clipPath={`url(#${id}-relief-region)`} />
    </svg>
  );
}
