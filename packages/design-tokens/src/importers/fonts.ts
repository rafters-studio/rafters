/**
 * Font family detection across source CSS.
 *
 * Surfaces every font family the designer has loaded or declared, so the
 * caller (init's typography role-walk) can prompt them to assign each
 * detection to a typography role (heading / body / code). The importer
 * never infers role assignment from source -- it just collects the list.
 *
 * Detection sources:
 *   1. `@import url("https://fonts.googleapis.com/css2?family=...")` --
 *      parse `family=` params (Google Fonts v1 and v2 URLs)
 *   2. `@font-face { font-family: "X" }` -- local-font and self-hosted
 *      declarations
 *   3. `--font-*: "X", sans-serif` declarations in `:root` AND `@theme`
 *      blocks -- the named-family Tailwind v4 convention
 *
 * Output is deduplicated by canonical family name (case-insensitive,
 * whitespace normalized). The first source wins on the `stack` value --
 * if `:root --font-sans` declares a full `"Inter Variable", sans-serif`
 * stack AND `@import` references `Inter`, the full stack survives.
 */

import * as csstree from 'css-tree';
import { extractShadcnRoot } from './shadcn.js';
import { extractThemeBlocks } from './theme.js';

/**
 * Generic font keywords that are NOT family names. Stripped when reading
 * the first family from a font stack so `serif, Georgia` doesn't surface
 * `serif` as a detected family.
 */
const GENERIC_KEYWORDS: ReadonlySet<string> = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);

/**
 * How a font family was detected. The build uses this to decide emission
 * strategy: `@import` for web URLs, `@font-face` for local files, nothing
 * for system/declaration-only fonts.
 *
 * Priority order for merge conflicts (same family from multiple sources):
 *   font-face (2) > google (1) > declaration (0)
 */
export type FontSource = 'google' | 'font-face' | 'declaration';

/** Numeric priority for FontSource merge -- higher wins. */
const SOURCE_PRIORITY: Readonly<Record<FontSource, number>> = {
  declaration: 0,
  google: 1,
  'font-face': 2,
};

export interface DetectedFont {
  /** Canonical family name, unquoted, single-spaced. e.g. `Inter`, `JetBrains Mono`. */
  readonly name: string;
  /** CSS value to set on the family token: full source stack if available, else the quoted bare name. */
  readonly stack: string;
  /**
   * Source declaration name (without the leading `--`) when this family
   * appeared in a `--font-*` declaration. Carries the designer's chosen
   * CSS-variable name through to the caller; the caller checks whether
   * the name matches a rafters base family (e.g. `font-sans`) to decide
   * whether the family was declared canonically or as a custom slot.
   * Absent for `@font-face`-only or `@import`-only families -- the
   * caller slugs the family name to synthesise a token name in that
   * case. Importer carries the signal but does not interpret it; the
   * canonical-base list lives in the registry, not in this module.
   */
  readonly sourceDeclName?: string;
  /**
   * Which detection path found this font. When the same family appears
   * from multiple sources, the merge keeps the most specific one:
   * `font-face` > `google` > `declaration`.
   */
  readonly source: FontSource;
}

/**
 * Detect every font family declared in source CSS. Order: source order of
 * first appearance.
 */
export function detectFonts(css: string): readonly DetectedFont[] {
  const found = new Map<string, DetectedFont>();

  const accept = (
    name: string | null,
    stack: string,
    source: FontSource,
    sourceDeclName?: string,
  ): void => {
    if (name === null) return;
    const canonical = normalizeFamilyName(name);
    if (canonical === '' || GENERIC_KEYWORDS.has(canonical.toLowerCase())) return;
    const key = canonical.toLowerCase();
    const existing = found.get(key);
    if (existing === undefined) {
      found.set(key, {
        name: canonical,
        stack,
        source,
        ...(sourceDeclName && { sourceDeclName }),
      });
      return;
    }
    // Merge: prefer the more specific source (font-face > google > declaration),
    // the fuller stack, and the first source declaration name.
    const mergedSource =
      SOURCE_PRIORITY[source] > SOURCE_PRIORITY[existing.source] ? source : existing.source;
    const mergedStack = stack.length > existing.stack.length ? stack : existing.stack;
    const mergedDeclName = existing.sourceDeclName ?? sourceDeclName;
    found.set(key, {
      name: existing.name,
      stack: mergedStack,
      source: mergedSource,
      ...(mergedDeclName && { sourceDeclName: mergedDeclName }),
    });
  };

  for (const family of extractGoogleFontFamilies(css)) {
    accept(family, quoteIfNeeded(family), 'google');
  }

  for (const family of extractFontFaceFamilies(css)) {
    accept(family, quoteIfNeeded(family), 'font-face');
  }

  const rootDecls = extractShadcnRoot(css);
  const themeDecls = extractThemeBlocks(css);
  for (const decl of [...rootDecls, ...themeDecls]) {
    if (!decl.name.startsWith('font-')) continue;
    const first = firstFamilyFromStack(decl.value);
    accept(first, decl.value.trim(), 'declaration', decl.name);
  }

  return Array.from(found.values());
}

