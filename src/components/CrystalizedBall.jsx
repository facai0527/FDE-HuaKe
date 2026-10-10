'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Geometry, RenderTarget, Texture } from 'ogl';
import { createLaserFlowUniforms, laserFlowFragment, LASER_BASE, LASER_HEIGHT } from './LaserFlow';

import './CrystalizedBall.css';

// Match the small cursor area in the case gallery in CSS pixels, at every DPR.
const CASES_POINTER_RADIUS = 50;

const BALL_PRESETS = {
  plasma: {
    color: '#F25BD0',
    strands: 6,
    crackle: 0.85,
    flares: 0.65,
    glow: 0.9,
    sparks: 0.6,
    particleCount: 15000,
    fill: 0.5,
    motion: 'rise',
    particleShape: 'square',
    depth: 0.6,
    sway: 0.5,
    twinkle: 0.5,
    haze: 0.7,
    dustSpeed: 1
  },
  aurora: {
    color: '#5CFFC8',
    strands: 5,
    crackle: 0.6,
    flares: 0.5,
    glow: 0.8,
    sparks: 0.45,
    particleCount: 15000,
    fill: 0.5,
    motion: 'rise',
    particleShape: 'square',
    depth: 0.6,
    sway: 0.5,
    twinkle: 0.5,
    haze: 0.7,
    dustSpeed: 1
  },
  nebula: {
    color: '#9478FF',
    strands: 6,
    crackle: 1,
    flares: 0.5,
    glow: 0.9,
    sparks: 0.6,
    particleCount: 18000,
    fill: 0.45,
    motion: 'rise',
    particleShape: 'square',
    depth: 0.5,
    sway: 0.4,
    twinkle: 0.6,
    haze: 0.8,
    dustSpeed: 1.2
  },
  ember: {
    color: '#FF8A2A',
    strands: 5,
    crackle: 0.9,
    flares: 0.8,
    glow: 1,
    sparks: 0.8,
    particleCount: 12000,
    fill: 0.35,
    motion: 'rise',
    particleShape: 'round',
    depth: 0.7,
    sway: 0.3,
    twinkle: 0.7,
    haze: 0.9,
    dustSpeed: 1.6
  },
  frost: {
    color: '#BFE6FF',
    strands: 3,
    crackle: 0.3,
    flares: 0.3,
    glow: 0.6,
    sparks: 0.2,
    particleCount: 16000,
    fill: 0.6,
    motion: 'fall',
    particleShape: 'round',
    depth: 0.8,
    sway: 0.4,
    twinkle: 0.4,
    haze: 0.5,
    dustSpeed: 0.7
  },
  solar: {
    color: '#FFD36E',
    strands: 6,
    crackle: 0.7,
    flares: 1,
    glow: 1.1,
    sparks: 0.5,
    particleCount: 15000,
    fill: 0.55,
    motion: 'orbit',
    particleShape: 'square',
    depth: 0.6,
    sway: 0.7,
    twinkle: 0.5,
    haze: 0.8,
    dustSpeed: 1
  },
  eclipse: {
    color: '#FFFFFF',
    strands: 4,
    crackle: 0.5,
    flares: 0.4,
    glow: 0.7,
    sparks: 0.35,
    particleCount: 14000,
    fill: 0.5,
    motion: 'drift',
    particleShape: 'square',
    depth: 0.7,
    sway: 0.5,
    twinkle: 0.5,
    haze: 0.5,
    dustSpeed: 0.8
  },
  abyss: {
    color: '#3F7BFF',
    strands: 5,
    crackle: 0.55,
    flares: 0.6,
    glow: 0.9,
    sparks: 0.4,
    particleCount: 20000,
    fill: 0.8,
    motion: 'orbit',
    particleShape: 'round',
    depth: 0.8,
    sway: 0.8,
    twinkle: 0.5,
    haze: 0.6,
    dustSpeed: 0.9
  }
};

const MOTIONS = { rise: 0, fall: 1, drift: 2, orbit: 3 };
const SHAPES = { square: 0, round: 1 };
const MAX_STRANDS = 8;
const MAX_ARCS = 4;
const MAX_PARTICLES = 40000;
const LOGO_EXTRA_PARTICLES = 30000;
const STATE_WIDTH = 256;
const PIXEL_BUDGET = 8.4e6;
const INTRO_SECONDS = 2.2;
const SETTLE_SECONDS = 7;
const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smooth = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = t => 1 - Math.pow(1 - t, 3);
const mixColor = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const wrapAngle = a => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
const setVec2 = (uniform, x, y) => { uniform.value[0] = x; uniform.value[1] = y; };
const setVec3 = (uniform, x, y, z) => { uniform.value[0] = x; uniform.value[1] = y; uniform.value[2] = z; };
const setVec4 = (uniform, x, y, z, w) => {
  uniform.value[0] = x; uniform.value[1] = y; uniform.value[2] = z; uniform.value[3] = w;
};

