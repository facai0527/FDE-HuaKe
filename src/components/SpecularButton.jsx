'use client';

import { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl';
import './SpecularButton.css';

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

const SpecularButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  active = true,
  paused = false,
  reducedMotion = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  style,
  ...buttonProps
}) => {
  const btnRef = useRef(null);
  const fxRef = useRef(null);
  const propsRef = useRef({});
  const syncRef = useRef(null);

  propsRef.current = { radius, lineColor, baseColor, intensity, shineSize, shineFade, thickness, speed, followMouse, proximity, autoAnimate, active, paused, reducedMotion, disabled };

  useEffect(() => {
    const btn = btnRef.current;
    const fx = fxRef.current;
    if (!btn || !fx) return;

    let renderer, gl, geometry, program, mesh;
    let failed = false;
    let alive = true;
    let visible = true;
    let dpr = 1;
    let needsSize = true;
    let needsPaint = true;
    let rectDirty = true;
    let rect = null;
    let uniformKey = '';
    let pointerChanged = false;
    let pointer = null;
    const sizeRef = { w: 0, h: 0 };
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let pointerAngle = null;
    let proximityT = 0;
    let angle = 2.4;
    let idleAngle = 2.4;
    let bright = 0;
    let last = 0;
    let raf = 0;
    const lineC = new Color();
    const baseC = new Color();
    const canPaint = () => alive && visible && propsRef.current.active && !document.hidden;
    const reduced = () => propsRef.current.reducedMotion || motionPreference.matches;
    const canAnimate = () => canPaint() && !propsRef.current.paused && !propsRef.current.disabled && !reduced();
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const fallback = () => {
      failed = true;
      stop();
      delete btn.dataset.fxReady;
      if (gl?.canvas.parentNode === fx) fx.removeChild(gl.canvas);
    };
    const onContextLost = event => { event.preventDefault(); fallback(); };
    const initialize = () => {
      if (renderer || failed) return !failed;
      try {
        const canvas = document.createElement('canvas');
        const attributes = { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, preserveDrawingBuffer: true };
        // The supplied shader requires WebGL 2. Keep the CSS edge if unavailable.
        if (!canvas.getContext('webgl2', attributes)) { fallback(); return false; }
        renderer = new Renderer({ canvas, ...attributes, dpr: window.devicePixelRatio || 1 });
        gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        geometry = new Triangle(gl);
        if (geometry.attributes.uv) delete geometry.attributes.uv;
        program = new Program(gl, {
          vertex: VERT, fragment: FRAG, transparent: true, depthTest: false, depthWrite: false,
          uniforms: {
            uCenter: { value: [0, 0] }, uHalfSize: { value: [1, 1] },
            uRadius: { value: 0 }, uAngle: { value: angle }, uPx: { value: 1 },
            uLineColor: { value: [1, 1, 1] }, uBaseColor: { value: [0.32, 0.32, 0.32] },
            uIntensity: { value: 0 }, uShineSize: { value: 0.17 }, uShineFade: { value: 0.7 },
            uThickness: { value: 1 }, uBaseWidth: { value: 1 }
          }
        });
        program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        mesh = new Mesh(gl, { geometry, program });
        gl.canvas.addEventListener('webglcontextlost', onContextLost);
        fx.appendChild(gl.canvas);
        return true;
      } catch {
        fallback();
        return false;
      }
    };
    const measure = () => {
      if (!needsSize) return;
      rect = btn.getBoundingClientRect();
      rectDirty = false;
      needsSize = false;
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const nextDpr = window.devicePixelRatio || 1;
      if (sizeRef.w === w && sizeRef.h === h && dpr === nextDpr) return;
      sizeRef.w = w;
      sizeRef.h = h;
      dpr = nextDpr;
      renderer.dpr = dpr;
      renderer.setSize(w + PAD * 2, h + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
      program.uniforms.uHalfSize.value = [w / 2 * dpr, h / 2 * dpr];
      uniformKey = '';
      needsPaint = true;
    };
    const updatePointer = () => {
      if (!pointer) { pointerAngle = null; proximityT = 0; pointerChanged = false; return; }
      if (rectDirty || !rect) { rect = btn.getBoundingClientRect(); rectDirty = false; }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
      const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        const nx = (pointer.x - cx) / Math.max(rect.width / 2, 1);
        const ny = (cy - pointer.y) / Math.max(rect.height / 2, 1);
        pointerAngle = Math.atan2(2 / Math.max(rect.height, 1), -2 / Math.max(rect.width, 1)) + nx * 0.3 + ny * 0.15;
      } else {
        pointerAngle = Math.atan2(cy - pointer.y, pointer.x - cx);
      }
      const t = Math.max(0, 1 - dist / Math.max(propsRef.current.proximity, 1));
      proximityT = t * t * (3 - 2 * t);
      pointerChanged = false;
    };
    const draw = () => {
      const p = propsRef.current;
      const key = [p.radius, p.lineColor, p.baseColor, p.shineSize, p.shineFade, p.thickness, dpr, sizeRef.w, sizeRef.h].join('|');
      if (key !== uniformKey) {
        uniformKey = key;
        lineC.set(p.lineColor);
        baseC.set(p.baseColor);
        program.uniforms.uRadius.value = Math.max(0, Math.min(p.radius, sizeRef.w / 2, sizeRef.h / 2)) * dpr;
        program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
        program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
        program.uniforms.uShineSize.value = p.shineSize * Math.PI / 180;
        program.uniforms.uShineFade.value = p.shineFade * Math.PI / 180;
        program.uniforms.uThickness.value = p.thickness * dpr;
        program.uniforms.uBaseWidth.value = dpr;
        program.uniforms.uPx.value = dpr;
      }
      program.uniforms.uAngle.value = angle;
      program.uniforms.uIntensity.value = p.intensity * bright;
      renderer.render({ scene: mesh });
      needsPaint = false;
      btn.dataset.fxReady = 'true';
    };
    const update = now => {
      raf = 0;
      if (!canAnimate() || failed) return;
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      measure();
      if (pointerChanged || rectDirty) updatePointer();
      const p = propsRef.current;
      idleAngle += p.speed * dt;
      const steer = p.followMouse && pointerAngle !== null && (!p.autoAnimate || proximityT > 0);
      const target = steer ? pointerAngle : idleAngle;
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));
      const brightTarget = p.autoAnimate ? 1 : proximityT;
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));
      if (Math.abs(brightTarget - bright) < 0.0005) bright = brightTarget;
      draw();
      const settling = bright !== brightTarget || (bright > 0 && Math.abs(diff) > 0.001);
      const sweeping = bright > 0 && !steer && p.speed !== 0;
      if (p.autoAnimate || settling || sweeping) raf = requestAnimationFrame(update);
    };
    const wake = () => {
      if (raf || failed || !canAnimate() || !renderer) return;
      last = performance.now();
      raf = requestAnimationFrame(update);
    };
    const sync = () => {
      rectDirty = true;
      needsPaint = true;
      if (!canPaint()) { stop(); return; }
      if (!initialize()) return;
      measure();
      if (!canAnimate()) {
        stop();
        if (reduced() || propsRef.current.disabled) bright = 0;
        if (needsPaint) draw();
        return;
      }
      updatePointer();
      if (needsPaint) draw();
      if (propsRef.current.autoAnimate || proximityT > 0 || bright > 0) wake();
    };
    syncRef.current = sync;
    const onPointerMove = event => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      pointerChanged = true;
      wake();
    };
    const onPointerLeave = () => {
      pointer = null;
      pointerChanged = true;
      wake();
    };
    const onScroll = () => {
      rectDirty = true;
      if (pointer || bright > 0) wake();
    };
    const onResize = () => { needsSize = true; sync(); };
    const ro = new ResizeObserver(onResize);
    ro.observe(btn);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    io.observe(btn);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('visibilitychange', sync);
    motionPreference.addEventListener('change', sync);
    sync();

    return () => {
      alive = false;
      stop();
      syncRef.current = null;
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('visibilitychange', sync);
      motionPreference.removeEventListener('change', sync);
      gl?.canvas.removeEventListener('webglcontextlost', onContextLost);
      geometry?.remove();
      program?.remove();
      if (gl?.canvas.parentNode === fx) fx.removeChild(gl.canvas);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      delete btn.dataset.fxReady;
    };
  }, []);

  useEffect(() => { syncRef.current?.(); }, [radius, lineColor, baseColor, intensity,
    shineSize, shineFade, thickness, speed, followMouse, proximity, autoAnimate,
    active, paused, reducedMotion, disabled]);

  return (
    <button
      {...buttonProps}
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`specular-button specular-button--${size}${className ? ` ${className}` : ''}`}
      style={{
        '--sb-radius': `${radius}px`,
        '--sb-tint': tint,
        '--sb-tint-opacity': tintOpacity,
        '--sb-blur': `${blur}px`,
        '--sb-text-color': textColor,
        '--sb-base-color': baseColor,
        ...style
      }}
    >
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  );
};

export default SpecularButton;


