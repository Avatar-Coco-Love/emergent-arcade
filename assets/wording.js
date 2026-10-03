// Tap or click: manifest text says {tap}, {finger}, {hold}… and the gallery
// fills in phone or mouse words, decided by the device's main input
// (matchMedia "(pointer: coarse)"), never by the device name. A capital
// first letter ({Tap}) capitalizes the word. The optional manifest field
// "keyboard" (keys, like "← → to tilt") is shown only with a fine pointer.
//
// Also loaded by the Node scripts (validate, link previews) with a stand-in
// window: see scripts/site.mjs. Link previews always use the phone words.
window.ArcadeWording = (function () {
  // placeholder: [phone, mouse]
  const WORDS = {
    tap: ["tap", "click"],
    taps: ["taps", "clicks"],
    tapped: ["tapped", "clicked"],
    tapping: ["tapping", "clicking"],
    finger: ["finger", "pointer"],
    fingers: ["fingers", "pointers"],
    hold: ["hold", "click and hold"],
    press: ["press", "click"],
    slide: ["slide", "move"],
    swipe: ["swipe", "drag"],
    swipes: ["swipes", "drags"],
    swiped: ["swiped", "dragged"],
  };
  // Manifest fields that are keys or data, never shown as prose.
  const RAW = new Set(["id", "file", "verb", "added", "updated", "accent", "status", "version", "date", "topics"]);
  const PLACEHOLDER = /\{([^{}]*)\}/g;

  const coarse = () => !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  function word(name, touch) {
    const pair = WORDS[name.toLowerCase()];
    if (!pair || (name !== name.toLowerCase() && name !== cap(name.toLowerCase()))) return null;
    const w = pair[touch ? 0 : 1];
    return name === name.toLowerCase() ? w : cap(w);
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Fills every placeholder in a string. Unknown ones are left as they are
  // (validate.mjs rejects them before they ship).
  function text(s, touch = coarse()) {
    return String(s).replace(PLACEHOLDER, (all, name) => word(name, touch) ?? all);
  }

  // Placeholders in a string that aren't in WORDS (for validate.mjs).
  function unknown(s) {
    return [...String(s).matchAll(PLACEHOLDER)].filter((m) => word(m[1], true) === null).map((m) => m[0]);
  }

  // A verb's label (chips, the About panel): "tap" reads "click" with a mouse.
  function verb(v, touch = coarse()) {
    return word(v, touch) ?? v;
  }

  // A copy of a manifest game with every prose string filled in, and
  // "keyboard" dropped on touch devices.
  function game(g, touch = coarse()) {
    const fill = (v, key) => {
      if (typeof v === "string") return RAW.has(key) ? v : text(v, touch);
      if (Array.isArray(v)) return v.map((x) => fill(x, key));
      if (v && typeof v === "object") {
        const out = {};
        for (const [k, x] of Object.entries(v)) out[k] = fill(x, k);
        return out;
      }
      return v;
    };
    const out = fill(g, "");
    if (touch) delete out.keyboard;
    return out;
  }

  return { WORDS, RAW, coarse, text, unknown, verb, game };
})();
