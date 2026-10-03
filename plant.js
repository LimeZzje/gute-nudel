// The plant on the windowsill, drawn as SVG for each growth stage (0 = seed … 7 = ready to harvest).

// one serrated finger of a fan leaf, pointing up from (0,0), length len
function finger(len, color) {
  const w = len * 0.13, n = 7, R = [], Lf = [];
  for (let i = 1; i <= n; i++) { // zigzag edge = the typical saw-tooth
    const t = i / (n + 1), y = -len * t, half = w * Math.sin(Math.PI * Math.pow(t, .8)) * 1.15;
    R.push(`L ${(half + w * .28).toFixed(1)} ${(y + len * .03).toFixed(1)} L ${half.toFixed(1)} ${(y + len * .07).toFixed(1)}`);
    Lf.unshift(`L ${(-half).toFixed(1)} ${(y + len * .07).toFixed(1)} L ${(-half - w * .28).toFixed(1)} ${(y + len * .03).toFixed(1)}`);
  }
  return `<path d="M0 0 ${R.join(' ')} L0 ${-len} ${Lf.join(' ')} Z" fill="${color}"/><path d="M0 0 L0 ${-len * .9}" stroke="rgba(255,255,255,.4)" stroke-width="1.1"/>`;
}
// a whole fan leaf: stem (petiole) of length P, then fingers fanned out; drawn pointing up from (0,0)
function leaf(L, fingers, color, P = 0) {
  const spread = fingers >= 7 ? 200 : fingers >= 5 ? 170 : 110, out = [];
  if (P) out.push(`<path d="M0 0 L0 ${-P}" stroke="#3a7d3f" stroke-width="2.2" stroke-linecap="round"/>`);
  out.push(`<g transform="translate(0 ${-P})">`);
  for (let i = 0; i < fingers; i++) {
    const a = fingers === 1 ? 0 : -spread / 2 + spread * i / (fingers - 1);
    out.push(`<g transform="rotate(${a.toFixed(1)})">${finger(L * (1 - Math.pow(Math.abs(a) / (spread / 2), 1.6) * 0.62), color)}</g>`);
  }
  out.push('</g>');
  return out.join('');
}
function bud(x, y, s, ripe) {
  const base = ripe ? '#7fb24a' : '#a9cf6e', hair = ripe ? '#e08a2c' : '#f4f1e6', tint = ripe ? '#b9a1d8' : null;
  let h = `<g transform="translate(${x} ${y})"><ellipse rx="${7 * s}" ry="${11 * s}" fill="${base}"/>`;
  if (tint) h += `<ellipse rx="${4 * s}" ry="${7 * s}" cy="${2 * s}" fill="${tint}" opacity=".35"/><ellipse rx="${6 * s}" ry="${9 * s}" fill="#fff" opacity=".18"/>`;
  for (let i = 0; i < 7; i++) {
    const a = i * 51, r = 9 * s;
    h += `<path d="M0 ${-3 * s} q ${Math.cos(a) * r} ${-6 * s} ${Math.cos(a) * r * 1.3} ${-r * 1.1 + Math.sin(a) * 3}" stroke="${hair}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  }
  return h + '</g>';
}

export function plantSVG(stage) {
  const W = 360, H = 300, cx = 180, soilY = 236;
  const g1 = '#3f8f45', g2 = '#58a95c', g3 = '#2f7436';
  let p = '';
  // window frame + sill
  p += `<rect x="0" y="252" width="${W}" height="48" fill="#d9c3a0"/><rect x="0" y="248" width="${W}" height="8" fill="#c7ab83"/>`;
  p += `<rect x="18" y="0" width="10" height="250" fill="#f3efe7" opacity=".9"/><rect x="${W - 28}" y="0" width="10" height="250" fill="#f3efe7" opacity=".9"/>`;
  p += `<circle cx="300" cy="52" r="22" fill="#ffe08a" opacity=".85"/>`;
  // pot
  p += `<path d="M128 232 L232 232 L222 292 L138 292 Z" fill="#c8693e"/><rect x="122" y="224" width="116" height="16" rx="4" fill="#d97b4c"/>`;
  p += `<ellipse cx="${cx}" cy="230" rx="52" ry="7" fill="#5a3d2b"/>`;

  const h = [0, 26, 52, 86, 120, 150, 172, 186][stage];
  if (stage === 0) {
    p += `<ellipse cx="${cx}" cy="228" rx="7" ry="5" fill="#8a6a45"/><path d="M${cx - 4} 227 q4 -4 8 0" stroke="#5b4630" fill="none"/>`;
    p += `<text x="${cx}" y="206" text-anchor="middle" font-family="Caveat, cursive" font-size="22" fill="#5a3d2b">psst… da tut sich was</text>`;
    return wrap(p, W, H);
  }
  const top = soilY - 6 - h;
  // stem (slight curve)
  p += `<path d="M${cx} ${soilY - 6} C ${cx - 6} ${soilY - h * .4} ${cx + 6} ${soilY - h * .7} ${cx} ${top}" stroke="${g3}" stroke-width="${2 + stage * .9}" fill="none" stroke-linecap="round"/>`;

  if (stage === 1) { // two round seed leaves
    p += `<ellipse cx="${cx - 10}" cy="${top + 2}" rx="11" ry="6" fill="${g2}" transform="rotate(-20 ${cx - 10} ${top + 2})"/>`;
    p += `<ellipse cx="${cx + 10}" cy="${top + 2}" rx="11" ry="6" fill="${g2}" transform="rotate(20 ${cx + 10} ${top + 2})"/>`;
    return wrap(p, W, H);
  }
  // nodes with leaf pairs, more and bigger leaves the further it grows
  // nodes with leaf pairs on long stems, sticking out sideways (open, not a cone); lower leaves bigger
  const nodes = [0, 0, 2, 3, 4, 4, 5, 5][stage], fingers = stage < 3 ? 3 : stage < 4 ? 5 : 7;
  for (let i = 0; i < nodes; i++) {
    const t = (i + 0.6) / (nodes + 0.5), y = soilY - 6 - h * t, flip = i % 2 ? 1 : -1;
    const L = (stage < 3 ? 16 : 22 + stage * 4.2) * (1.05 - t * 0.45), P = stage < 3 ? 6 : 12 + stage * 2 - t * 10;
    const ang = 58 + i * 4;
    p += `<g transform="translate(${cx} ${y}) rotate(${-ang})">${leaf(L, fingers, i % 2 ? g1 : g2, P)}</g>`;
    p += `<g transform="translate(${cx} ${y - 4}) rotate(${ang})">${leaf(L * .95, fingers, i % 2 ? g2 : g1, P)}</g>`;
    if (stage >= 5 && i > 0) { // flower clusters where the branches meet the stem
      const ripe = stage >= 7, s = stage === 5 ? .55 : stage === 6 ? 1 : 1.3;
      p += bud(cx + flip * 9, y - 9, s, ripe);
    }
  }
  p += `<g transform="translate(${cx} ${top + 6})">${leaf(stage < 3 ? 14 : 20, stage < 3 ? 3 : 5, g2)}</g>`;
  if (stage >= 5) p += bud(cx, top - 4, stage === 5 ? .7 : stage === 6 ? 1.3 : 1.6, stage >= 7);
  if (stage >= 7) { // sparkles
    for (const [x, y] of [[110, 70], [250, 90], [140, 150], [236, 160], [180, 40]])
      p += `<path transform="translate(${x} ${y})" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" fill="#ffd34d"/>`;
  }
  return wrap(p, W, H);
}
const wrap = (p, W, H) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pflanze">${p}</svg>`;
