// Demo pictures, drawn in code. SVG stays sharp at any zoom, so the small
// labels only become readable when you zoom in, which is the point of the demo.
// No real photos, of people or anything else, are used.

const W = 1600;
const H = 1200;

/** Small deterministic random numbers, so both pictures of a pair line up. */
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const svg = (body: string, background: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(W)} ${String(H)}" width="${String(W)}" height="${String(H)}" font-family="system-ui, sans-serif"><rect width="${String(W)}" height="${String(H)}" fill="${background}"/>${body}</svg>`
  );

export interface Month {
  name: string;
  /** 0 is bare soil, 1 is high summer. */
  growth: number;
}

export const MARCH: Month = { name: 'March', growth: 0.15 };
export const MAY: Month = { name: 'May', growth: 0.55 };
export const JULY: Month = { name: 'July', growth: 1 };
export const MONTHS: readonly Month[] = [MARCH, MAY, JULY];

const BEDS = [
  { x: 120, y: 120, w: 560, h: 380, crop: 'Carrots', hue: 28 },
  { x: 920, y: 120, w: 560, h: 380, crop: 'Lettuce', hue: 105 },
  { x: 120, y: 700, w: 560, h: 380, crop: 'Sunflowers', hue: 48 },
  { x: 920, y: 700, w: 560, h: 380, crop: 'Strawberries', hue: 355 },
];

/** A vegetable garden seen from above, at one month of the year. */
export function garden(month: Month): string {
  const g = month.growth;
  let body = '';
  // Paths between the beds.
  body += `<rect x="740" y="0" width="120" height="${String(H)}" fill="#d8c7a3"/>`;
  body += `<rect x="0" y="560" width="${String(W)}" height="80" fill="#d8c7a3"/>`;
  for (let i = 0; i < 60; i++) {
    const r = random(900 + i);
    body += `<circle cx="${String(740 + r() * 120)}" cy="${String(r() * H)}" r="${String(2 + r() * 4)}" fill="#bfae8a"/>`;
  }
  BEDS.forEach((bed, b) => {
    body += `<rect x="${String(bed.x)}" y="${String(bed.y)}" width="${String(bed.w)}" height="${String(bed.h)}" rx="18" fill="#6b4f3a" stroke="#4d3727" stroke-width="6"/>`;
    // Rows of plants: the same seed every month, so each plant stays put and grows.
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 9; col++) {
        const r = random(b * 1000 + row * 50 + col);
        const cx = bed.x + 40 + col * ((bed.w - 80) / 8) + (r() - 0.5) * 10;
        const cy = bed.y + 50 + row * ((bed.h - 100) / 4) + (r() - 0.5) * 10;
        const size = (6 + r() * 6) * (0.35 + g * 1.9);
        if (r() > 0.25 + g * 0.75) continue; // seedlings come up over the months
        body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size.toFixed(1)}" fill="hsl(${String(112 + r() * 20)} 45% ${String(34 + r() * 10)}%)"/>`;
        body += `<circle cx="${(cx - size * 0.3).toFixed(1)}" cy="${(cy - size * 0.3).toFixed(1)}" r="${(size * 0.45).toFixed(1)}" fill="hsl(118 50% 52%)" opacity="0.7"/>`;
        if (g > 0.5 && r() < g - 0.35) {
          // Flowers or fruit, only in summer. Tiny: zoom in to see them.
          body += `<circle cx="${(cx + size * 0.35).toFixed(1)}" cy="${(cy + size * 0.2).toFixed(1)}" r="${(2.5 + g * 2).toFixed(1)}" fill="hsl(${String(bed.hue)} 85% 55%)"/>`;
        }
      }
    }
    // A label stake. The small print is readable only when zoomed.
    body += `<rect x="${String(bed.x + 16)}" y="${String(bed.y + bed.h - 58)}" width="190" height="42" rx="6" fill="#fdf8ec" stroke="#4d3727" stroke-width="2"/>`;
    body += `<text x="${String(bed.x + 28)}" y="${String(bed.y + bed.h - 32)}" font-size="17" font-weight="600" fill="#2b2b2b">${bed.crop}</text>`;
    body += `<text x="${String(bed.x + 28)}" y="${String(bed.y + bed.h - 20)}" font-size="8" fill="#555">Bed ${String(b + 1)} · sown 1 March · ${month.name}</text>`;
  });
  // A little compass rose with fine print.
  body += `<g transform="translate(800 600)"><circle r="46" fill="#fdf8ec" stroke="#4d3727" stroke-width="3"/><path d="M0 -38 L8 0 L0 38 L-8 0 Z" fill="#4d3727"/><text y="-50" font-size="14" text-anchor="middle" fill="#2b2b2b">N</text><text y="62" font-size="7" text-anchor="middle" fill="#555">garden plan · 1 square = 1 m</text></g>`;
  return svg(body, month.growth > 0.5 ? '#7fae5b' : '#9fb87a');
}

