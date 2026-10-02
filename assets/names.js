// Typed leaderboard names (docs/scores.md, "Public names"): the rules shared
// by the gallery (instant feedback in the Records panel) and
// scripts/build-leaderboards.mjs (the real gate: the client is never
// trusted). Pure functions; the word lists are data files passed in:
//   assets/name-reserved.json   names only the arcade may use
//   assets/name-blocked.json    slurs, sexual terms, insults
// Node scripts load this file through scripts/names.mjs.
window.ArcadeNames = (function () {
  const MIN = 3;
  const MAX = 16;

  // Letters of one script; Chinese and Japanese mix Han and kana, so those
  // count as one. Anything outside this list is refused (rare scripts can be
  // added here). Latin, Greek and Cyrillic must be precomposed: a combining
  // mark there is only ever stacked decoration.
  const SCRIPTS = [
    ["Latin", /\p{scx=Latin}/u], ["Greek", /\p{scx=Greek}/u], ["Cyrillic", /\p{scx=Cyrillic}/u],
    ["Armenian", /\p{scx=Armenian}/u], ["Georgian", /\p{scx=Georgian}/u], ["Hebrew", /\p{scx=Hebrew}/u],
    ["Arabic", /\p{scx=Arabic}/u], ["Devanagari", /\p{scx=Devanagari}/u], ["Bengali", /\p{scx=Bengali}/u],
    ["Gurmukhi", /\p{scx=Gurmukhi}/u], ["Gujarati", /\p{scx=Gujarati}/u], ["Tamil", /\p{scx=Tamil}/u],
    ["Telugu", /\p{scx=Telugu}/u], ["Kannada", /\p{scx=Kannada}/u], ["Malayalam", /\p{scx=Malayalam}/u],
    ["Sinhala", /\p{scx=Sinhala}/u], ["Thai", /\p{scx=Thai}/u], ["Lao", /\p{scx=Lao}/u],
    ["Khmer", /\p{scx=Khmer}/u], ["Myanmar", /\p{scx=Myanmar}/u], ["Ethiopic", /\p{scx=Ethiopic}/u],
    ["Hangul", /\p{scx=Hangul}/u], ["CJK", /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}]/u],
  ];
  const NO_MARKS = ["Latin", "Greek", "Cyrillic"];

  // Look-alikes folded to one plain Latin letter for comparison (Greek and
  // Cyrillic letters that look Latin, digits that look like letters, letters
  // NFKD doesn't split). Applied after lowercasing and removing accents.
  const FOLD = {
    "0": "o", "1": "l", "i": "l", "3": "e", "4": "a", "5": "s",
    "6": "g", "7": "t", "8": "b", "9": "g", "2": "z",
    "ß": "ss", "æ": "ae", "œ": "oe", "ø": "o", "đ": "d", "ð": "d", "ł": "l", "ı": "l", "þ": "th",
    // Cyrillic
    "а": "a", "в": "b", "е": "e", "ё": "e", "к": "k", "м": "m", "н": "h", "о": "o", "р": "p", "с": "c",
    "т": "t", "у": "y", "х": "x", "ѕ": "s", "і": "l", "ї": "l", "ј": "j", "һ": "h", "ԁ": "d", "ԛ": "q", "ԝ": "w",
    // Greek
    "α": "a", "β": "b", "ε": "e", "ζ": "z", "η": "n", "ι": "l", "κ": "k", "ν": "v", "ο": "o", "ρ": "p",
    "τ": "t", "υ": "u", "χ": "x",
  };
  // Spellings that read as one letter ("phuck", "vvanker"). Kept short on
  // purpose: "rn"/"m", "cl"/"d" or "ck"/"k" would turn ordinary names into
  // list words ("Fukuda").
  const PAIRS = [[/vv/g, "w"], [/ph/g, "f"]];

  // Trim, collapse spaces (any whitespace), NFC.
  function clean(text) {
    return String(text == null ? "" : text).normalize("NFC").replace(/\s+/gu, " ").trim();
  }

  // The comparison form: lowercase, accents removed, look-alikes folded,
  // spaces kept (for whole-word matching). "Ćoсo 1" -> "coco l".
  function fold(text) {
    let s = clean(text).toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
    s = Array.from(s, (c) => (FOLD[c] !== undefined ? FOLD[c] : c)).join("");
    for (const [re, to] of PAIRS) s = s.replace(re, to);
    return s;
  }

  // The identity of a name: two names with the same key are the same name
  // ("Coco", "C0co", "co co", "Сосо" in Cyrillic).
  const key = (text) => fold(text).replace(/ /g, "");

  // Whether the leaderboard's word lists say no. lists: { reserved, blocked },
  // each { anywhere: [words], word: [words] }: `anywhere` words are refused
  // inside any name ("xxadminxx"), `word` words (short ones that hide in
  // ordinary names: "ass" in "Glass") only as a whole word or the whole name.
  // Repeated letters are tried collapsed too ("fuuuck"; "asss" for `word`
  // words, where only runs of 3+ shrink, so "Tilt" never reads as "tit").
  function listed(name, list) {
    if (!list) return "";
    const f = fold(name);
    const runs1 = (s) => s.replace(/(.)\1+/gu, "$1");
    const runs2 = (s) => s.replace(/(.)\1{2,}/gu, "$1$1");
    const whole = f.replace(/ /g, "");
    const hay = [whole, runs1(whole), runs2(whole)];
    for (const w of list.anywhere || []) {
      const k = key(w);
      if (k && hay.some((h) => h.includes(k))) return w;
    }
    const tokens = new Set();
    for (const t of [...f.split(" "), whole]) for (const v of [t, runs2(t)]) tokens.add(v);
    for (const w of list.word || []) {
      if (tokens.has(key(w))) return w;
    }
    return "";
  }

  // Checks a typed name. opts: { lists: { reserved, blocked }, isRandom(name),
  // owner(key) -> player hash that holds the name or "", me: my player hash }.
  // -> { ok, name (cleaned), key, reason, message }. reason: "empty",
  // "length", "chars", "script", "random", "reserved", "blocked", "taken".
  function check(text, opts) {
    const o = opts || {};
    const name = clean(text);
    const res = (reason, message) => ({ ok: !reason, name, key: reason ? "" : key(name), reason, message });
    const chars = Array.from(name);
    if (!chars.length) return res("empty", "Type a name.");
    if (chars.length < MIN || chars.length > MAX) return res("length", `Use ${MIN} to ${MAX} characters.`);
    if (!/^[\p{L}\p{M}0-9 ]+$/u.test(name) || /^\p{M}/u.test(name) || / \p{M}/u.test(name)) {
      return res("chars", "Use letters, digits and single spaces only.");
    }
    if (!/\p{L}/u.test(name)) return res("chars", "Use at least one letter.");
    let script = "";
    for (const c of chars) {
      if (!/\p{L}/u.test(c)) continue;
      const s = SCRIPTS.find(([, re]) => re.test(c));
      const name2 = s ? s[0] : "?";
      if (name2 === "?" || (script && script !== name2)) return res("script", "Use letters of one alphabet.");
      script = name2;
    }
    if (/\p{M}/u.test(name) && (NO_MARKS.includes(script) || /\p{M}{3}/u.test(name))) {
      return res("chars", "Use letters, digits and single spaces only.");
    }
    if (o.isRandom && o.isRandom(name)) return res("random", "That's one of the made-up names: use “Pick another name”.");
    const lists = o.lists || {};
    if (listed(name, lists.reserved)) return res("reserved", "That name is reserved for the arcade.");
    if (listed(name, lists.blocked)) return res("blocked", "That name isn't allowed. Try another.");
    const owner = o.owner ? o.owner(key(name)) : "";
    if (owner && owner !== o.me) return res("taken", "That name is taken. Try another.");
    return res("", "");
  }

  // The unfakeable tag shown after a typed name: 4 hex digits from the
  // player hash p (assets/scores.js), "Coco ·4F2A". Typed names can't hold
  // "·", so nobody can type someone else's tag.
  function tag(p) {
    const n = parseInt(String(p || "").slice(0, 7), 36) || 0;
    return (n & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  }

  const display = (name, p) => `${clean(name)} ·${tag(p)}`;

  return { MIN, MAX, clean, fold, key, listed, check, tag, display };
})();
