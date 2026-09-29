// The "one self-contained HTML file" rule, shared by scripts/validate.mjs
// (game files) and scripts/smoke-gallery.mjs (downloaded standalone copies).
// Returns a list of problems; empty means the file passes.
export function selfContainedProblems(html) {
  const problems = [];
  if (!/^\s*<!DOCTYPE html>/i.test(html)) problems.push("must start with <!DOCTYPE html>");
  const rules = [
    [/<script\b[^>]*\bsrc\s*=/i, "external <script src>"],
    [/<link\b[^>]*\brel\s*=\s*["']?(stylesheet|preload|modulepreload)/i, "external stylesheet/preload <link>"],
    [/<(img|audio|video|source|iframe|embed|object)\b/i, "media/embed element (use canvas/SVG/CSS primitives)"],
    [/url\(\s*["']?(?!data:|#)[^)"']+/i, "CSS url() pointing at a file"],
    [/@import\b/i, "CSS @import"],
    [/\bimport\s*\(|\bimport\s+[\w{*][^;]*\bfrom\b/, "JS module import"],
    [/\bnew\s+(Audio|Image)\s*\(/, "new Audio()/new Image() (loads external assets)"],
    [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/, "network access"],
  ];
  for (const [re, label] of rules) {
    if (re.test(html)) problems.push(`not self-contained, found ${label}`);
  }
  return problems;
}