/** A flat's floor plan. Revision B moves the kitchen wall and adds a window. */
export function floorPlan(revision: 'A' | 'B'): string {
  const wall = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}" stroke="#1e293b" stroke-width="10" stroke-linecap="square"/>`;
  const dim = (x: number, y: number, text: string) =>
    `<text x="${String(x)}" y="${String(y)}" font-size="9" fill="#64748b" text-anchor="middle">${text}</text>`;
  const room = (x: number, y: number, name: string, area: string) =>
    `<text x="${String(x)}" y="${String(y)}" font-size="26" font-weight="600" fill="#0f172a" text-anchor="middle">${name}</text><text x="${String(x)}" y="${String(y + 22)}" font-size="11" fill="#475569" text-anchor="middle">${area}</text>`;
  const kitchenWall = revision === 'A' ? 900 : 980;
  let body = '';
  // Blueprint grid.
  for (let x = 0; x <= W; x += 40) {
    body += `<line x1="${String(x)}" y1="0" x2="${String(x)}" y2="${String(H)}" stroke="#dbe4f0" stroke-width="${String(x % 200 === 0 ? 1.5 : 0.6)}"/>`;
  }
  for (let y = 0; y <= H; y += 40) {
    body += `<line x1="0" y1="${String(y)}" x2="${String(W)}" y2="${String(y)}" stroke="#dbe4f0" stroke-width="${String(y % 200 === 0 ? 1.5 : 0.6)}"/>`;
  }
  // Outer walls.
  body +=
    wall(200, 200, 1400, 200) +
    wall(1400, 200, 1400, 1000) +
    wall(1400, 1000, 200, 1000) +
    wall(200, 1000, 200, 200);
  // Inner walls.
  body += wall(700, 200, 700, 620) + wall(200, 620, 560, 620) + wall(640, 620, 1400, 620);
  body += wall(kitchenWall, 620, kitchenWall, 1000);
  // Doors (gaps with a swing arc).
  body += `<path d="M560 620 A80 80 0 0 1 640 700" fill="none" stroke="#1e293b" stroke-width="2"/>`;
  // Windows.
  body += `<rect x="360" y="192" width="180" height="16" fill="#bae6fd" stroke="#1e293b" stroke-width="2"/>`;
  body += `<rect x="1000" y="192" width="220" height="16" fill="#bae6fd" stroke="#1e293b" stroke-width="2"/>`;
  if (revision === 'B') {
    body += `<rect x="1392" y="760" width="16" height="160" fill="#bae6fd" stroke="#1e293b" stroke-width="2"/>`;
  }
  body += room(450, 420, 'Bedroom', '12.6 m²');
  body += room(1050, 420, 'Living room', '22.4 m²');
  body += room((200 + kitchenWall) / 2, 820, 'Bathroom', revision === 'A' ? '8.1 m²' : '9.8 m²');
  body += room((kitchenWall + 1400) / 2, 820, 'Kitchen', revision === 'A' ? '11.2 m²' : '9.5 m²');
  // Dimensions: small on purpose.
  body += dim(450, 185, '5 000 mm') + dim(1050, 185, '7 000 mm');
  body += dim((200 + kitchenWall) / 2, 1020, `${String((kitchenWall - 200) * 10)} mm`);
  body += dim((kitchenWall + 1400) / 2, 1020, `${String((1400 - kitchenWall) * 10)} mm`);
  // Title block.
  body += `<rect x="1120" y="1060" width="440" height="110" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>`;
  body += `<text x="1140" y="1098" font-size="20" font-weight="700" fill="#0f172a">Flat 4 · ground floor</text>`;
  body += `<text x="1140" y="1124" font-size="12" fill="#334155">Revision ${revision}${revision === 'B' ? ' · kitchen wall moved 800 mm east, window added' : ' · first issue'}</text>`;
  body += `<text x="1140" y="1146" font-size="8" fill="#64748b">Drawn for the react-photo-compare demo · not a real building · scale 1:50</text>`;
  return svg(body, '#f8fafc');
}
