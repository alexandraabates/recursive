import sharp from 'sharp';

const DEPTH = 9;
const ROTATION = 12;
const SCALE = 0.62;
const W = 1200, H = 630;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 4294967296; };
}

function recursiveFrames(depth, maxDepth) {
  if (depth > maxDepth) return '';
  const S = 450;
  const strokeOpacity = Math.max(0.08, 1 - (depth / maxDepth) * 0.85);
  const child = depth < maxDepth
    ? `<g transform="rotate(${ROTATION}) scale(${SCALE})">${recursiveFrames(depth + 1, maxDepth)}</g>`
    : '';
  return `<rect x="${-S}" y="${-S}" width="${S * 2}" height="${S * 2}" fill="none" stroke="rgba(255,238,200,${strokeOpacity.toFixed(3)})" stroke-width="2.5"/>${child}`;
}

function minFrame(depth, maxDepth) {
  if (depth > maxDepth) return '';
  const child = depth < maxDepth
    ? `<g transform="rotate(${ROTATION}) scale(${SCALE})">${minFrame(depth + 1, maxDepth)}</g>`
    : '';
  return `<rect x="-1" y="-1" width="2" height="2" fill="none" stroke="rgba(255,238,200,0.92)" stroke-width="0.045"/>${child}`;
}

const rng = makeRng(1337);
const clusters = Array.from({ length: 22 }, () => ({
  x: rng() * 100,
  y: rng() * 100,
  size: 55 + rng() * 130,
  opacity: 0.07 + rng() * 0.11,
  depth: 2 + Math.floor(rng() * 3),
  rotation: rng() * 360,
}));

const clustersSVG = clusters.map(c => {
  const cx = (c.x / 100) * W;
  const cy = (c.y / 100) * H;
  return `<g transform="translate(${cx}, ${cy}) rotate(${c.rotation.toFixed(1)})" opacity="${c.opacity.toFixed(3)}">
    <svg x="${-c.size / 2}" y="${-c.size / 2}" width="${c.size}" height="${c.size}" viewBox="-1.15 -1.15 2.3 2.3" overflow="visible">
      ${minFrame(0, c.depth)}
    </svg>
  </g>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#120a04"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${clustersSVG}
  <g transform="translate(${W / 2}, ${H / 2}) rotate(${-ROTATION / 2})">
    ${recursiveFrames(0, DEPTH)}
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png');

console.log('Generated public/og-image.png');
