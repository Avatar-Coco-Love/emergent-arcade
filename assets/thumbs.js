// Gallery card art. Each entry returns an inline SVG (72x72) drawn from
// primitives, keyed by game id. Games without an entry get a generated
// pixel pattern in their accent color (see thumb() in gallery.js).
window.ArcadeThumbs = (function () {
  const svg = (body) =>
    `<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  // Same color ramp as the game: cool blue -> orange -> red as pressure rises.
  function pressureColor(p) {
    const t = Math.min(p / 100, 1);
    const r = Math.round(30 + t * 225);
    const g = Math.round(30 + (1 - Math.abs(t - 0.5) * 2) * 120);
    const b = Math.round(80 * (1 - t));
    return `rgb(${r},${g},${b})`;
  }

  function pressureGrid() {
    const n = 6, cell = 12;
    let body = `<rect width="72" height="72" fill="#16161d"/>`;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        // One cell erupting, its blast spreading into the neighbors.
        const d = Math.abs(x - 3) + Math.abs(y - 2);
        const fill = d === 0 ? "#ffffff" : pressureColor(Math.max(0, 95 - d * 24));
        body += `<rect x="${x * cell + 0.5}" y="${y * cell + 0.5}" width="${cell - 1}" height="${cell - 1}" rx="1" fill="${fill}"/>`;
      }
    }
    // A siphon arrow, as drawn in the game.
    body += `<path d="M 6 54 H 28 M 23 49 L 28 54 L 23 59" stroke="#6fd3ff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    return svg(body);
  }

  function orbitGarden() {
    let body = `<rect width="72" height="72" fill="#05050a"/>`;
    for (const [x, y] of [[8, 9], [60, 6], [30, 5], [66, 34], [5, 30], [52, 50], [14, 58], [40, 44]]) {
      body += `<rect x="${x}" y="${y}" width="1.2" height="1.2" fill="#fff" opacity="0.6"/>`;
    }
    // Launcher at the bottom.
    body += `<path d="M 25 72 A 11 11 0 0 1 47 72 Z" fill="#2b2b3d"/>`;
    // A seed's path, bending around the small planet toward the big one.
    body += `<path d="M 36 66 C 34 52, 12 50, 18 36 S 34 22, 42 25" stroke="#ffd166" stroke-width="1.4" stroke-dasharray="2 2.5" fill="none" opacity="0.8"/>`;
    body += `<circle cx="36" cy="66" r="2.2" fill="#ffd166"/>`;
    // Blooming planet: petals, then the green body.
    const [bx, by, br] = [48, 22, 8];
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.3;
      body += `<circle cx="${(bx + Math.cos(a) * (br + 3)).toFixed(1)}" cy="${(by + Math.sin(a) * (br + 3)).toFixed(1)}" r="${(br * 0.45).toFixed(1)}" fill="#ff8fb8"/>`;
    }
    body += `<circle cx="${bx}" cy="${by}" r="${br}" fill="rgb(60,210,60)"/>`;
    // Young planet with its progress ring toward bloom.
    body += `<circle cx="22" cy="44" r="5" fill="rgb(96,138,66)"/>`;
    body += `<path d="M 22 36 A 8 8 0 0 1 29.6 46.5" stroke="rgba(139,224,122,0.85)" stroke-width="1.5" fill="none"/>`;
    body += `<circle cx="42" cy="25" r="1.8" fill="#ffd166"/>`;
    return svg(body);
  }

  function murmuration() {
    let body = `<defs><linearGradient id="mm-sky" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#5b4b8a"/><stop offset="0.55" stop-color="#c0708a"/>` +
      `<stop offset="1" stop-color="#f6b26b"/></linearGradient></defs>`;
    body += `<rect width="72" height="72" fill="url(#mm-sky)"/>`;
    // A gate: two posts and a dashed line.
    body += `<line x1="44" y1="16" x2="66" y2="28" stroke="#fff" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.85"/>`;
    body += `<circle cx="44" cy="16" r="2" fill="#fff"/><circle cx="66" cy="28" r="2" fill="#fff"/>`;
    // The flock sweeping up toward it along a curve, a few birds flushed red.
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = 12 + 44 * t + Math.sin(i * 2.3) * (5 - 3 * t);
      const y = 60 - 40 * t * t - 6 * t + Math.cos(i * 1.7) * (5 - 3 * t);
      const a = Math.atan2(-80 * t - 6, 44) * 180 / Math.PI;
      const fill = i % 9 === 4 ? "#e0444e" : "#1b1626";
      body += `<path d="M 2.6 0 L -1.8 1.6 L -0.9 0 L -1.8 -1.6 Z" fill="${fill}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})"/>`;
    }
    return svg(body);
  }

  function antTrails() {
    let body = `<rect width="72" height="72" fill="#7a5a3c"/>`;
    // A scent highway from the nest up to a food pile.
    body += `<path d="M 36 64 Q 30 40 52 14" stroke="#ffb454" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.55"/>`;
    body += `<circle cx="36" cy="64" r="8" fill="#5a3f28"/><circle cx="36" cy="64" r="4" fill="#1c120b"/>`;
    for (const [x, y] of [[50, 11], [54, 13], [52, 16], [55, 17], [49, 15], [53, 10]]) {
      body += `<rect x="${x}" y="${y}" width="2.4" height="2.4" fill="#fbf6ea"/>`;
    }
    // Ants marching along it.
    for (let i = 0; i < 6; i++) {
      const t = 0.12 + i * 0.14, u = 1 - t;
      const x = u * u * 36 + 2 * u * t * 30 + t * t * 52, y = u * u * 64 + 2 * u * t * 40 + t * t * 14;
      body += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.8" ry="2.6" fill="#140d08"/>`;
    }
    // The spider closing in.
    body += `<g stroke="#1a0606" stroke-width="1.2">`;
    for (const a of [-50, -20, 20, 50]) {
      for (const s of [-1, 1]) body += `<line x1="14" y1="30" x2="${(14 + s * 9 * Math.cos(a * Math.PI / 180)).toFixed(1)}" y2="${(30 + 9 * Math.sin(a * Math.PI / 180)).toFixed(1)}"/>`;
    }
    body += `</g><circle cx="14" cy="30" r="4.5" fill="#2a0b0b"/><circle cx="14" cy="30" r="1.3" fill="#ff5d4a"/>`;
    return svg(body);
  }

  function wildfireLine() {
    let body = `<rect width="72" height="72" fill="#9aa04e"/>`;
    // Burnt ground behind the fire front, then the flames.
    body += `<path d="M 0 0 H 72 V 22 Q 54 30 36 24 T 0 26 Z" fill="#2c2622"/>`;
    for (const [x, y, r] of [[6, 27, 5], [16, 25, 6], [27, 27, 5], [38, 25, 6], [49, 28, 5], [60, 26, 6], [69, 23, 4]]) {
      body += `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="#ff5a1f" opacity="0.55"/><circle cx="${x}" cy="${y + 1}" r="${r - 2}" fill="#ffc24a"/>`;
    }
    // A cut firebreak with burnt-out ground above it, and a house behind it.
    body += `<rect x="0" y="44" width="72" height="7" fill="#80603f"/>`;
    body += `<rect x="0" y="38" width="44" height="6" fill="#352c26"/>`;
    body += `<rect x="27" y="58" width="18" height="10" fill="#f1e8da"/><path d="M 24 59 L 36 49 L 48 59 Z" fill="#b8402f"/>`;
    // The wind arrow.
    body += `<path d="M 60 50 V 64 M 55 59 L 60 65 L 65 59" stroke="#fff7ea" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    return svg(body);
  }

  function hourglassDelivery() {
    let body = `<rect width="72" height="72" fill="#3f2830"/>`;
    // A packed pile on a brass ledge, sliding off its end into a glass.
    body += `<path d="M 4 36 L 14 26 L 22 26 L 34 36 Z" fill="#b98f55"/><path d="M 22 26 L 34 36 L 38 36 Z" fill="#e8c47c"/>`;
    body += `<rect x="2" y="36" width="36" height="4" fill="#c49c56"/>`;
    for (const [x, y] of [[39, 38], [41, 41], [40, 44], [42, 39], [41, 47], [43, 52]]) {
      body += `<rect x="${x}" y="${y}" width="2.5" height="2.5" fill="#e8c47c"/>`;
    }
    // The hourglass on the belt, half full.
    body += `<path d="M 32 47 H 52 Q 51 56 43.5 58 Q 51 60 52 69 H 32 Q 33 60 40.5 58 Q 33 56 32 47 Z" fill="rgba(200,225,240,0.15)" stroke="#dcebf5" stroke-width="1.2"/>`;
    body += `<path d="M 34 69 Q 35 63 42 61.5 Q 49 63 50 69 Z" fill="#dcb06a"/>`;
    body += `<rect x="0" y="69" width="72" height="3" fill="#5a4842"/>`;
    return svg(body);
  }

  function tidewright() {
    let body = `<rect width="72" height="72" fill="#7fb3cf"/>`;
    // The sea rising behind a sand wall, spilling over its one low spot.
    body += `<rect x="0" y="26" width="72" height="30" fill="#2f7ca3"/>`;
    const tops = [34, 31, 33, 30, 45, 44, 32, 30, 33, 31, 34, 32];
    tops.forEach((t, i) => { body += `<rect x="${i * 6}" y="${t}" width="6.4" height="${56 - t}" fill="${i === 4 || i === 5 ? "#9a7a4a" : "#dcbd78"}"/>`; });
    body += `<rect x="25" y="28" width="10" height="17" fill="#cfe9f7" opacity="0.8"/>`;
    // Standing water at the foot of the wall, a sluice gate open to drain it.
    body += `<rect x="0" y="49" width="72" height="7" fill="#4696d2" opacity="0.7"/>`;
    body += `<rect x="46" y="46" width="7" height="10" fill="#5e646c"/><rect x="47.5" y="48" width="4" height="8" fill="#101820"/>`;
    body += `<rect x="0" y="56" width="72" height="16" fill="#2f4a2e"/>`;
    body += `<circle cx="49.5" cy="64" r="5" fill="#3fa36f"/><path d="M 46 60.5 L 53 67.5 M 53 60.5 L 46 67.5" stroke="#fff" stroke-width="1.2"/>`;
    body += `<rect x="10" y="63" width="10" height="7" fill="#c9b89a"/><path d="M 8 63 L 15 58 L 22 63 Z" fill="#8c3b2e"/>`;
    return svg(body);
  }

  function hotIron() {
    let body = `<rect width="72" height="72" fill="#110d0c"/>`;
    // Anvil face, a bar glowing orange-to-white where it's being worked, and
    // the dashed target outline (a double taper).
    body += `<rect x="4" y="22" width="68" height="30" rx="3" fill="#353a42"/>`;
    body += `<defs><linearGradient id="hi" x1="0" x2="1"><stop offset="0" stop-color="#2c2826"/><stop offset="0.3" stop-color="#8a1a0e"/><stop offset="0.5" stop-color="#ffc43c"/><stop offset="0.6" stop-color="#fff4de"/><stop offset="0.75" stop-color="#ee5c16"/><stop offset="1" stop-color="#3a221c"/></linearGradient></defs>`;
    body += `<path d="M 6 32 L 30 31 L 38 28 L 46 31 L 68 32 L 68 42 L 46 43 L 38 46 L 30 43 L 6 42 Z" fill="url(#hi)"/>`;
    body += `<path d="M 6 33 L 38 27 L 68 33 M 6 41 L 38 47 L 68 41" stroke="#c8e6ff" stroke-width="1" stroke-dasharray="2.5 2" fill="none"/>`;
    // Hammer coming down, and sparks.
    body += `<rect x="31" y="8" width="16" height="9" rx="1.5" fill="#b8aca4"/><rect x="45" y="11" width="22" height="3" rx="1.5" fill="#8a6a4a"/>`;
    for (const [x, y] of [[26, 22], [52, 20], [22, 17], [56, 25], [30, 14]]) body += `<rect x="${x}" y="${y}" width="1.6" height="1.6" fill="#ffd27a"/>`;
    body += `<circle cx="38" cy="62" r="3" fill="#9be37a"/>`;
    return svg(body);
  }

  function islandCensus() {
    let body = `<rect width="72" height="72" fill="#0f2d3d"/>`;
    // Island: sand rim, turf, three meadows joined by paths, one fenced.
    const ms = [[22, 24, 11, "#4e9642"], [50, 30, 10, "#6f8a4a"], [34, 52, 11, "#58923f"]];
    for (const [pad, col] of [[9, "#c9b27a"], [6, "#5f7a45"]]) {
      for (const [x, y, r] of ms) body += `<circle cx="${x}" cy="${y}" r="${r + pad}" fill="${col}"/>`;
    }
    body += `<path d="M 22 24 L 50 30 L 34 52 Z" stroke="#a88b5a" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    for (const [x, y, r, col] of ms) body += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
    // Fence across the path between the right meadow and the bottom one.
    body += `<path d="M 37 37 L 47 45" stroke="#3b2616" stroke-width="3.5"/><path d="M 37 37 L 47 45" stroke="#e7c890" stroke-width="1.4"/>`;
    // Rabbits (white dots) and foxes (orange triangles).
    for (const [x, y] of [[18, 21], [24, 20], [21, 27], [27, 26], [31, 49], [36, 55], [30, 55], [38, 49]]) {
      body += `<circle cx="${x}" cy="${y}" r="1.6" fill="#f3ecdc"/>`;
    }
    for (const [x, y] of [[47, 28], [53, 31]]) body += `<path d="M ${x} ${y + 3} L ${x - 3.2} ${y - 2.5} L ${x + 3.2} ${y - 2.5} Z" fill="#ff8a3d"/>`;
    return svg(body);
  }

  function loom() {
    let body = `<rect width="72" height="72" fill="#1d1523"/>`;
    // A 4x4 net stretched toward its top-right corner, pinned at two corners.
    const P = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const u = c / 3, v = r / 3;
      P.push([14 + u * 38 + u * (1 - v) * 10, 20 + v * 36 - u * (1 - v) * 10]);
    }
    const line = (a, b, col, w) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col}" stroke-width="${w}"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      if (c < 3) body += line(P[i], P[i + 1], r === 0 ? (c === 2 ? "#ff5a5a" : "#f2c14e") : "#e8dcc8", r === 0 ? 1.8 : 1.2);
      if (r < 3) body += line(P[i], P[i + 4], "#e8dcc8", 1.2);
    }
    // The dotted target the corner is being pulled onto.
    body += `<circle cx="62" cy="10" r="5" fill="none" stroke="#f0a0c3" stroke-width="1.2" stroke-dasharray="2 2"/>`;
    for (const q of P) body += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="1.6" fill="#f4ead8"/>`;
    for (const q of [P[0], P[12]]) {
      body += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.6" fill="#d9a441"/>`;
      body += `<circle cx="${(q[0] - 1).toFixed(1)}" cy="${(q[1] - 1).toFixed(1)}" r="1.2" fill="#f7d88a"/>`;
    }
    return svg(body);
  }

  function terraceGarden() {
    let body = `<rect width="72" height="72" fill="#16262b"/>`;
    // Three terraces stepping down to the right, water pooled on each.
    [[6, 24, 7], [16, 44, 5], [26, 64, 8]].forEach(([x, y, d]) => {
      body += `<rect x="${x}" y="${y - d}" width="40" height="${d}" fill="#46a0cd"/>`;
      body += `<rect x="${x - 2}" y="${y}" width="44" height="4" fill="#6b5238"/>`;
      body += `<rect x="${x - 2}" y="${y - 11}" width="2" height="11" fill="#4d3b29"/>`;
    });
    // An open gate pouring onto the terrace below.
    body += `<path d="M 47 24 Q 52 24 53 38" stroke="#6ebee1" stroke-width="2.5" fill="none"/>`;
    body += `<circle cx="47" cy="12" r="3.5" fill="#5fb8d8" stroke="#e9f2ee" stroke-width="1"/>`;
    // A plant in bloom on the bottom terrace, one growing above it.
    body += `<path d="M 36 64 V 50" stroke="#7fd86a" stroke-width="2"/>`;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      body += `<circle cx="${(36 + Math.cos(a) * 3.5).toFixed(1)}" cy="${(48 + Math.sin(a) * 3.5).toFixed(1)}" r="2.2" fill="#ffd27a"/>`;
    }
    body += `<circle cx="36" cy="48" r="1.8" fill="#c0703a"/>`;
    body += `<path d="M 28 44 V 35" stroke="#6ccf6a" stroke-width="2"/><circle cx="28" cy="34" r="2.5" fill="#3f6b3a"/>`;
    return svg(body);
  }

  function bubbleGlass() {
    let body = `<rect width="72" height="72" fill="#0f1420"/>`;
    // The box, turned a little, inside its ring.
    body += `<circle cx="36" cy="36" r="33" fill="none" stroke="#34405a" stroke-width="2"/>`;
    body += `<g transform="rotate(-18 36 36)">`;
    body += `<rect x="15" y="15" width="42" height="42" fill="#101b2c" stroke="#4a5776" stroke-width="2"/>`;
    // Sand heaped in the lower corner, a glass shard roofing the bubble.
    body += `<path d="M 16 56 L 16 40 Q 30 36 42 46 L 56 50 L 56 56 Z" fill="#e0ba70"/>`;
    body += `<rect x="30" y="27" width="16" height="5" fill="#96deee" stroke="#ecfcff" stroke-width="0.8"/>`;
    body += `<circle cx="38" cy="22" r="4.5" fill="rgba(220,240,255,0.25)" stroke="#f4fbff" stroke-width="1.4"/>`;
    body += `<circle cx="36.5" cy="20.5" r="1.1" fill="#ffffff"/>`;
    body += `<rect x="34" y="14" width="8" height="2" fill="#f0c46a"/>`;
    body += `</g>`;
    return svg(body);
  }

  function railYard() {
    let body = `<rect width="72" height="72" fill="#131922"/>`;
    // Subway-diagram yard: main line, a departure track up-left, a gravel siding.
    body += `<rect x="44" y="47" width="20" height="8" rx="2" fill="#3a3128"/>`;
    body += `<path d="M 6 38 L 66 38" stroke="#7fb4ff" stroke-width="2.4" fill="none"/>`;
    body += `<path d="M 8 20 L 26 20 L 34 38" stroke="#ffd166" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
    body += `<path d="M 36 38 L 44 51 L 64 51" stroke="#c8a27a" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
    body += `<rect x="5" y="15" width="3" height="10" fill="#e0655a"/><rect x="64" y="46" width="3" height="10" fill="#e0655a"/>`;
    // A coupled pair at the buffer, one car rolling in.
    body += `<rect x="10" y="16.5" width="7" height="7" rx="1.5" fill="#43c6ac"/><rect x="18.5" y="16.5" width="7" height="7" rx="1.5" fill="#f4a259"/>`;
    body += `<rect x="46" y="34.5" width="7" height="7" rx="1.5" fill="#e56bd1"/>`;
    body += `<path d="M 42 38 L 36 38" stroke="#ffffff" stroke-width="1.6"/><path d="M 36 35.5 L 33.5 38 L 36 40.5 Z" fill="#ffffff"/>`;
    return svg(body);
  }

  function aqueduct() {
    let body = `<rect width="72" height="72" fill="#0b1320"/>`;
    // The two-chamber vessel with its bridge and hanging cup, the bead afloat, the ring across the sill.
    let v = `<path d="M 4 24 h 24 v -12 h 16 v 12 h 24 v 40 h -24 v -30 h -16 v 30 h -24 Z" fill="#0e1a2c" stroke="#35547d" stroke-width="2.4" stroke-linejoin="round"/>`;
    v += `<rect x="31" y="8" width="10" height="10" fill="none" stroke="#d9a441" stroke-width="1.2"/><rect x="31" y="14" width="10" height="4" fill="#3c87ff"/>`;
    v += `<rect x="5.2" y="44" width="21.6" height="18.8" fill="#3c87ff"/><rect x="45.2" y="55" width="21.6" height="7.8" fill="#3c87ff"/>`;
    v += `<circle cx="56" cy="46" r="5" fill="none" stroke="#ffd86b" stroke-width="1.6"/>`;
    v += `<circle cx="16" cy="41" r="5.5" fill="#ffc940" opacity="0.25"/><circle cx="16" cy="41" r="3.2" fill="#ffe9a8"/>`;
    body += `<g transform="translate(5.4 4) scale(0.85)">${v}</g>`;
    return svg(body);
  }

  function counterfeitScale() {
    let body = `<rect width="72" height="72" fill="#0d0c10"/>`;
    // A balance tipped left, a heavy coin on the low pan, marked coins in the tray.
    body += `<path d="M 36 14 V 50 M 26 50 H 46" stroke="#8a8494" stroke-width="3" stroke-linecap="round"/>`;
    body += `<path d="M 14 21 L 58 13" stroke="#b8b0c4" stroke-width="2.5" stroke-linecap="round"/><path d="M 36 10 L 32 18 H 40 Z" fill="#e2b34a"/>`;
    body += `<path d="M 14 21 L 6 38 M 14 21 L 22 38 M 58 13 L 50 30 M 58 13 L 66 30" stroke="#6b6575" stroke-width="0.8"/>`;
    body += `<path d="M 5 38 H 23 M 49 30 H 67" stroke="#8a8494" stroke-width="2" stroke-linecap="round"/>`;
    body += `<circle cx="14" cy="33" r="4.5" fill="#e8743b"/><circle cx="58" cy="25" r="4.5" fill="#c9a542"/>`;
    const tray = ["#c9a542", "#5fcf80", "#5aa0e8", "#c9a542", "#5fcf80"];
    tray.forEach((f, i) => { body += `<circle cx="${12 + i * 12}" cy="61" r="4.5" fill="${f}" stroke="rgba(0,0,0,.35)"/>`; });
    return svg(body);
  }

  function coatCheck() {
    let body = `<rect width="72" height="72" fill="#0f0d0c"/>`;
    // A 3x3 wall of identical doors; one stands open on a blue coat, one hook is free.
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = 6 + c * 21, y = 6 + r * 21;
      if (r === 1 && c === 1) {
        body += `<rect x="${x}" y="${y}" width="18" height="18" rx="2" fill="#16120f"/>`;
        body += `<path d="M ${x + 6} ${y + 4} L ${x + 3} ${y + 7} L ${x + 4} ${y + 16} H ${x + 14} L ${x + 15} ${y + 7} L ${x + 12} ${y + 4} L ${x + 9} ${y + 7} Z" fill="#3f8fe0" stroke="#1b1612" stroke-width="0.8"/>`;
        body += `<circle cx="${x + 6.5}" cy="${y + 9.5}" r="1.8" fill="#f6f1e8"/>`;
      } else if (r === 2 && c === 0) {
        body += `<rect x="${x + 0.5}" y="${y + 0.5}" width="17" height="17" rx="2" fill="#16120f" stroke="#4a433b" stroke-dasharray="2 2"/>`;
      } else {
        body += `<rect x="${x}" y="${y}" width="18" height="18" rx="2" fill="#5b4431"/><circle cx="${x + 14.5}" cy="${y + 9}" r="1.3" fill="#c9a46a"/>`;
      }
    }
    return svg(body);
  }

  function surpriseParty() {
    let body = `<rect width="72" height="72" fill="#1a1420"/>`;
    // Two rooms; a ripple spreads from a guest in party hats; the birthday person waits behind a shut door.
    body += `<rect x="5" y="5" width="62" height="34" fill="#f7e8c9"/><rect x="5" y="44" width="62" height="23" fill="#e7def6"/>`;
    body += `<rect x="5" y="39" width="62" height="5" fill="#3b2f45"/><rect x="44" y="39" width="12" height="5" fill="#9b6a3a"/>`;
    body += `<circle cx="22" cy="22" r="15" fill="none" stroke="#ffd166" stroke-width="2.2" opacity="0.8"/>`;
    const face = (x, y, c) => { body += `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}" stroke="#2a1d22" stroke-width="0.6"/><circle cx="${x - 2}" cy="${y - 0.8}" r="0.8" fill="#2a1d22"/><circle cx="${x + 2}" cy="${y - 0.8}" r="0.8" fill="#2a1d22"/>`; };
    const hat = (x, y, c) => { body += `<path d="M ${x - 3.6} ${y - 4} L ${x + 3.6} ${y - 4} L ${x} ${y - 12} Z" fill="${c}"/>`; };
    face(22, 24, "#f2c9a0"); hat(22, 24, "#ff6f91");
    face(36, 30, "#a8754f"); hat(36, 30, "#5ec2ff");
    face(12, 32, "#d9a477"); hat(12, 32, "#ffd166");
    face(55, 22, "#f5d6b8");
    body += `<circle cx="50" cy="57" r="6" fill="#e2b6ff" stroke="#2a1d22" stroke-width="0.6"/><path d="M 50 50 L 45 47 L 45 53 Z M 50 50 L 55 47 L 55 53 Z" fill="#ff4f7b"/>`;
    return svg(body);
  }

  function mycelium() {
    let body = `<rect width="72" height="72" fill="#1f1610"/>`;
    // Threads from the glowing spore out to two leaf patches, one fruiting, one branch rotting.
    const th = (d, c) => { body += `<path d="${d}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };
    th("M 36 38 L 28 30 L 20 26 L 14 16", "#f3ead2");
    th("M 36 38 L 46 44 L 52 54 L 58 58", "#f3ead2");
    th("M 36 38 L 34 50 L 26 58", "#a67a63");
    body += `<circle cx="14" cy="16" r="8" fill="#8d5d2c"/><circle cx="58" cy="58" r="7" fill="#8d5d2c"/>`;
    body += `<rect x="12.8" y="5" width="2.4" height="5" fill="#efe3c8"/><path d="M 9 6 A 5 5 0 0 1 19 6 Z" fill="#d0563c"/>`;
    body += `<rect x="22" y="8" width="2" height="4" fill="#efe3c8"/><path d="M 19 9 A 4 4 0 0 1 27 9 Z" fill="#d0563c"/>`;
    body += `<circle cx="26" cy="58" r="3.5" fill="#6b3f5e"/>`;
    for (const [x, y] of [[28, 30], [20, 26], [46, 44], [52, 54], [34, 50]]) body += `<circle cx="${x}" cy="${y}" r="2" fill="#f3ead2"/>`;
    body += `<circle cx="36" cy="38" r="9" fill="#fff3d6" opacity="0.25"/><circle cx="36" cy="38" r="4.5" fill="#fff3d6"/>`;
    return svg(body);
  }

  return { "pressure-grid": pressureGrid, "orbit-garden": orbitGarden, murmuration, "ant-trails": antTrails, "wildfire-line": wildfireLine, "hourglass-delivery": hourglassDelivery, "hot-iron": hotIron, "island-census": islandCensus, loom, "terrace-garden": terraceGarden, "bubble-glass": bubbleGlass, tidewright, "rail-yard": railYard, aqueduct, "counterfeit-scale": counterfeitScale, "coat-check": coatCheck, mycelium, "surprise-party": surpriseParty };
})();
