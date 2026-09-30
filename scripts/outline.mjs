#!/usr/bin/env node
// Prints a map of a game file with line numbers, so a session can read just
// the range it needs instead of the whole file (game files run to 2,000+
// lines). Generated from the code, so it never goes stale.
//
// Usage: node scripts/outline.mjs <id|file> [...]
//
// Lists: section comments (`// ---- name ----` or `// § name`), top-level
// constant runs, big data blocks (levels, tables), and functions, grouped
// under the section they sit in. Name new sections with `// § name` (see
// docs/adding-a-game.md, "Sections").
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (!args.length) {
  console.log("Usage: node scripts/outline.mjs <id|file> [...]");
  process.exit(1);
}

const SECTION = /^\s*\/\/\s*(?:§\s*(.+?)|[-=─━]{3,}\s*(.+?)\s*[-=─━]{3,})\s*$/;
const FUNC = /^(\s{0,4})(?:async\s+)?function\s*\*?\s*([\w$]+)/;
const CONST = /^(\s{0,2})(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;
const WIDTH = 100;

function blockEnd(lines, i, indent) {
  // A declaration whose line opens a bracket runs to the next line at the
  // same indent that starts by closing it.
  if (!/[[{(]\s*$/.test(lines[i])) return i;
  const close = new RegExp(`^${indent}[\\]})]`);
  for (let j = i + 1; j < lines.length; j++) if (close.test(lines[j])) return j;
  return i;
}

function wrap(prefix, items) {
  const out = [];
  let line = prefix;
  for (const it of items) {
    const add = (line === prefix ? "" : " · ") + it;
    if (line.length + add.length > WIDTH && line !== prefix) {
      out.push(line);
      line = prefix + it;
    } else line += add;
  }
  if (line !== prefix) out.push(line);
  return out;
}

function outline(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = [`${file.replace(root + "/", "")}  ${lines.length} lines`];
  let items = []; // pending functions / small consts in the current section
  let consts = null; // run of consecutive short top-level constants
  const flushConsts = () => {
    if (!consts) return;
    const names = consts.names.length > 10
      ? consts.names.slice(0, 10).join(" ") + ` +${consts.names.length - 10}`
      : consts.names.join(" ");
    const at = consts.to > consts.from ? `${consts.from}–${consts.to}` : consts.from;
    items.push(`L${at} consts: ${names}`);
    consts = null;
  };
  const flush = () => {
    flushConsts();
    out.push(...wrap("    ", items));
    items = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const n = i + 1;
    let m;
    if (/^\s*<(style|script)\b/.test(l)) {
      flush();
      out.push(`  L${n} <${l.match(/<(\w+)/)[1]}>`);
    } else if ((m = l.match(SECTION))) {
      flush();
      out.push(`  L${n} § ${(m[1] || m[2]).replace(/\s*[-=─━]+$/, "")}`);
    } else if ((m = l.match(FUNC))) {
      flushConsts();
      items.push(`L${n} ${m[2]}`);
    } else if ((m = l.match(CONST))) {
      const end = blockEnd(lines, i, m[1]);
      if (end - i >= 15) {
        flushConsts();
        items.push(`L${n}–${end + 1} ${m[2]} (data, ${end - i + 1} lines)`);
        i = end;
      } else {
        if (consts && consts.to < n - 2) flushConsts();
        consts ??= { from: n, to: n, names: [] };
        consts.names.push(m[2]);
        consts.to = end + 1;
        i = end;
      }
    }
  }
  flush();
  return out.join("\n");
}

for (const a of args) {
  const file = [a, join(root, a), join(root, "games", a), join(root, "games", `${a}.html`)].find(
    (p) => existsSync(p) && p.endsWith(".html"),
  );
  if (!file) {
    console.log(`${a}: no such game file`);
    process.exitCode = 1;
    continue;
  }
  console.log(outline(file));
}