const parseColor = (value, fallback) => {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    const resolved = ctx.fillStyle;
    if (resolved.startsWith('#')) {
      const n = parseInt(resolved.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    const parts = resolved.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return fallback;
    return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  } catch {
    return fallback;
  }
};

const toLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const toOklab = rgb => {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
};

const fromOklab = ([L, a, b]) => {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map(v => clamp(toGamma(clamp(v, 0, 1)), 0, 1));
};

const blend = (a, b, t) => fromOklab(mixColor(toOklab(a), toOklab(b), t));

const shift = (rgb, hue, lightness, chroma) => {
  const [L, a, b] = toOklab(rgb);
  const c = Math.hypot(a, b) * chroma;
  const h = Math.atan2(b, a) + (hue * Math.PI) / 180;
  return fromOklab([clamp(L + lightness, 0, 1), c * Math.cos(h), c * Math.sin(h)]);
};

const withLightness = (rgb, hue, lightness, chroma) => {
  const [, a, b] = toOklab(rgb);
  const c = Math.max(Math.hypot(a, b) * chroma, 0.02);
  const h = Math.atan2(b, a) + (hue * Math.PI) / 180;
  return fromOklab([clamp(lightness, 0, 1), c * Math.cos(h), c * Math.sin(h)]);
};

const buildPalette = (color, light) => {
  if (light) {
    const ink = withLightness(color, 0, Math.min(toOklab(color)[0], 0.62), 1.15);
    return {
      rim: ink,
      rimHot: ink,
      rimMid: ink,
      rimDeep: withLightness(color, 0, 0.72, 0.8),
      spark: withLightness(color, 0, 0.6, 1.2),
      sparkGlow: withLightness(color, 0, 0.78, 0.8),
      haze: withLightness(color, 0, 0.8, 0.6),
      edge: withLightness(color, 0, 0.72, 0.8),
      tones: [
        withLightness(color, 0, 0.56, 1.1),
        withLightness(color, 16, 0.6, 1.05),
        withLightness(color, -16, 0.5, 1.1),
        withLightness(color, 0, 0.66, 0.9),
        withLightness(color, 0, 0.74, 0.7)
      ]
    };
  }
  return {
    rim: color,
    rimHot: mixColor(color, WHITE, 0.72),
    rimMid: mixColor(color, BLACK, 0.15),
    rimDeep: mixColor(color, BLACK, 0.45),
    spark: mixColor(color, WHITE, 0.45),
    sparkGlow: shift(color, 0, -0.15, 1),
    haze: mixColor(color, BLACK, 0.6),
    edge: shift(color, 0, -0.3, 0.9),
    tones: [
      shift(color, 0, -0.06, 1),
      shift(color, 16, -0.02, 1),
      shift(color, -16, -0.12, 1.05),
      shift(blend(color, WHITE, 0.25), 0, 0.04, 1),
      blend(color, WHITE, 0.7)
    ]
  };
};

const seeded = start => {
  let state = start >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const buildStrands = () => {
  const random = seeded(99);
  const bands = [
    [6, 12, 0.6, 1.6],
    [18, 34, 1.5, 3.5],
    [40, 70, 3, 7],
    [80, 130, 6, 12]
  ];
  const data = { harmonics: [], rates: [], phases: [], flareHarmonics: [], flareRates: [], flarePhases: [] };
  for (let s = 0; s < MAX_STRANDS; s++) {
    bands.forEach(([low, high, slow, fast]) => {
      data.harmonics.push(Math.round(low + random() * (high - low)));
      data.rates.push((slow + random() * (fast - slow)) * (random() < 0.5 ? -1 : 1));
      data.phases.push(random() * Math.PI * 2);
    });
    for (let j = 0; j < 3; j++) {
      data.flareHarmonics.push(4 + Math.floor(random() * 6));
      data.flareRates.push((0.4 + random() * 0.8) * (random() < 0.5 ? -1 : 1));
      data.flarePhases.push(random() * Math.PI * 2);
    }
    const lead = s === 0;
    data.flareHarmonics.push(lead ? 0.75 : 0.95 + random() * 0.3);
    data.flareRates.push(lead ? 1.15 : 0.8 + random() * 0.2);
    data.flarePhases.push(lead ? 1 : 0.7 + random() * 0.25);
  }
  return data;
};

const buildDust = count => {
  const random = seeded(1337);
  const rows = Math.max(1, Math.ceil(count / STATE_WIDTH));
  const home = new Float32Array(STATE_WIDTH * rows * 4);
  const seed = new Float32Array(STATE_WIDTH * rows * 4);
  let k = 0;
  let guard = 0;
  while (k < count && guard < count * 80) {
    guard++;
    let x;
    let y;
    let tone;
    if (random() < 0.28) {
      const angle = random() * Math.PI * 2;
      const radius = 0.87 + Math.sqrt(random()) * 0.105;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
      if (random() > smooth(-0.6, 0.3, -y)) continue;
      const q = random();
      tone = q < 0.5 ? 3 : q < 0.8 ? 2 : 1;
    } else {
      x = random() * 2 - 1;
      y = random() * 2 - 1;
      const radius = Math.hypot(x, y);
      if (radius > 0.975) continue;
      const bowl = Math.pow(smooth(-0.25, 0.85, -y), 1.3);
      const band = smooth(0.66, 0.96, radius) * smooth(-0.7, 0.3, -y);
      const weight = Math.max(bowl, band * 0.9);
      if (random() > 0.012 + 0.988 * weight) continue;
      if (weight < 0.12) tone = 4;
      else {
        const q = random();
        tone = q < 0.32 ? 0 : q < 0.52 ? 1 : q < 0.8 ? 2 : 3;
      }
    }
    const chord = Math.sqrt(Math.max(0, 0.95 - x * x - y * y));
    home[k * 4] = x;
    home[k * 4 + 1] = y;
    home[k * 4 + 2] = (random() * 2 - 1) * chord;
    home[k * 4 + 3] = tone;
    seed[k * 4] = tone === 4 ? 1.8 : random() < 0.22 ? 2.1 : 1.3;
    seed[k * 4 + 1] = random();
    seed[k * 4 + 2] = 2.5 + random() * 3.5;
    seed[k * 4 + 3] = 0.16 + random() * 0.26;
    k++;
  }
  return { home, seed, count: k, rows };
};

// Sample the actual mark once. The resulting data positions the existing GPU
// particles; the source image is never drawn as a background layer.
const sampleLogo = image => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const j = i * 4;
    mask[i] = pixels[j + 3] > 80 && pixels[j + 2] > 85 &&
      pixels[j + 2] > pixels[j] * 1.2 ? 1 : 0;
  }

  // Remove isolated compression / cutout speckles without closing the fine
  // spaces between the concentric ribbons or either hollow infinity loop.
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || visited[i]) continue;
    let read = 0;
    let end = 1;
    queue[0] = i;
    visited[i] = 1;
    while (read < end) {
      const cell = queue[read++];
      const x = cell % width;
      const y = Math.floor(cell / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const neighbor = yy * width + xx;
          if (!mask[neighbor] || visited[neighbor]) continue;
          visited[neighbor] = 1;
          queue[end++] = neighbor;
        }
      }
    }
    if (end < 48) for (let n = 0; n < end; n++) mask[queue[n]] = 0;
  }

  const body = [];
  const edge = [];
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? mask[y * width + x] : 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      if (!mask[cell]) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      let nx = 0;
      let ny = 0;
      let isEdge = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (!filled(x + dx, y + dy)) { nx += dx; ny += dy; isEdge = true; }
        }
      }
      const normalLength = Math.hypot(nx, ny) || 1;
      const point = { x, y, nx: nx / normalLength, ny: -ny / normalLength,
        r: pixels[cell * 4] / 255, g: pixels[cell * 4 + 1] / 255, b: pixels[cell * 4 + 2] / 255 };
      body.push(point);
      if (isEdge) edge.push(point);
    }
  }
  if (!body.length || !edge.length) return null;
  return { body, edge, width: maxX - minX + 1, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

const buildLogoData = (count, rows, logo) => {
  const positions = new Float32Array(STATE_WIDTH * rows * 4);
  const colors = new Float32Array(positions.length);
  if (!logo) return { positions, colors };
  const random = seeded(72145);
  for (let i = 0; i < count; i++) {
    // Keep the mark nearly complete: most grains belong to the ribbons, with
    // a smaller, continuous fringe escaping from the sampled edge normals.
    const emitting = random() < 0.065;
    const candidates = emitting ? logo.edge : logo.body;
    let point = candidates[Math.floor(random() * candidates.length)];
    if (!emitting) {
      // Add extra body density near the central crossing while sampling only
      // real painted pixels, so the two hollow loops and fine arc gaps survive.
      for (let attempt = 0; attempt < 8; attempt++) {
        const nx = (point.x - logo.cx) / logo.width;
        const density = 0.56 + 0.44 * Math.exp(-nx * nx / 0.025);
        if (random() < density) break;
        point = candidates[Math.floor(random() * candidates.length)];
      }
    }
    const j = i * 4;
    positions[j] = (point.x - logo.cx + (random() - 0.5) * 0.7) / logo.width;
    positions[j + 1] = (logo.cy - point.y + (random() - 0.5) * 0.7) / logo.width;
    positions[j + 2] = point.nx;
    positions[j + 3] = point.ny;
    colors[j] = point.r;
    colors[j + 1] = point.g;
    colors[j + 2] = point.b;
    colors[j + 3] = emitting ? 1 : 0;
  }
  return { positions, colors };
};

const passVertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const hashChunk = `
uint scramble(uint v) {
  v = v * 747796405u + 2891336453u;
  uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}

float random(uint v) {
  return float(scramble(v)) * (1.0 / 4294967295.0);
}
`;

const dustChunk = `
uniform float uDustTime;
uniform vec2 uTurn;
uniform float uMotion;
uniform float uFill;
uniform float uGalaxy;
uniform float uLogo;
uniform float uSpiral;
uniform vec2 uSpiralScale;
uniform float uBeam;
uniform vec2 uBeamScale;
uniform float uCasesSpread;
uniform vec2 uCasesSideLimit;
uniform vec4 uCasesPointer;
uniform float uCasesFlowTime;
uniform vec2 uLogoOffset;
uniform float uLogoScale;
uniform vec2 uLogoLook;
uniform sampler2D tLogo;
uniform sampler2D tLogoTint;

float logoGather(uint id) {
  return smoothstep(random(id * 13u + 6u) * 0.16, 1.0, uLogo);
}

float logoCycle(vec4 seed, uint id) {
  return fract(uDustTime * (0.095 + random(id * 13u + 8u) * 0.055) + seed.y);
}

float casesCycle(vec4 seed, uint id) {
  return fract(uCasesFlowTime * (0.095 + random(id * 13u + 8u) * 0.055) + seed.y);
}

float casesWingStream(vec4 mark, uint id, float emitting) {
  // About 71% of each wing remains anchored. Only a stable subset of grains
  // joins the existing edge emitters; the centre crossing stays connected.
  float selected = max(emitting, 1.0 - step(0.245, random(id * 29u + 1u)));
  float wing = smoothstep(0.14, 0.28, abs(mark.x));
  return selected * wing * uCasesSpread * (1.0 - uSpiral) * (1.0 - uBeam);
}

// Galaxy's smooth triangle drift, used only for motion; the pixel shader stays
// shared with the home sphere (no star flares or blurred sprites).
float galaxyDrift(float value) {
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * fract(value) - 1.0));
}

vec3 settle(vec3 p, out float spread) {
  float bend = exp2((0.5 - uFill) * 1.8);
  float h = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
  float y = 2.0 * pow(h, bend) - 1.0;
  float from = sqrt(max(1.0 - p.y * p.y, 1e-4));
  float to = sqrt(max(1.0 - y * y, 0.0));
  spread = clamp(bend * pow(max(h, 1e-3), bend - 1.0) * to / from, 0.25, 1.0);
  return vec3(p.xz * (to / from), y).xzy;
}

vec3 fieldDrift(vec4 home, vec4 seed, uint id, out float life, out float spread) {
  vec3 p = settle(home.xyz, spread);
  float t = uDustTime;
  float u = fract(t / seed.z + seed.y);
  life = sin(3.14159265 * u);
  float travel = seed.w;
  if (uMotion < 0.5) {
    p.y += travel * (u - 0.5);
  } else if (uMotion < 1.5) {
    p.y -= travel * (u - 0.5);
  } else if (uMotion < 2.5) {
    p += 0.045 * vec3(
      sin(t * 0.37 + seed.y * 17.0) + 0.5 * sin(t * 0.83 + seed.z * 5.0),
      sin(t * 0.29 + seed.z * 11.0) + 0.5 * sin(t * 0.61 + seed.w * 7.0),
      sin(t * 0.33 + seed.w * 23.0)
    );
  } else {
    float loop = t * (0.6 + 0.9 * random(id * 7u + 3u)) * (random(id * 7u + 10u) < 0.5 ? -1.0 : 1.0) + seed.y * 6.2831853;
    p.xy += (0.025 + 0.05 * random(id * 7u + 16u)) * vec2(cos(loop), sin(loop));
  }
  float wobble = 0.002 + 0.006 * random(id * 7u + 1u);
  float w1 = 0.8 + 2.4 * random(id * 7u + 2u);
  float w2 = 0.8 + 2.4 * random(id * 7u + 4u);
  p += wobble * vec3(sin(t * w1 + seed.y * 40.0), cos(t * w2 + seed.z * 30.0), sin(t * (w1 + w2) * 0.5 + seed.w * 20.0));
  float cy = cos(uTurn.x);
  float sy = sin(uTurn.x);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cx = cos(uTurn.y);
  float sx = sin(uTurn.y);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  if (uGalaxy > 0.0) {
    // Four staggered depth layers move towards the viewer, with the same slow
    // rotation and independent x/y drift as the supplied Galaxy reference.
    float layer = float(id % 4u) * 0.25;
    float depth = fract(layer + seed.y * 0.25 + t * 0.05);
    vec2 pad = vec2(galaxyDrift(seed.y * 34.0 + t / 10.0),
                    galaxyDrift(seed.y * 38.0 + t / 30.0)) - 0.5;
    vec3 galaxy = settle(home.xyz, spread);
    galaxy.xy += pad * 0.16;
    // Compress the reference's zoom range to retain a field of tiny pixels.
    galaxy.xy *= 1.0 / mix(1.4, 0.45, depth);
    float angle = t * 0.1;
    galaxy.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * galaxy.xy;
    p = mix(p, galaxy, uGalaxy);
    // Hide each layer's depth wrap, retaining the existing particle pulse.
    float cycleFade = smoothstep(0.0, 0.08, depth) * (1.0 - smoothstep(0.9, 1.0, depth));
    life *= mix(1.0, cycleFade, uGalaxy);
  }
  return p;
}

vec3 drift(vec4 home, vec4 seed, uint id, out float life, out float spread) {
  vec3 p = vec3(0.0);
  float t = uDustTime;
  life = 1.0;
  spread = 1.0;
  // Fully gathered shapes replace the preceding field with mix(..., 1).
  // Avoid evaluating those discarded orbits while retaining every in-between
  // calculation for transitions, including the same clocks and particle IDs.
  if (uLogo < 1.0 && uSpiral < 1.0 && uBeam < 1.0) {
    p = fieldDrift(home, seed, id, life, spread);
  }
  if (uLogo > 0.0 && uSpiral < 1.0 && uBeam < 1.0) {
    ivec2 cell = ivec2(int(id % ${STATE_WIDTH}u), int(id / ${STATE_WIDTH}u));
    vec4 mark = texelFetch(tLogo, cell, 0);
    float emitting = texelFetch(tLogoTint, cell, 0).a;
    float cycle = logoCycle(seed, id);
    float release = pow(cycle, 1.65) * (0.013 + random(id * 13u + 9u) * 0.052);
    vec2 normal = mark.zw;
    vec2 tangent = vec2(-normal.y, normal.x);
    vec2 flutter = vec2(sin(t * 0.65 + seed.y * 24.0), cos(t * 0.48 + seed.z * 17.0)) * 0.0003;
    vec2 escape = normal * release + tangent * sin(cycle * 5.0 + seed.y * 8.0) * release * 0.3;
    vec2 wingEscape = vec2(0.0);
    if (uCasesSpread > 0.0) {
      float wingCycle = casesCycle(seed, id);
      float stream = casesWingStream(mark, id, emitting);
      float side = sign(mark.x);
      float boundary = mix(uCasesSideLimit.x, uCasesSideLimit.y, step(0.0, mark.x));
      float room = max(0.006, boundary - abs(mark.x + escape.x * emitting));
      float reach = min(0.095 + random(id * 29u + 2u) * 0.13,
        room * (0.62 + random(id * 29u + 3u) * 0.25));
      float flight = pow(wingCycle, 0.95) * reach;
      float curl = sin(wingCycle * 5.5 + seed.y * 17.0) * 0.24 + normal.y * 0.16;
      wingEscape = vec2(side * flight, flight * curl) * stream;
      wingEscape.y += sin(uCasesFlowTime * 0.8 + seed.y * 23.0) * 0.008 * wingCycle * stream;
      // Push a soft circle of grains away from the cursor. Stable random
      // distances keep the boundary loose instead of forming a hard ring.
      vec2 gap = mark.xy + escape * emitting + wingEscape - uCasesPointer.xy;
      float distance = length(gap);
      float influence = 1.0 - smoothstep(0.0, uCasesPointer.w, distance);
      vec2 direction = gap / max(distance, 0.0001);
      float scatter = uCasesPointer.w * (0.45 + random(id * 31u + 1u) * 0.35) * influence;
      vec2 curlDirection = vec2(-direction.y, direction.x);
      wingEscape += (direction + curlDirection * sin(uCasesFlowTime * 2.0 + seed.y * 20.0) * 0.28)
        * scatter * uCasesPointer.z * uCasesSpread;
    }
    // Turn the complete particle mark toward the pointer, including its edge
    // emitters. A small perspective shift gives the flat logo a sense of depth.
    vec3 markPosition = vec3(mark.xy + flutter + escape * emitting + wingEscape, 0.0);
    float yaw = uLogoLook.x * 0.3, pitch = -uLogoLook.y * 0.22;
    markPosition.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * markPosition.xz;
    markPosition.yz = mat2(cos(pitch), sin(pitch), -sin(pitch), cos(pitch)) * markPosition.yz;
    float perspective = 1.0 / (1.0 - markPosition.z * 0.85);
    markPosition.xy = uLogoOffset + (markPosition.xy * perspective + uLogoLook * vec2(0.026, 0.018)) * uLogoScale;
    markPosition.z *= uLogoScale;
    float gather = logoGather(id);
    p = mix(p, markPosition, gather);
    life = mix(life, 1.0, gather);
    spread = mix(spread, 1.0, gather);
  }
  if (uSpiral > 0.0 && uBeam < 1.0) {
    // Each existing grain owns a stable orbit. No texture / geometry is rebuilt
    // as the logo releases into three spiral arms, a small core and loose halo.
    float population = random(id * 19u + 1u);
    float radius = pow(random(id * 19u + 2u), 0.72);
    float arm = float(id % 3u) * 2.0943951;
    float scatter = (random(id * 19u + 3u) + random(id * 19u + 4u) - 1.0);
    float angle = arm + radius * 7.2 + scatter * (0.24 + radius * 0.7);
    if (population < 0.18) angle = seed.y * 6.2831853;
    if (population > 0.9) {
      radius *= 0.24;
      angle = seed.y * 6.2831853;
    }
    angle += t * 0.035;
    vec2 disk = vec2(cos(angle), sin(angle) * 0.48) * radius;
    disk.y += scatter * (0.012 + radius * 0.018);
    float tilt = 0.42;
    disk = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * disk;
    vec3 orbit = vec3(disk * uSpiralScale, scatter * 0.16);
    p = mix(p, orbit, uSpiral);
    // A gentle sideways sweep makes the release read as an outward flow.
    p.xy += vec2(-orbit.y, orbit.x) * sin(uSpiral * 3.14159265) * 0.13;
    life = mix(life, 1.0, uSpiral);
    spread = mix(spread, 1.0, uSpiral);
  }
  if (uBeam > 0.0) {
    // Stable particle identities travel from their current orbit into a
    // narrow column and its flared foot. The laser lights up as they arrive.
    float height = pow(fract(seed.y + t * 0.075), 1.7);
    float lane = random(id * 23u + 1u) + random(id * 23u + 2u) - 1.0;
    float width = 0.0012 + 0.0025 * (1.0 - height) + 0.38 * exp(-height * 38.0);
    vec2 column = vec2(lane * width, ${LASER_BASE - .5} + height * ${LASER_HEIGHT});
    column.x += sin(t * 1.2 + height * 12.0 + seed.z) * 0.00065;
    float gather = smoothstep(random(id * 23u + 3u) * 0.12, 1.0, uBeam);
    p = mix(p, vec3(column * uBeamScale, 0.0), gather);
    life = mix(life, 1.0, gather);
    spread = mix(spread, 1.0, gather);
  }
  return p;
}
`;

const fieldFragment = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform float uRadius;
uniform float uDetailRadius;
uniform float uRimVisibility;
uniform float uDpr;
uniform float uLine;
uniform float uTime;
uniform float uFrame;
uniform float uBins;
uniform float uStrands;
uniform float uCrackle;
uniform float uFlares;
uniform float uGlow;
uniform float uHaze;
uniform float uFill;
uniform float uPresence;
uniform float uUnfold;
uniform float uBloom;
uniform float uInside;
uniform float uEncode;
uniform vec3 uRim;
uniform vec3 uRimHot;
uniform vec3 uRimMid;
uniform vec3 uRimDeep;
uniform vec3 uSpark;
uniform vec3 uSparkGlow;
uniform vec3 uHazeColor;
uniform vec3 uEdgeColor;
uniform vec4 uHeat;
uniform vec4 uHarmonics[8];
uniform vec4 uRates[8];
uniform vec4 uPhases[8];
uniform vec4 uFlareHarmonics[8];
uniform vec4 uFlareRates[8];
uniform vec4 uFlarePhases[8];
uniform vec4 uArcs[4];

out vec4 fragColor;
${hashChunk}
const float PI = 3.14159265;
const float TAU = 6.28318531;
const vec4 AMPS = vec4(0.35, 0.3, 0.22, 0.13);

float bell(float d, float w) {
  float x = d / w;
  return exp(-x * x);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

float pool(vec2 q) {
  float t = length(q - vec2(0.0, mix(-1.0, -0.66, uFill))) / mix(0.8, 1.35, uFill);
  return t < 0.6 ? mix(0.5, 0.22, t / 0.6) : mix(0.22, 0.0, clamp((t - 0.6) / 0.4, 0.0, 1.0));
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr - uCenter;
  float r = length(p);
  float R = uRadius;
  float D = uDetailRadius;
  vec3 col = vec3(0.0);

  if (uInside > 0.0 && r < R) {
    vec2 q = p / R;
    float chord = sqrt(max(1.0 - dot(q, q), 0.0));
    float haze = pool(q) * (0.55 + 0.45 * chord);
    col += uHazeColor * haze * uHaze * uInside;
    float e = length(q - vec2(0.0, 0.2)) / 1.2;
    float edge = 0.5 * pow(smoothstep(0.62, 1.0, e), 1.4);
    col += uEdgeColor * edge * uInside * (0.5 + 0.5 * uHaze);
  }

  vec3 interior = col;
  if (uRimVisibility <= 0.0) {
    fragColor = vec4(interior, 0.0) * uEncode;
    return;
  }
  float theta = atan(p.y, p.x);
  float lift = p.y / max(r, 1e-3);
  float topDim = 1.0 - 0.35 * pow(max(lift, 0.0), 1.5);
  float hot = 0.0;
  uint frame = uint(uFrame);
  float dr = r - R;
  float halo = 1.0 - smoothstep(D * 0.05, D * 0.105, abs(dr - D * 0.0213));
  col += uRimDeep * 0.18 * halo * topDim * uGlow * uBloom;
  col += uRim * 0.12 * bell(dr + D * 0.0383, D * 0.032) * uGlow * uBloom;
  col += uRim * 0.32 * bell(dr, max(D * 0.0117, uLine)) * uPresence * uUnfold;

  float delta = mod(theta - uHeat.x + PI, TAU) - PI;
  float heat = uHeat.z * uHeat.y * exp(-delta * delta / 0.3);
  float crackle = uCrackle + heat * 0.9;
  float amp = R * 0.016 * (0.3 + 1.4 * crackle) * uUnfold;
  float jitterAmp = R * 0.0048 * (0.3 + 1.4 * uCrackle) * uUnfold * (1.0 + heat * 0.3);
  float flareAmp = R * 0.064 * (0.4 + 1.2 * crackle) * uFlares * 1.6 * uUnfold;

  if (abs(dr) < amp * 2.0 + flareAmp + D * 0.3) {
    float step = TAU / uBins;
    float binPos = (theta + PI) / step;
    float bin0 = floor(binPos);
    float binF = binPos - bin0;
    float th0 = bin0 * step - PI;
    float th1 = th0 + step;
    uint b0 = uint(mod(bin0, uBins));
    uint b1 = uint(mod(bin0 + 1.0, uBins));
    float gain = min(1.0, 2.4 / max(uStrands, 1.0));
    for (int k = 0; k < 8; k++) {
      if (float(k) >= uStrands) break;
      vec4 m = uHarmonics[k];
      vec4 lead = uRates[k] * uTime + uPhases[k];
      float wave0 = dot(AMPS, sin(m * th0 + lead));
      float wave1 = dot(AMPS, sin(m * th1 + lead));
      uint salt = uint(k) * 1013u + frame * 7919u;
      vec4 shape = uFlareHarmonics[k];
      vec4 look = uFlareRates[k];
      vec4 tone = uFlarePhases[k];
      float a = amp * shape.w;
      float off0 = a * wave0 + jitterAmp * (random(b0 + salt) - 0.5);
      float off1 = a * wave1 + jitterAmp * (random(b1 + salt) - 0.5);
      float rc = R + mix(off0, off1, binF);
      float grade = (off1 - off0) / (step * max(r, 1.0));
      float d = abs(r - rc) * inversesqrt(1.0 + grade * grade);
      float swell = 0.8 + 0.4 * (0.5 + 0.5 * sin(3.0 * theta + uTime * 0.7 + tone.x * 1.7));
      float width = uLine * look.w * swell * (1.0 + heat * 0.25);
      float core = exp(-d * d / (width * width));
      float sheath = exp(-d * d / (width * width * 3.0));
      float bright = tone.w * (1.0 + heat * 0.45) * uPresence;
      col += (uRimHot * core * 0.8 + uRim * sheath * 0.32) * bright;
      hot += core * bright;
      vec3 fargs = shape.xyz * theta + look.xyz * uTime + tone.xyz;
      float flare = max(0.0, (sin(fargs.x) + sin(fargs.y) + sin(fargs.z)) / 3.0);
      flare = (flare * flare + heat * 0.35) * flareAmp;
      float dw = abs(r - rc - flare);
      float dm = abs(r - rc - flare * 0.6);
      float dn = abs(r - rc - flare * 0.25);
      vec3 glow = uRimDeep * (0.07 * bell(dw, D * 0.09) + 0.16 * bell(dw, D * 0.05));
      glow += uRimMid * 0.28 * bell(dm, D * 0.027) + uRim * 0.38 * bell(dn, D * 0.013);
      col += glow * gain * topDim * uGlow * uBloom * (1.0 + heat * 1.4);
    }
  }

  for (int i = 0; i < 4; i++) {
    vec4 arc = uArcs[i];
    if (arc.w <= 0.002) continue;
    float mid = arc.x + arc.y * 0.5;
    vec2 center = R * 0.93 * vec2(cos(mid), sin(mid));
    if (distance(p, center) > R * (abs(arc.y) * 0.6 + 0.1) + 12.0) continue;
    float ar = R * 0.955;
    vec2 a0 = ar * vec2(cos(arc.x), sin(arc.x));
    vec2 a2 = ar * vec2(cos(arc.x + arc.y), sin(arc.x + arc.y));
    vec2 a1 = R * (0.955 - arc.z) * vec2(cos(mid), sin(mid));
    float dmin = 1e5;
    float along = 0.0;
    vec2 prev = a0;
    for (int s = 1; s <= 10; s++) {
      float u = float(s) / 10.0;
      vec2 b = mix(mix(a0, a1, u), mix(a1, a2, u), u);
      vec2 pa = p - prev;
      vec2 ba = b - prev;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
      float dist = length(pa - ba * h);
      if (dist < dmin) {
        dmin = dist;
        along = (float(s) - 1.0 + h) / 10.0;
      }
      prev = b;
    }
    float taper = sqrt(max(sin(PI * along), 0.0));
    float arcWidth = uLine * (0.55 + 0.6 * taper);
    float arcCore = exp(-dmin * dmin / (arcWidth * arcWidth));
    float arcGlow = exp(-dmin * dmin / (arcWidth * arcWidth * 12.0));
    col += (uSpark * 0.95 * arcCore + uSparkGlow * 0.4 * arcGlow) * arc.w * taper;
    hot += arcCore * arc.w * taper * 0.6;
  }

  fragColor = vec4(mix(interior, col, uRimVisibility), hot * uRimVisibility) * uEncode;
}
`;

const dustVertex = `#version 300 es
precision highp float;

in float aIndex;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform float uStirred;
uniform vec2 uCenter;
uniform vec2 uViewport;
uniform float uRadius;
uniform float uDpr;
uniform float uDepth;
uniform float uTwinkle;
uniform float uPointScale;
uniform float uLogoPointScale;
uniform float uBaseParticleCount;
uniform float uReveal;
uniform float uEncode;
uniform vec3 uTones[5];
uniform vec3 uRimTone;

out vec3 vColor;
out float vSize;
${hashChunk}
${dustChunk}
void main() {
  ivec2 cell = ivec2(int(mod(aIndex, ${STATE_WIDTH}.0)), int(floor(aIndex / ${STATE_WIDTH}.0)));
  uint id = uint(aIndex);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  float life;
  float spread;
  vec3 p = drift(home, seed, id, life, spread);
  if (uStirred > 0.5) p += texelFetch(tOffset, cell, 0).xyz * (1.0 - smoothstep(0.0, 0.38, uLogo));
  float gathered = logoGather(id);
  float len = length(p);
  float unbounded = max(max(gathered, uSpiral), uBeam);
  float inside = mix(1.0 - smoothstep(0.955, 0.985, length(p.xy)), 1.0, unbounded);
  if (len > 0.975) p *= mix(0.975 / len, 1.0, unbounded);

  float front = p.z * 0.5 + 0.5;
  float depthSize = mix(1.0, 0.7 + 0.6 * front, uDepth);
  float depthLight = mix(1.0, 0.35 + 0.8 * front, uDepth);
  float blink = sin(uDustTime * (2.0 + 6.0 * random(id * 7u + 5u)) + random(id * 7u + 6u) * 6.2831853);
  float twinkle = mix(1.0, smoothstep(-0.9, -0.6, blink), uTwinkle);
  float fade = smoothstep(0.04, 0.12, life);
  float order = (home.y + 1.0) * 0.5 * 0.55 + random(id * 7u + 8u) * 0.25;
  float reveal = smoothstep(order, order + 0.2, uReveal * 1.0);
  float alpha = random(id * 7u + 9u) < 0.5 || home.w > 3.5 ? 1.0 : 0.6;

  float size = seed.x * uPointScale * (0.35 + 0.95 * life) * depthSize * mix(0.5, 1.0, reveal);
  float grain = random(id * 13u + 11u);
  float logoSize = (1.1 + grain * 0.9) * uLogoPointScale * mix(1.0, 1.35, step(0.975, grain));
  size = mix(size, logoSize, gathered);
  float starSize = (0.64 + grain * 0.72) * uLogoPointScale;
  starSize *= mix(1.0, 2.25, step(0.989, grain));
  size = mix(size, starSize, uSpiral);
  size = mix(size, 0.65 + grain * 0.6, uBeam);
  vec2 screen = uCenter + p.xy * uRadius;
  gl_Position = vec4(screen / uViewport * 2.0 - 1.0, 0.0, 1.0);
  float px = size * uDpr;
  gl_PointSize = px + 2.0;
  vSize = px;

  int tone = int(home.w + 0.5);
  float rimLit = smoothstep(0.8, 0.97, length(p.xy));
  vec3 color = uTones[tone] + uRimTone * rimLit * rimLit * 0.12;
  vColor = color * alpha * fade * twinkle * depthLight * reveal * inside * sqrt(spread) * uEncode;
  if (uLogo > 0.0) {
    vec4 ink = texelFetch(tLogoTint, cell, 0);
    float cycle = logoCycle(seed, id);
    float escapeFade = (1.0 - smoothstep(0.15, 1.0, cycle)) * smoothstep(0.0, 0.075, cycle);
    float emission = mix(1.0, escapeFade, ink.a);
    if (uCasesSpread > 0.0) {
      vec4 mark = texelFetch(tLogo, cell, 0);
      float stream = casesWingStream(mark, id, ink.a);
      float wingCycle = casesCycle(seed, id);
      float flightFade = smoothstep(0.0, 0.06, wingCycle) * (1.0 - smoothstep(0.52, 0.99, wingCycle));
      emission = mix(emission, flightFade * (1.08 + grain * 0.15), stream);
    }
    float sparkle = 0.84 + 0.16 * (0.5 + 0.5 * sin(uDustTime * 1.2 + seed.y * 25.0));
    float ice = clamp(ink.g * 0.68 + grain * 0.2, 0.0, 1.0);
    vec3 stardust = mix(vec3(0.25, 0.53, 0.96), vec3(0.56, 0.78, 1.0), ice);
    stardust = mix(stardust, vec3(0.91, 0.96, 1.0), smoothstep(0.86, 0.985, grain));
    stardust *= mix(0.94, 1.35, step(0.965, grain));
    vec3 logoColor = stardust * emission * sparkle;
    vColor = mix(vColor, logoColor * uEncode, gathered);
  }
  if (uSpiral > 0.0) {
    float orbitRadius = pow(random(id * 19u + 2u), 0.72);
    float whiteCore = (1.0 - orbitRadius) * 0.55 + grain * 0.36;
    vec3 starColor = mix(vec3(0.27, 0.48, 0.95), vec3(0.9, 0.95, 1.0), whiteCore);
    starColor = mix(starColor, vec3(0.7, 0.57, 0.94), step(0.84, seed.y) * 0.28);
    float starPulse = 0.82 + 0.18 * sin(uDustTime * (0.6 + seed.y) + seed.y * 29.0);
    float brightness = mix(0.5, 0.86, grain) * mix(1.0, 1.5, step(0.989, grain));
    vColor = mix(vColor, starColor * brightness * starPulse * uEncode, uSpiral);
  }
  // These grains are allocated up front, but add no visible particles to the
  // original home / team field. They gradually join the existing population.
  if (aIndex >= uBaseParticleCount) vColor *= smoothstep(0.04, 0.7, max(uLogo, uSpiral));
  vColor = mix(vColor, vec3(0.2, 0.54, 1.0) * uEncode, uBeam * 0.7);
  vColor *= 1.0 - smoothstep(0.55, 1.0, uBeam);
}
`;

const dustFragment = `#version 300 es
precision highp float;

uniform float uShape;

in vec3 vColor;
in float vSize;

out vec4 fragColor;

void main() {
  vec2 q = (gl_PointCoord - 0.5) * (vSize + 2.0);
  float half_ = max(vSize * 0.5, 0.5);
  float cover;
  if (uShape < 0.5) {
    vec2 c = clamp(half_ - abs(q) + 0.5, 0.0, 1.0);
    cover = c.x * c.y;
  } else {
    cover = clamp(half_ - length(q) + 0.5, 0.0, 1.0);
  }
  if (cover <= 0.0) discard;
  fragColor = vec4(vColor * cover, 0.0);
}
`;

const stirFragment = `#version 300 es
precision highp float;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform sampler2D tVelocity;
uniform float uDt;
uniform float uReset;
uniform vec4 uBrush;
uniform float uBrushPower;
uniform vec4 uKick;

layout(location = 0) out vec4 outOffset;
layout(location = 1) out vec4 outVelocity;
${hashChunk}
${dustChunk}
vec3 swirl(vec3 p) {
  float t = uDustTime * 0.15;
  vec3 a = vec3(1.7, 1.9, 1.5) * p.yzx + vec3(t, 1.2, 2.1);
  vec3 b = vec3(2.3, 2.1, 2.7) * p.zxy + vec3(0.4, t * 1.3, 0.9);
  vec3 ca = cos(a) * vec3(1.7, 1.9, 1.5);
  vec3 cb = cos(b) * vec3(2.3, 2.1, 2.7);
  return vec3(ca.z - cb.x, cb.y - ca.x, ca.y - cb.z);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  if (uReset > 0.5) {
    outOffset = vec4(0.0);
    outVelocity = vec4(0.0);
    return;
  }
  uint id = uint(cell.y * ${STATE_WIDTH} + cell.x);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  vec3 o = texelFetch(tOffset, cell, 0).xyz;
  vec3 v = texelFetch(tVelocity, cell, 0).xyz;
  float life;
  float spread;
  vec3 base = drift(home, seed, id, life, spread);
  vec3 p = base + o;

  float k = mix(0.8, 2.2, random(id * 7u + 11u)) * mix(1.0, 2.5, uLogo);
  vec3 acc = -k * o - 1.5 * sqrt(k) * v;

  vec2 gap = p.xy - uBrush.xy;
  float touch = exp(-dot(gap, gap) / mix(0.07, 0.014, uLogo)) * uBrushPower;
  acc += (vec3(uBrush.zw, 0.0) - v) * touch * 14.0;
  // The condensed mark still reacts even while the pointer rests on it.
  acc.xy += gap / max(length(gap), 0.035) * touch * uLogo * 0.19;
  float pace = length(v);
  if (pace > 1e-4) {
    vec3 heading = v / pace;
    vec3 curl = swirl(p * 1.6);
    acc += (curl - heading * dot(curl, heading)) * min(pace, 2.0) * 1.8;
  }

  if (uKick.z > 0.0) {
    vec3 jolt = vec3(random(id * 7u + 12u), random(id * 7u + 13u), random(id * 7u + 14u)) - 0.5;
    float near = exp(-dot(p.xy - uKick.xy, p.xy - uKick.xy) / 0.4);
    vec3 spinKick = vec3(-p.z, 0.0, p.x) * 0.9;
    vec3 lift = vec3(0.0, 0.5 + 0.8 * random(id * 7u + 15u), 0.0) * (0.3 + 0.7 * smoothstep(0.2, -0.8, p.y));
    v += (jolt * 0.8 + spinKick + lift) * uKick.z * (0.4 + 0.45 * near);
  }

  v += acc * uDt;
  o += v * uDt;
  vec3 q = base + o;
  float len = length(q);
  if (len > 0.97 && uLogo < 1.0) {
    vec3 n = q / len;
    o -= n * (len - 0.97) * (1.0 - uLogo);
    v -= n * max(dot(v, n), 0.0) * 1.5 * (1.0 - uLogo);
  }
  outOffset = vec4(o, 1.0);
  outVelocity = vec4(v, 1.0);
}
`;

const compositeFragment = `#version 300 es
precision highp float;

uniform sampler2D tScene;
uniform sampler2D tLaser;
uniform float uSceneActive;
uniform float uLaserActive;
uniform float uLight;
uniform float uDecode;

in vec2 vUv;
out vec4 fragColor;

vec3 soften(vec3 x) {
  vec3 over = max(x - 0.6, 0.0);
  return min(x, 0.6) + 0.4 * (1.0 - exp(-over / 0.4));
}

void main() {
  vec4 scene = uSceneActive > 0.5 ? texture(tScene, vUv) : vec4(0.0);
  if (uLaserActive > 0.5) scene += texture(tLaser, vUv);
  scene *= uDecode;
  vec3 light = max(scene.rgb, 0.0);
  float peak = max(light.r, max(light.g, light.b));
  if (uLight > 0.5) {
    vec3 hue = light / max(peak, 1e-4);
    float cover = 1.0 - exp(-peak * 2.4);
    vec3 ink = hue * mix(0.92, 0.72, cover);
    float core = clamp(scene.a * 0.7, 0.0, 1.0) * cover;
    vec3 tint = mix(vec3(1.0), hue, 0.22);
    fragColor = vec4(tint * core + ink * cover * (1.0 - core), core + cover * (1.0 - core));
    return;
  }
  light += vec3(max(peak - 1.8, 0.0) * 0.25);
  vec3 shown = soften(light);
  fragColor = vec4(shown, max(shown.r, max(shown.g, shown.b)));
}
`;

const CrystalizedBall = ({
  preset = 'plasma',
  color,
  theme = 'dark',
  size = 0.7,
  strands,
  crackle,
  flares,
  glow,
  sparks,
  particleCount,
  fill,
  motion,
  particleShape,
  depth,
  sway,
  twinkle,
  haze,
  speed = 1,
  dustSpeed,
  interactive = true,
  logoFollowPointer = false,
  casesScatterPointer = false,
  hoverStrength = 0.7,
  intro = true,
  paused = false,
  framingRef,
  className = '',
  style
}) => {
  const containerRef = useRef(null);
  const settingsRef = useRef(null);
  const wakeRef = useRef(null);

  const base = BALL_PRESETS[preset] || BALL_PRESETS.plasma;
  const pick = (value, key) => (value === undefined || value === null ? base[key] : value);
  const tint = pick(color, 'color');

  const colors = useMemo(() => {
    const light = theme === 'light';
    return { light, palette: buildPalette(parseColor(tint, [0.95, 0.36, 0.82]), light) };
  }, [tint, theme]);

  useEffect(() => {
    settingsRef.current = {
      ...colors,
      size,
      strands: pick(strands, 'strands'),
      crackle: pick(crackle, 'crackle'),
      flares: pick(flares, 'flares'),
      glow: pick(glow, 'glow'),
      sparks: pick(sparks, 'sparks'),
      particleCount: pick(particleCount, 'particleCount'),
      fill: pick(fill, 'fill'),
      motion: pick(motion, 'motion'),
      particleShape: pick(particleShape, 'particleShape'),
      depth: pick(depth, 'depth'),
      sway: pick(sway, 'sway'),
      twinkle: pick(twinkle, 'twinkle'),
      haze: pick(haze, 'haze'),
      dustSpeed: pick(dustSpeed, 'dustSpeed'),
      speed,
      interactive,
      logoFollowPointer,
      casesScatterPointer,
      hoverStrength,
      intro,
      paused,
      framingRef
    };
    wakeRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    } catch {
      container.dataset.fallback = 'true';
      return undefined;
    }
    const gl = renderer.gl;
    if (!renderer.isWebgl2) {
      container.dataset.fallback = 'true';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return undefined;
    }
    const canvas = gl.canvas;
    gl.clearColor(0, 0, 0, 0);
    // Every pass is one screen-space mesh with no camera or scene transforms.
    const renderPass = (scene, target = null, clear = false) => renderer.render({
      scene, target, clear, update: false, sort: false, frustumCull: false
    });
    delete container.dataset.fallback;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const fullFloat = !!gl.getExtension('EXT_color_buffer_float');
    const halfFloat = fullFloat || !!gl.getExtension('EXT_color_buffer_half_float');
    const encode = halfFloat ? 1 : 0.25;
    const geometry = new Triangle(gl);
    const blank = new Texture(gl);
    const strandData = buildStrands();

    const sceneTarget = new RenderTarget(gl, {
      width: 1,
      height: 1,
      depth: false,
      type: halfFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      format: gl.RGBA,
      internalFormat: halfFloat ? gl.RGBA16F : gl.RGBA,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST
    });

    // The soft beam/fog gets its own bounded surface. Particle scenes retain
    // their original resolution, and text/cards never pass through this buffer.
    const laserTarget = new RenderTarget(gl, {
      width: 1, height: 1, depth: false,
      type: halfFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      format: gl.RGBA,
      internalFormat: halfFloat ? gl.RGBA16F : gl.RGBA,
      minFilter: gl.LINEAR, magFilter: gl.LINEAR,
    });

    const arcData = new Array(MAX_ARCS * 4).fill(0);
    const fieldUniforms = {
      uCenter: { value: [0, 0] },
      uRadius: { value: 1 },
      uDetailRadius: { value: 1 },
      uRimVisibility: { value: 1 },
      uDpr: { value: 1 },
      uLine: { value: 0.6 },
      uTime: { value: 0 },
      uFrame: { value: 0 },
      uBins: { value: 420 },
      uStrands: { value: 5 },
      uCrackle: { value: 0.6 },
      uFlares: { value: 0.5 },
      uGlow: { value: 0.8 },
      uHaze: { value: 0.7 },
      uFill: { value: 0.5 },
      uPresence: { value: 0 },
      uUnfold: { value: 0 },
      uBloom: { value: 0 },
      uInside: { value: 0 },
      uEncode: { value: encode },
      uRim: { value: [1, 1, 1] },
      uRimHot: { value: [1, 1, 1] },
      uRimMid: { value: [1, 1, 1] },
      uRimDeep: { value: [1, 1, 1] },
      uSpark: { value: [1, 1, 1] },
      uSparkGlow: { value: [1, 1, 1] },
      uHazeColor: { value: [0, 0, 0] },
      uEdgeColor: { value: [0, 0, 0] },
      uHeat: { value: [0, 0, 0, 0] },
      uHarmonics: { value: strandData.harmonics },
      uRates: { value: strandData.rates },
      uPhases: { value: strandData.phases },
      uFlareHarmonics: { value: strandData.flareHarmonics },
      uFlareRates: { value: strandData.flareRates },
      uFlarePhases: { value: strandData.flarePhases },
      uArcs: { value: arcData }
    };

    const dustShared = {
      uDustTime: { value: 0 },
      uTurn: { value: [0, 0] },
      uMotion: { value: 0 },
      uGalaxy: { value: 0 },
      uLogo: { value: 0 },
      uSpiral: { value: 0 },
      uSpiralScale: { value: [1, 1] },
      uBeam: { value: 0 },
      uBeamScale: { value: [1, 1] },
      uCasesSpread: { value: 0 },
      uCasesSideLimit: { value: [0.6, 0.6] },
      uCasesPointer: { value: [0, 0, 0, 0.15] },
      uCasesFlowTime: { value: 0 },
      uLogoOffset: { value: [0, 0] },
      uLogoScale: { value: 1 },
      uLogoLook: { value: [0, 0] },
      uFill: fieldUniforms.uFill,
      tHome: { value: blank },
      tSeed: { value: blank },
      tLogo: { value: blank },
      tLogoTint: { value: blank }
    };

    const dustUniforms = {
      ...dustShared,
      tOffset: { value: blank },
      uStirred: { value: 0 },
      uCenter: fieldUniforms.uCenter,
      uViewport: { value: [1, 1] },
      uRadius: fieldUniforms.uRadius,
      uDpr: fieldUniforms.uDpr,
      uDepth: { value: 0.6 },
      uTwinkle: { value: 0.5 },
      uPointScale: { value: 1 },
      uLogoPointScale: { value: 1 },
      uBaseParticleCount: { value: 0 },
      uReveal: { value: 0 },
      uEncode: { value: encode },
      uTones: { value: new Array(15).fill(1) },
      uRimTone: { value: [1, 1, 1] },
      uShape: { value: 0 }
    };

    const stirUniforms = {
      ...dustShared,
      tOffset: { value: blank },
      tVelocity: { value: blank },
      uDt: { value: 0.016 },
      uReset: { value: 1 },
      uBrush: { value: [0, 0, 0, 0] },
      uBrushPower: { value: 0 },
      uKick: { value: [0, 0, 0, 0] }
    };

    const compositeUniforms = {
      tScene: { value: sceneTarget.texture },
      tLaser: { value: laserTarget.texture },
      uSceneActive: { value: 1 },
      uLaserActive: { value: 0 },
      uLight: { value: 0 },
      uDecode: { value: 1 / encode }
    };

    const additive = program => {
      program.setBlendFunc(gl.ONE, gl.ONE);
      return program;
    };

    const laserUniforms = createLaserFlowUniforms(encode);
    const laserMesh = new Mesh(gl, {
      geometry,
      program: additive(new Program(gl, {
        vertex: passVertex, fragment: laserFlowFragment, uniforms: laserUniforms,
        transparent: true, depthTest: false, depthWrite: false,
      })),
    });

    const fieldMesh = new Mesh(gl, {
      geometry,
      program: additive(
        new Program(gl, {
          vertex: passVertex,
          fragment: fieldFragment,
          uniforms: fieldUniforms,
          transparent: true,
          depthTest: false,
          depthWrite: false
        })
      )
    });
    const dustProgram = additive(
      new Program(gl, {
        vertex: dustVertex,
        fragment: dustFragment,
        uniforms: dustUniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false
      })
    );
    const stirMesh = halfFloat
      ? new Mesh(gl, {
          geometry,
          program: new Program(gl, {
            vertex: passVertex,
            fragment: stirFragment,
            uniforms: stirUniforms,
            depthTest: false,
            depthWrite: false
          })
        })
      : null;
    const compositeMesh = new Mesh(gl, {
      geometry,
      program: new Program(gl, {
        vertex: passVertex,
        fragment: compositeFragment,
        uniforms: compositeUniforms,
        depthTest: false,
        depthWrite: false
      })
    });

    const disposeTarget = target => {
      if (!target) return;
      gl.deleteFramebuffer(target.buffer);
      target.textures.forEach(texture => gl.deleteTexture(texture.texture));
    };

    const stateTarget = rows =>
      new RenderTarget(gl, {
        width: STATE_WIDTH,
        height: rows,
        color: 2,
        depth: false,
        type: fullFloat ? gl.FLOAT : gl.HALF_FLOAT,
        format: gl.RGBA,
        internalFormat: fullFloat ? gl.RGBA32F : gl.RGBA16F,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST
      });

    const dataTexture = (data, rows) =>
      new Texture(gl, {
        image: data,
        width: STATE_WIDTH,
        height: rows,
        type: gl.FLOAT,
        format: gl.RGBA,
        internalFormat: gl.RGBA32F,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        generateMipmaps: false,
        flipY: false
      });

    let dust = null;
    let logoMask = null;
    const logoImage = new Image();
    container.dataset.logoReady = 'false';
    container.dataset.logoProgress = '0';

    const disposeDust = () => {
      if (!dust) return;
      dust.mesh.geometry.remove();
      gl.deleteTexture(dust.home.texture);
      gl.deleteTexture(dust.seed.texture);
      gl.deleteTexture(dust.logo.texture);
      gl.deleteTexture(dust.logoTint.texture);
      disposeTarget(dust.read);
      disposeTarget(dust.write);
      dust = null;
    };

    const resetStir = () => {
      if (!stirMesh || !dust || !dust.read || !dust.write) return;
      stirUniforms.tOffset.value = blank;
      stirUniforms.tVelocity.value = blank;
      stirUniforms.uReset.value = 1;
      renderPass(stirMesh, dust.read);
      renderPass(stirMesh, dust.write);
      stirUniforms.uReset.value = 0;
    };

    const rebuildDust = requested => {
      const total = clamp(Math.round(requested / 100) * 100, 0, MAX_PARTICLES);
      if (dust && dust.requested === total) return;
      disposeDust();
      if (!total) {
        dust = null;
        return;
      }
      const data = buildDust(total + LOGO_EXTRA_PARTICLES);
      const logo = buildLogoData(data.count, data.rows, logoMask);
      const indices = new Float32Array(data.count);
      for (let i = 0; i < data.count; i++) indices[i] = i;
      const points = new Geometry(gl, { aIndex: { size: 1, data: indices } });
      dust = {
        requested: total,
        count: data.count,
        rows: data.rows,
        home: dataTexture(data.home, data.rows),
        seed: dataTexture(data.seed, data.rows),
        logo: dataTexture(logo.positions, data.rows),
        logoTint: dataTexture(logo.colors, data.rows),
        mesh: new Mesh(gl, { mode: gl.POINTS, geometry: points, program: dustProgram }),
        read: stirMesh ? stateTarget(data.rows) : null,
        write: stirMesh ? stateTarget(data.rows) : null
      };
      dustShared.tHome.value = dust.home;
      dustShared.tSeed.value = dust.seed;
      dustShared.tLogo.value = dust.logo;
      dustShared.tLogoTint.value = dust.logoTint;
      dustUniforms.uBaseParticleCount.value = total;
      points.setDrawRange(0, Math.min(total, data.count));
      resetStir();
      stirring = 0;
    };

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionPreference.matches;
    const random = seeded(913);

    let width = 1;
    let height = 1;
    const defaultCenter = [0.5, 0.5];
    const reportedProgress = { logoProgress: NaN, spiralProgress: NaN, beamProgress: NaN, casesSpread: NaN };
    const reportProgress = (key, value) => {
      if (reportedProgress[key] === value) return;
      reportedProgress[key] = value;
      const shown = value.toFixed(3);
      if (container.dataset[key] !== shown) container.dataset[key] = shown;
    };
    let lastParticleSetting;
    let lastPalette;
    let lastPassMask = -1;
    let lastDrawCount = -1;
    let raf = 0;
    let last = performance.now();
    let rimTime = 0;
    let dustTime = 0;
    let casesFlowTime = 0;
    let casesScatter = 0;
    let swayClock = 0;
    let introClock = 0;
    let visible = true;
    let alive = true;
    let surge = 0;
    let stirring = 0;
    let stirEnergy = 0;
    let previousLogo = 0;
    let kick = null;
    let nextArc = 0.3;
    const arcs = [];
    const pointer = { x: 0, y: 0, inside: false, fresh: true, background: false };
    const heat = { angle: 0, velocity: 0, power: 0, near: 0 };
    const brush = { x: 0, y: 0, vx: 0, vy: 0 };
    const look = { x: 0, y: 0, vx: 0, vy: 0 };
    const logoLook = { x: 0, y: 0 };

    const resize = () => {
      const nextWidth = Math.max(1, container.clientWidth);
      const nextHeight = Math.max(1, container.clientHeight);
      // Never enlarge a sub-resolution canvas on a large display.
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(PIXEL_BUDGET / (nextWidth * nextHeight))));
      if (width !== nextWidth || height !== nextHeight || renderer.dpr !== nextDpr ||
          canvas.width !== Math.floor(nextWidth * nextDpr) || canvas.height !== Math.floor(nextHeight * nextDpr)) {
        width = nextWidth;
        height = nextHeight;
        renderer.dpr = nextDpr;
        renderer.setSize(width, height);
        sceneTarget.setSize(canvas.width, canvas.height);
        defaultCenter[0] = width * 0.5;
        defaultCenter[1] = height * 0.5;
        setVec2(dustUniforms.uViewport, width, height);
        const laserScale = Math.min(window.devicePixelRatio || 1, 1, 1280 / width, 800 / height);
        laserTarget.setSize(Math.max(1, Math.round(width * laserScale)), Math.max(1, Math.round(height * laserScale)));
        setVec3(laserUniforms.iResolution, laserTarget.width, laserTarget.height, laserScale);
        if (import.meta.env.DEV) container.dataset.laserResolution = `${laserTarget.width}x${laserTarget.height}`;
      }
      start();
    };

    const spawnArc = (angle, strength) => {
      if (arcs.length >= MAX_ARCS) return;
      arcs.push({
        start: angle,
        span: (0.05 + random() * 0.07) * (random() < 0.5 ? -1 : 1),
        curl: 0.02 + random() * 0.04,
        life: 0,
        duration: 0.2 + random() * 0.2,
        drift: (random() - 0.5) * 0.3,
        strength
      });
    };

    const frame = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      if (!s) return;

      const moving = !s.paused && !reducedMotion;
      introClock = s.intro && !reducedMotion ? Math.min(1, introClock + dt / INTRO_SECONDS) : 1;
      const presence = easeOut(smooth(0, 0.42, introClock));
      const unfold = easeOut(smooth(0, 0.32, introClock));
      const charge = Math.sin(Math.PI * smooth(0.22, 0.78, introClock)) * 0.35;
      // Reframe the existing simulation without recreating its particles or clock.
      const framing = s.framingRef?.current;
      const radius = framing?.radius ?? Math.max(8, (clamp(s.size, 0.1, 1.5) * Math.min(width, height)) / 2);
      const center = framing?.center ?? defaultCenter;
      const logoAmount = logoMask ? clamp(framing?.logo ?? 0, 0, 1) : 0;
      const spiralAmount = clamp(framing?.spiral ?? 0, 0, 1);
      const beamAmount = clamp(framing?.beam ?? 0, 0, 1);
      const casesSpread = clamp(framing?.casesSpread ?? 0, 0, 1);
      const logoCenter = framing?.logoCenter ?? defaultCenter;
      const logoWidth = framing?.logoWidth ?? Math.min(width * 0.82, height * 1.65);
      const scatteringCases = moving && s.casesScatterPointer && pointer.inside && pointer.background;
      const scatterTarget = scatteringCases ? 1 : 0;
      casesScatter += (scatterTarget - casesScatter) * (moving ? 1 - Math.exp(-dt / (scatteringCases ? 0.1 : 0.3)) : 1);
      // Cursor interaction stays local; it must not accelerate both logo wings.
      if (moving) casesFlowTime += dt * Math.max(0, s.dustSpeed);
      dustShared.uCasesFlowTime.value = casesFlowTime;
      setVec4(dustShared.uCasesPointer, (pointer.x - logoCenter[0]) / logoWidth,
        (height - pointer.y - logoCenter[1]) / logoWidth, casesScatter,
        CASES_POINTER_RADIUS / logoWidth);
      const followingLogo = moving && s.logoFollowPointer && pointer.inside && logoAmount > 0;
      const logoLookX = followingLogo ? clamp((pointer.x - logoCenter[0]) / (width * 0.5), -1, 1) : 0;
      const logoLookY = followingLogo ? clamp((height - pointer.y - logoCenter[1]) / (height * 0.5), -1, 1) : 0;
      const logoFollow = moving ? 1 - Math.exp(-dt / (followingLogo ? 0.16 : 0.24)) : 1;
      logoLook.x += (logoLookX - logoLook.x) * logoFollow;
      logoLook.y += (logoLookY - logoLook.y) * logoFollow;
      dustShared.uLogoLook.value[0] = logoLook.x;
      dustShared.uLogoLook.value[1] = logoLook.y;
      dustShared.uLogo.value = logoAmount;
      dustShared.uSpiral.value = spiralAmount;
      dustShared.uBeam.value = beamAmount;
      setVec2(dustShared.uBeamScale, width / radius, height / radius);
      dustShared.uCasesSpread.value = casesSpread;
      setVec2(dustShared.uCasesSideLimit, (logoCenter[0] - width * 0.025) / logoWidth,
        (width * 0.975 - logoCenter[0]) / logoWidth);
      setVec2(dustShared.uSpiralScale, framing?.spiralScale?.[0] ?? width * .62 / radius,
        framing?.spiralScale?.[1] ?? height * .9 / radius);
      setVec2(dustShared.uLogoOffset, (logoCenter[0] - center[0]) / radius, (logoCenter[1] - center[1]) / radius);
      dustShared.uLogoScale.value = logoWidth / radius;
      dustUniforms.uLogoPointScale.value = clamp(logoWidth / 1200, 0.8, 1.3);
      reportProgress('logoProgress', logoAmount);
      reportProgress('spiralProgress', spiralAmount);
      reportProgress('beamProgress', beamAmount);
      reportProgress('casesSpread', casesSpread);
      if (logoAmount > 0 && previousLogo === 0) {
        resetStir();
        stirring = 0;
        stirEnergy = 0;
        kick = null;
      }
      previousLogo = logoAmount;

      const strength = s.interactive && !reducedMotion && logoAmount === 0 ? clamp(s.hoverStrength, 0, 1) : 0;
      const px = pointer.x - center[0];
      const py = height - center[1] - pointer.y;
      const reach = Math.hypot(px, py);
      const target = pointer.inside ? strength : 0;
      if (heat.power < 0.02) {
        heat.angle = Math.atan2(py, px);
        heat.velocity = 0;
      }
      const turn = wrapAngle(Math.atan2(py, px) - heat.angle);
      heat.velocity += (120 * turn - 19 * heat.velocity) * dt;
      heat.angle = wrapAngle(heat.angle + heat.velocity * dt);
      heat.power += (target - heat.power) * (1 - Math.exp(-dt / (target > heat.power ? 0.3 : 0.55)));
      const nearTarget = Math.exp(-Math.pow((reach - radius) / (radius * 0.45), 2));
      heat.near += (nearTarget - heat.near) * (1 - Math.exp(-dt / 0.15));
      surge *= Math.exp(-dt / 0.7);

      const bx = px / radius;
      const by = py / radius;
      if (Math.hypot(bx - brush.x, by - brush.y) > 0.6) pointer.fresh = true;
      if (pointer.fresh) {
        brush.x = bx;
        brush.y = by;
        brush.vx = 0;
        brush.vy = 0;
        pointer.fresh = false;
      }
      const follow = 1 - Math.exp(-dt / 0.05);
      brush.vx += ((bx - brush.x) / dt - brush.vx) * follow;
      brush.vy += ((by - brush.y) / dt - brush.vy) * follow;
      brush.x = bx;
      brush.y = by;
      const brushSpeed = Math.hypot(brush.vx, brush.vy);
      const cap = brushSpeed > 4 ? 4 / brushSpeed : 1;
      const inBall = Math.exp(-Math.max(0, Math.hypot(bx, by) - 1) * 6);
      const brushPower = pointer.inside ? strength * inBall * presence : 0;
      stirEnergy = stirEnergy * Math.exp(-dt / 1.2) + brushPower * Math.min(brushSpeed, 4) * dt;

      if (moving) {
        const pace = 1 + surge * 0.6 + heat.power * heat.near * 0.3;
        const step = dt * Math.max(0, s.speed) * 2 * pace;
        rimTime += step;
        dustTime += dt * Math.max(0, s.dustSpeed) * (1 + surge * 0.4);
        swayClock += dt * Math.max(0, s.dustSpeed);
        const crackleNow = clamp(s.crackle + surge * 0.5, 0, 1.5);
        if (s.sparks > 0.01 && introClock > 0.55) {
          nextArc -= step * s.sparks * 2 * (0.6 + crackleNow * 0.6);
          if (nextArc <= 0) {
            const local = heat.power * heat.near;
            const angle =
              random() < local * 0.7
                ? heat.angle + (random() - 0.5) * 0.8
                : random() < 0.7
                  ? Math.PI / 2 + (random() - 0.5) * 1.5
                  : random() * Math.PI * 2;
            spawnArc(angle, 0.8 + local * 0.6 + surge * 0.4);
            nextArc = 0.15 + random() * 0.6;
          }
        }
        for (let i = arcs.length - 1; i >= 0; i--) {
          const arc = arcs[i];
          arc.life += step;
          arc.start += arc.drift * step;
          if (arc.life >= arc.duration) arcs.splice(i, 1);
        }
      } else {
        arcs.length = 0;
      }
      for (let i = 0; i < MAX_ARCS; i++) {
        const arc = arcs[i];
        arcData[i * 4] = arc ? arc.start : 0;
        arcData[i * 4 + 1] = arc ? arc.span : 0;
        arcData[i * 4 + 2] = arc ? arc.curl : 0;
        arcData[i * 4 + 3] = arc ? Math.sin((Math.PI * arc.life) / arc.duration) * arc.strength : 0;
      }

      if (lastParticleSetting !== s.particleCount) {
        rebuildDust(s.particleCount);
        lastParticleSetting = s.particleCount;
      }
      if (dust) {
        const count = logoAmount > 0 || spiralAmount > 0 ? dust.count : Math.min(dust.requested, dust.count);
        if (dust.mesh.geometry.drawRange.count !== count) dust.mesh.geometry.setDrawRange(0, count);
      }
      const palette = s.palette;

      fieldUniforms.uCenter.value = center;
      fieldUniforms.uRadius.value = radius;
      const detailRadius = framing?.detailRadius ?? radius;
      fieldUniforms.uDetailRadius.value = detailRadius;
      fieldUniforms.uRimVisibility.value = framing?.rimVisibility ?? 1;
      fieldUniforms.uDpr.value = renderer.dpr;
      fieldUniforms.uLine.value = Math.max(0.6, detailRadius * 0.0035);
      fieldUniforms.uTime.value = rimTime;
      fieldUniforms.uFrame.value = Math.floor(rimTime * 24) % 100000;
      fieldUniforms.uBins.value = clamp(Math.round((Math.PI * 2 * radius) / 2.6), 240, 8192);
      fieldUniforms.uStrands.value = Math.round(clamp(s.strands, 1, MAX_STRANDS));
      fieldUniforms.uCrackle.value = clamp(s.crackle, 0, 1) + surge * 0.5 + charge;
      fieldUniforms.uFlares.value = clamp(s.flares, 0, 1);
      fieldUniforms.uGlow.value = clamp(s.glow, 0, 2) * (1 + surge * 0.5 + charge) * (s.light ? 0.35 : 1);
      fieldUniforms.uHaze.value = clamp(s.haze, 0, 2) * (s.light ? 0.6 : 1);
      fieldUniforms.uFill.value = clamp(s.fill, 0, 1);
      fieldUniforms.uPresence.value = presence;
      fieldUniforms.uUnfold.value = unfold;
      fieldUniforms.uBloom.value = presence * presence;
      fieldUniforms.uInside.value = smooth(0.2, 0.95, introClock) * (1 - Math.max(logoAmount, spiralAmount));
      fieldUniforms.uRim.value = palette.rim;
      fieldUniforms.uRimHot.value = palette.rimHot;
      fieldUniforms.uRimMid.value = palette.rimMid;
      fieldUniforms.uRimDeep.value = palette.rimDeep;
      fieldUniforms.uSpark.value = palette.spark;
      fieldUniforms.uSparkGlow.value = palette.sparkGlow;
      fieldUniforms.uHazeColor.value = palette.haze;
      fieldUniforms.uEdgeColor.value = palette.edge;
      setVec4(fieldUniforms.uHeat, heat.angle, heat.near, heat.power * presence, 0);

      dustShared.uDustTime.value = dustTime;
      dustShared.uGalaxy.value = framing?.galaxy ?? 0;
      const gaze = pointer.inside ? strength * presence : 0;
      const lookX = clamp(bx, -1.6, 1.6) * gaze;
      const lookY = clamp(by, -1.6, 1.6) * gaze;
      look.vx += (40 * (lookX - look.x) - 11 * look.vx) * dt;
      look.vy += (40 * (lookY - look.y) - 11 * look.vy) * dt;
      look.x += look.vx * dt;
      look.y += look.vy * dt;
      const swing = clamp(s.sway, 0, 1);
      setVec2(dustShared.uTurn,
        swing * 0.42 * Math.sin(swayClock * 0.23) + look.x * 0.3,
        swing * 0.12 * Math.sin(swayClock * 0.17 + 1.3) - look.y * 0.16
      );
      dustShared.uMotion.value = MOTIONS[s.motion] ?? 0;
      dustUniforms.uDepth.value = clamp(s.depth, 0, 1);
      dustUniforms.uTwinkle.value = clamp(s.twinkle, 0, 1);
      dustUniforms.uPointScale.value = Math.max(1, (framing?.pointRadius ?? radius) / 491);
      dustUniforms.uReveal.value = smooth(0.18, 1, introClock);
      if (lastPalette !== palette) {
        dustUniforms.uTones.value = palette.tones.flat();
        lastPalette = palette;
      }
      dustUniforms.uRimTone.value = palette.rim;
      dustUniforms.uShape.value = SHAPES[s.particleShape] ?? 0;

      const layer = dust;
      if (layer && stirMesh && logoAmount === 0 && (stirEnergy > 0.002 || kick)) stirring = SETTLE_SECONDS;
      let stirred = false;
      if (layer && layer.read && layer.write && stirMesh && stirring > 0 && logoAmount === 0) {
        stirUniforms.uDt.value = Math.min(dt, 1 / 30);
        setVec4(stirUniforms.uBrush, brush.x, brush.y, brush.vx * cap, brush.vy * cap);
        stirUniforms.uBrushPower.value = brushPower;
        setVec4(stirUniforms.uKick, kick?.x ?? 0, kick?.y ?? 0, kick?.strength ?? 0, 0);
        stirUniforms.tOffset.value = layer.read.textures[0];
        stirUniforms.tVelocity.value = layer.read.textures[1];
        renderPass(stirMesh, layer.write);
        const swap = layer.read;
        layer.read = layer.write;
        layer.write = swap;
        stirring -= dt;
        stirred = stirring > 0;
        if (!stirred) {
          stirring = 0;
          resetStir();
        }
      }
      kick = null;
      dustUniforms.uStirred.value = stirred ? 1 : 0;
      dustUniforms.tOffset.value = layer && layer.read ? layer.read.textures[0] : blank;

      // These passes are additive. A hidden rim plus an empty interior, and
      // the laser's zero-fade interval, both contribute exactly vec4(0).
      const drawField = beamAmount < 1 &&
        (fieldUniforms.uRimVisibility.value > 0 || fieldUniforms.uInside.value > 0);
      const drawDust = beamAmount < 1 && Boolean(dust);
      const laserFade = smooth(0.45, 1, beamAmount);
      const drawLaser = laserFade > 0;
      if (drawField) renderPass(fieldMesh, sceneTarget, true);
      if (drawDust) renderPass(dust.mesh, sceneTarget, !drawField);
      if (drawLaser) {
        laserUniforms.uFlowTime.value = dustTime;
        laserUniforms.uFogTime.value = dustTime;
        laserUniforms.uFade.value = laserFade;
        renderPass(laserMesh, laserTarget, true);
      }

      compositeUniforms.uSceneActive.value = drawField || drawDust ? 1 : 0;
      compositeUniforms.uLaserActive.value = drawLaser ? 1 : 0;
      compositeUniforms.uLight.value = s.light ? 1 : 0;
      renderPass(compositeMesh);

      if (import.meta.env.DEV) {
        const passMask = Number(drawField) | (Number(drawDust) << 1) | (Number(drawLaser) << 2);
        if (passMask !== lastPassMask) {
          container.dataset.renderPasses = [drawField && 'field', drawDust && 'dust', drawLaser && 'laser', 'composite'].filter(Boolean).join(',');
          lastPassMask = passMask;
        }
        const drawCount = drawDust ? dust.mesh.geometry.drawRange.count : 0;
        if (drawCount !== lastDrawCount) {
          container.dataset.drawnParticles = String(drawCount);
          lastDrawCount = drawCount;
        }
      }

      const settling =
        Math.abs(target - heat.power) > 0.002 ||
        surge > 0.002 ||
        stirring > 0 ||
        Math.abs(heat.velocity) > 0.01 ||
        Math.hypot(logoLook.x - logoLookX, logoLook.y - logoLookY) > 0.001 ||
        Math.abs(casesScatter - scatterTarget) > 0.001 ||
        Math.hypot(look.vx, look.vy, look.x - lookX, look.y - lookY) > 0.001;
      if (visible && !document.hidden && !s.paused && (moving || introClock < 1 || settling)) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible || !alive || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const locate = e => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };

    const onPointerMove = e => {
      const s = settingsRef.current;
      if (!s || (!s.interactive && !s.logoFollowPointer && !s.casesScatterPointer) || s.paused || reducedMotion) return;
      if ((s.logoFollowPointer || s.casesScatterPointer) && e.pointerType === 'touch') { onPointerLeave(); return; }
      if ((s.framingRef?.current?.logo ?? 0) > 0 && !s.logoFollowPointer && !s.casesScatterPointer) return;
      const spot = locate(e);
      if (spot.inside && !pointer.inside) pointer.fresh = true;
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.inside = spot.inside;
      pointer.background = !e.target.closest?.('.student-case__ticket, .student-case__meta, .student-cases-page__intro, .student-cases-page__footer, .site-header, dialog, a, button');
      if (spot.inside) start();
    };

    const onPointerDown = e => {
      const s = settingsRef.current;
      const spot = locate(e);
      if (!s || !s.interactive || s.paused || reducedMotion || !spot.inside) return;
      if ((s.framingRef?.current?.logo ?? 0) > 0) return;
      if (!pointer.inside) pointer.fresh = true;
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.inside = true;
      const framing = s.framingRef?.current;
      const radius = framing?.radius ?? Math.max(8, (clamp(s.size, 0.1, 1.5) * Math.min(width, height)) / 2);
      const center = framing?.center ?? [width / 2, height / 2];
      const kx = (spot.x - center[0]) / radius;
      const ky = (height - center[1] - spot.y) / radius;
      const distance = Math.hypot(kx, ky);
      if (distance > 1.3) return;
      const strength = clamp(s.hoverStrength, 0, 1);
      kick = { x: kx, y: ky, strength: strength * 1.2 };
      surge = Math.max(surge, strength);
      const angle = Math.atan2(ky, kx);
      spawnArc(angle + (random() - 0.5) * 0.5, 1.3);
      spawnArc(angle + Math.PI + (random() - 0.5) * 1.2, 1.1);
      start();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      start();
    };

    const onPointerOut = e => {
      if (!e.relatedTarget) onPointerLeave();
    };

    const onPointerUp = e => {
      if (e.pointerType === 'touch') onPointerLeave();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else start();
    };

    const onMotionPreference = () => { reducedMotion = motionPreference.matches; start(); };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    motionPreference.addEventListener('change', onMotionPreference);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    intersectionObserver.observe(container);

    wakeRef.current = start;
    logoImage.onload = () => {
      if (!alive) return;
      logoMask = sampleLogo(logoImage);
      container.dataset.logoReady = logoMask ? 'true' : 'false';
      if (logoMask && dust) {
        const data = buildLogoData(dust.count, dust.rows, logoMask);
        dust.logo.image = data.positions;
        dust.logo.needsUpdate = true;
        dust.logoTint.image = data.colors;
        dust.logoTint.needsUpdate = true;
      }
      start();
    };
    logoImage.src = '/assets/huake-logo-particles.png';
    resize();

    return () => {
      alive = false;
      visible = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      motionPreference.removeEventListener('change', onMotionPreference);
      wakeRef.current = null;
      logoImage.onload = null;
      disposeDust();
      disposeTarget(sceneTarget);
      disposeTarget(laserTarget);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className={`crystalized-ball ${className}`.trim()} style={style} />;
};

export default CrystalizedBall;