/**
 * Parse `family=` parameters out of every Google Fonts `@import url(...)` in
 * the source. Handles v1 (`css?family=...`) and v2 (`css2?family=...&family=...`)
 * URL shapes; `+` decodes to space; the `:wght@...` axis suffix is stripped.
 */
function extractGoogleFontFamilies(css: string): string[] {
  const out: string[] = [];
  // Match @import url(...) with the URL captured between matching quotes.
  // The URL may contain `;` (Google Fonts axis suffixes like `wght@400;700`),
  // so quote boundaries -- not character classes -- delimit it.
  const IMPORT = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g;
  for (const match of css.matchAll(IMPORT)) {
    const url = match[1];
    if (url === undefined || !url.startsWith('https://fonts.googleapis.com/')) continue;
    const queryStart = url.indexOf('?');
    if (queryStart === -1) continue;
    const query = url.slice(queryStart + 1);
    for (const param of query.split('&')) {
      const [key, raw] = param.split('=');
      if (key !== 'family' || raw === undefined) continue;
      // `Inter:wght@400;700` -> `Inter`. `JetBrains+Mono` -> `JetBrains Mono`.
      const familyOnly = (raw.split(':')[0] ?? '').replace(/\+/g, ' ');
      try {
        const decoded = decodeURIComponent(familyOnly);
        if (decoded !== '') out.push(decoded);
      } catch {
        if (familyOnly !== '') out.push(familyOnly);
      }
    }
  }
  return out;
}

/**
 * Parse `font-family: "X"` declarations out of every `@font-face` block.
 * Uses css-tree (`@font-face` is a recognized at-rule so `walk()` descends
 * properly, unlike `@theme`).
 */
function extractFontFaceFamilies(css: string): string[] {
  const out: string[] = [];
  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(css);
  } catch {
    return out;
  }
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(atrule) {
      if (atrule.name !== 'font-face' || atrule.block === null) return;
      csstree.walk(atrule.block, {
        visit: 'Declaration',
        enter(decl) {
          if (decl.property.toLowerCase() !== 'font-family') return;
          const raw = csstree.generate(decl.value).trim();
          const name = stripQuotes(raw);
          if (name !== '') out.push(name);
        },
      });
    },
  });
  return out;
}

/**
 * Pull the first non-generic family out of a font stack value.
 *
 * `var(--name)` references ARE returned as the "family" -- Tailwind v4
 * `@theme inline` blocks declare every family slot as indirection
 * (`--font-display: var(--font-arvo-bold)`), and the runtime font
 * integration (next/font, astro-font) injects the real family name into
 * the referenced variable elsewhere. Preserving the var() lets the
 * cascade resolve at render time:
 *   .rafters/output/rafters.css emits `--rafters-font-display: var(--font-arvo-bold)`
 *   consumer Tailwind utility `font-display` -> `var(--rafters-font-display)`
 *   -> `var(--font-arvo-bold)` -> the runtime-injected family
 *
 * The role-walk uses `sourceDeclName` (the `--font-*` key) to identify
 * canonical slots, NOT this "name" -- so a var() value here doesn't
 * become a guess about which font fills which role.
 */
function firstFamilyFromStack(value: string): string | null {
  const parts = value.split(',');
  for (const raw of parts) {
    const stripped = stripQuotes(raw.trim());
    if (stripped === '' || GENERIC_KEYWORDS.has(stripped.toLowerCase())) continue;
    return stripped;
  }
  return null;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Collapse runs of whitespace; trim. CSS treats `"Open  Sans"` and `"Open Sans"` as different families, so we preserve the source's intent but kill leading/trailing slop. */
function normalizeFamilyName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Wrap in double quotes if the family contains a space or non-ident character. */
function quoteIfNeeded(name: string): string {
  if (/^[A-Za-z_-][\w-]*$/.test(name)) return name;
  return `"${name}"`;
}
