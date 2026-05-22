/**
 * Tailwind v4 `@theme {}` body extractor.
 *
 * css-tree's `walk()` does NOT descend into the bodies of unrecognized
 * at-rules. `@theme` and `@theme inline` are non-standard at-rules, so any
 * walk-based extraction misses every declaration inside. Regex over the
 * raw text is the correct approach for this shape (per the 2026-05-17
 * snooze finding).
 *
 * `@theme` bodies are flat -- declarations only, no nested selectors --
 * so a single `[^}]*` body capture is sufficient. Comments are stripped
 * before declaration parsing so they don't leak into values.
 */

import type { CssDeclaration } from './shapes.js';

const THEME_BLOCK = /@theme(?:\s+inline)?\s*\{([^}]*)\}/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const DECLARATION = /--([A-Za-z_-][\w-]*)\s*:\s*([^;]+);/g;

/**
 * Extract every `--name: value` declaration from every `@theme { ... }`
 * and `@theme inline { ... }` block in the source. Order preserved from
 * source.
 */
export function extractThemeBlocks(css: string): readonly CssDeclaration[] {
  const out: CssDeclaration[] = [];
  for (const match of css.matchAll(THEME_BLOCK)) {
    const body = (match[1] ?? '').replace(COMMENT, '');
    for (const decl of body.matchAll(DECLARATION)) {
      const name = decl[1];
      const value = decl[2];
      if (!name || !value) continue;
      out.push({ name, value: value.trim() });
    }
  }
  return out;
}
