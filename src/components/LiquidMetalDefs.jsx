// Local SVG material: moving reflections stay inside the text's existing fill.
export default function LiquidMetalDefs({ id, box, smooth = false }) {
  return (
    <>
      <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0.08" y2="1" data-metal-gradient>
        {smooth ? <>
          <stop offset="0" stopColor="#edf3f8" />
          <stop offset="0.24" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#b3bfce" />
          <stop offset="0.64" stopColor="#8493a7" />
          <stop offset="0.84" stopColor="#e6eef6" />
          <stop offset="1" stopColor="#c3d0df" />
        </> : <>
        <stop offset="0" stopColor="#dce6ef" />
        <stop offset="0.13" stopColor="#ffffff" />
        <stop offset="0.29" stopColor="#8b9aab" />
        <stop offset="0.4" stopColor="#eff6ff" />
        <stop offset="0.47" stopColor="#4b586b" />
        <stop offset="0.51" stopColor="#131c2b" />
        <stop offset="0.57" stopColor="#b8c6da" />
        <stop offset="0.65" stopColor="#ffffff" />
        <stop offset="0.79" stopColor="#788ba3" />
        <stop offset="0.93" stopColor="#e7f3ff" />
        <stop offset="1" stopColor="#a2b4ca" />
        </>}
      </linearGradient>
      <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8fcff" stopOpacity="0" />
        <stop offset="0.4" stopColor="#f8fcff" stopOpacity="0.15" />
        <stop offset="0.51" stopColor="#ffffff" stopOpacity="0.96" />
        <stop offset="0.58" stopColor="#d1e5ff" stopOpacity="0.7" />
        <stop offset="1" stopColor="#8aa4ce" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.36" stopColor="#d2dfed" />
        <stop offset="0.55" stopColor="#596c83" />
        <stop offset="0.8" stopColor="#f1f8ff" />
        <stop offset="1" stopColor="#9dbcea" />
      </linearGradient>
      <pattern id={id} x={box.x} y={box.y} width={box.width} height={box.height}
        patternUnits="userSpaceOnUse" viewBox="0 0 1000 300" preserveAspectRatio="none">
        <rect width="1000" height="300" fill={`url(#${id}-chrome)`} />
        <g data-metal-flow="broad" opacity={smooth ? 0.16 : 1}>
          <path d="M-180 12 C80 195 220 -48 445 82 S720 252 1180 24 L1180 116 C820 292 638 156 430 139 S80 273 -180 97Z"
            fill={`url(#${id}-ribbon)`} />
          <path d="M-180 210 C80 40 248 271 488 178 S805 39 1180 178 L1180 230 C840 86 746 204 486 218 S80 117 -180 275Z"
            fill="#0a1525" opacity="0.34" />
        </g>
        <g data-metal-flow="glint" opacity={smooth ? 0.04 : 1}>
          <path d="M-160 239 C92 94 231 322 506 189 S822 125 1160 207"
            fill="none" stroke="#f5fbff" strokeWidth="13" opacity="0.65" />
          <path d="M-160 239 C92 94 231 322 506 189 S822 125 1160 207"
            fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
        </g>
      </pattern>
      <filter id={`${id}-bevel`} x="-5%" y="-12%" width="110%" height="124%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="edge-height" />
        <feSpecularLighting in="edge-height" surfaceScale={smooth ? 1.5 : 3} specularConstant={smooth ? 0.35 : 0.65}
          specularExponent="24" lightingColor="#ffffff" result="edge-light">
          <fePointLight x="-120" y="-180" z="240" />
        </feSpecularLighting>
        <feComposite in="edge-light" in2="SourceAlpha" operator="in" result="edge-shine" />
        <feComposite in="SourceGraphic" in2="edge-shine" operator="arithmetic" k1="0" k2="1" k3="0.8" k4="0" />
      </filter>
    </>
  );
}
