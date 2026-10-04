// The shared car: an Audi A1 Sportback S line (2024) in flat grey, drawn as a side view, plus time helpers
// for bookings. A booking: {id, start, end ('YYYY-MM-DDTHH:MM', local time), note, ts, del?}.

const pad = n => String(n).padStart(2, '0');
export const localISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
export const overlaps = (a, b) => a.start < b.end && b.start < a.end;
export const live = list => (list || []).filter(b => !b.del && b.end > localISO(new Date()));

// 5 twin spokes, like the S line wheels in the photo
function wheel(cx, cy, id) {
  const spokes = Array.from({ length: 5 }, (_, i) => `<g transform="rotate(${i * 72} ${cx} ${cy})">
      <path d="M${cx - 2.6},${cy - 4} L${cx - 3.6},${cy - 15.5} L${cx - .9},${cy - 15.8} L${cx - .7},${cy - 4.2}Z" fill="url(#rim${id})"/>
      <path d="M${cx + 2.6},${cy - 4} L${cx + 3.6},${cy - 15.5} L${cx + .9},${cy - 15.8} L${cx + .7},${cy - 4.2}Z" fill="url(#rim${id})"/></g>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="23" fill="#121315"/>
    <circle cx="${cx}" cy="${cy}" r="21.6" fill="none" stroke="#2a2c30" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${cy}" r="17" fill="#1b1c1f"/>
    <circle cx="${cx}" cy="${cy}" r="10.5" fill="#3a3c40"/>
    <path d="M${cx + 6},${cy - 10} A11.5,11.5 0 0 1 ${cx + 11.2},${cy + 3}" stroke="#d3122b" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="16.6" fill="none" stroke="url(#rim${id})" stroke-width="1.6"/>
    ${spokes}
    <circle cx="${cx}" cy="${cy}" r="4.4" fill="url(#rim${id})"/><circle cx="${cx}" cy="${cy}" r="2.2" fill="#2b2d31"/>`;
}

export function carSVG() {
  const rim = id => `<radialGradient id="rim${id}" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f1f3f5"/><stop offset=".55" stop-color="#b7bcc2"/><stop offset="1" stop-color="#6d7279"/></radialGradient>`;
  return `<svg class="a1" viewBox="0 0 400 170" role="img" aria-label="Audi A1 Sportback in Grau">
  <defs>
    <linearGradient id="a1body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9bec2"/><stop offset=".34" stop-color="#9aa0a5"/><stop offset=".36" stop-color="#868c91"/>
      <stop offset=".7" stop-color="#7b8186"/><stop offset="1" stop-color="#4f5458"/></linearGradient>
    <linearGradient id="a1glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a4048"/><stop offset=".45" stop-color="#15181d"/><stop offset="1" stop-color="#0b0d10"/></linearGradient>
    <linearGradient id="a1shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="a1shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${rim('r')}${rim('f')}
    <pattern id="a1comb" width="4" height="3.6" patternUnits="userSpaceOnUse"><path d="M0,1.8 L1,0 L3,0 L4,1.8 L3,3.6 L1,3.6Z" fill="#050506" stroke="#2c2e32" stroke-width=".5"/></pattern>
  </defs>
  <ellipse cx="205" cy="152" rx="160" ry="10" fill="url(#a1shadow)"/>
  <!-- body -->
  <path d="M61,131 L57,113 Q55,99 60,91 L65,85 L74,64 Q77,59 85,57.5 Q124,49.5 172,49.5 L204,50.5 Q216,51.5 224,57.5 L262,84.5
    Q305,89.5 336,96 Q348,99 351,106 L354,119 Q355,129 347,131 L321,131 A29,29 0 0 0 263,131 L134,131 A29,29 0 0 0 76,131 Z" fill="url(#a1body)"/>
  <!-- tornado line + shoulder light -->
  <path d="M62,89.5 Q160,91 262,93.5 Q312,96 349,103.5" stroke="#e7eaec" stroke-opacity=".75" stroke-width="1.1" fill="none"/>
  <path d="M63,92.5 Q160,94 262,96.5 Q312,99 347,106.5" stroke="#4d5256" stroke-opacity=".6" stroke-width="1" fill="none"/>
  <path d="M100,55 Q132,50.5 172,50.5 L204,51.5 Q214,52.5 222,58" stroke="url(#a1shine)" stroke-width="2" fill="none"/>
  <!-- wheel arches -->
  <path d="M73,131 A32,32 0 0 1 137,131" stroke="#5a5f63" stroke-width="2" fill="none"/>
  <path d="M260,131 A32,32 0 0 1 324,131" stroke="#5a5f63" stroke-width="2" fill="none"/>
  <!-- greenhouse: rising beltline, thick forward-leaning C-pillar -->
  <path d="M106,62 Q140,56 178,55.5 L204,56 Q213,57 219,61.5 L251,85.5 L116,82.5 Q108,82 105,77 Q103,69 106,62 Z" fill="url(#a1glass)"/>
  <path d="M124,59.5 L158,57 L130,83 L114,82.7 Z" fill="#fff" opacity=".07"/>
  <path d="M196,56.5 L209,58 L180,85 L168,84.8 Z" fill="#fff" opacity=".06"/>
  <path d="M170,55.6 L175,55.6 L176,85 L171,85 Z" fill="#0c0d0f"/>
  <path d="M106,62 Q140,56 178,55.5 L204,56 Q213,57 219,61.5 L251,85.5" stroke="#0c0d0f" stroke-width="1.6" fill="none"/>
  <!-- door cuts + handles -->
  <path d="M173,86 L171,124 M250,86 Q254,108 254,124" stroke="#53585c" stroke-width="1" fill="none"/>
  <rect x="150" y="96" width="13" height="2.6" rx="1.3" fill="#5b6064"/><rect x="226" y="96" width="13" height="2.6" rx="1.3" fill="#5b6064"/>
  <!-- S line side sill (black) -->
  <path d="M137,128 L260,128 L258,123 Q200,120 139,121.5 Z" fill="#1a1b1d"/>
  <!-- mirror -->
  <path d="M244,82 Q248,74 259,75 Q264,76 263,82 Q257,87 248,87 Z" fill="url(#a1body)" stroke="#55595d" stroke-width=".8"/>
  <!-- rear: roof spoiler, lamp with light strip, diffuser -->
  <path d="M71,62 Q75,57.5 87,56 L95,55.5 L79,60.5 Z" fill="#141516"/>
  <path d="M59,88 L77,85 Q79,88.5 76.5,92 L57.5,95 Z" fill="#7a0b14"/>
  <path class="a1tail" d="M60,90.5 L76,88" stroke="#ff2a3a" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M57,118 L74,121 L73,130.5 L61,130.5 Z" fill="#141516"/>
  <!-- front: headlight with LED DRL, honeycomb grille, intake -->
  <path d="M316,95 Q334,97.5 349,103.5 L347,109.5 Q331,106 317,100.5 Z" fill="#20252b"/>
  <path class="a1drl" d="M320,98 L330,99.6 M332,100 L340,101.8 M341.5,102.3 L347.5,104.6" stroke="#eaf6ff" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M347,109.5 L353,112 L354.5,121 L349,123 Z" fill="url(#a1comb)"/>
  <path d="M328,119 L349,123 L348,129.5 L325,127.5 Z" fill="url(#a1comb)" stroke="#0a0a0b" stroke-width=".8"/>
  ${wheel(105, 131, 'r')}${wheel(292, 131, 'f')}
</svg>`;
}
