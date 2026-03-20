#!/usr/bin/env node
/**
 * Post-build CSS compatibility pass for legacy Smart TV browsers.
 * Strips :not(#\#) specificity hacks and unwraps @supports blocks.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const cssFiles = [];
function findCss(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) findCss(full);
    else if (entry.name.endsWith('.css')) cssFiles.push(full);
  }
}
findCss(distDir);

let totalStripped = 0;
let totalUnwrapped = 0;

for (const file of cssFiles) {
  let css = readFileSync(file, 'utf8');
  const before = css;

  const notCount = (css.match(/:not\(#\\#\)/g) || []).length;
  css = css.replace(/:not\(#\\#\)/g, '');
  totalStripped += notCount;

  let changed = true;
  while (changed) {
    const prev = css;
    css = css.replace(
      /@supports\s*[^{]*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g,
      (_, inner) => { totalUnwrapped++; return inner; },
    );
    changed = css !== prev;
  }

  css = css.replace(/@property\s+[^{]*\{[^}]*\}/g, '');

  css = css.replace(/color-mix\(in\s+\w+\s*,\s*([^,)]+)\s*,\s*[^)]+\)/g, '$1');

  css = css.replace(/[^;{}]*color-mix\([^)]*\)[^;}]*/g, '');

  css = css.replace(/[^;{}]*color\(display-p3[^)]*\)[^;}]*/g, '');

  if (css !== before) {
    writeFileSync(file, css);
    console.log(`  ${file}`);
  }
}

console.log(`CSS compat: ${totalStripped} specificity hacks stripped, ${totalUnwrapped} @supports unwrapped across ${cssFiles.length} file(s)`);
