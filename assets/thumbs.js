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

  return { "pressure-grid": pressureGrid, "orbit-garden": orbitGarden, murmuration, "ant-trails": antTrails, "wildfire-line": wildfireLine };
})();
