/**
 * Writing systems and their fonts (#2742).
 *
 * The one place a writing system maps to a font. `rafters init` asks which
 * writing systems a project supports (ISO 15924 script codes), records the
 * answer in the config, and builds the `font-sans` stack and the Fontsource
 * imports from it. Each Fontsource package declares `unicode-range`, so a
 * page downloads only the scripts it renders.
 *
 * Leaf module: imports nothing, so `types.ts` can derive its default stack
 * from it without a cycle.
 */

export interface ScriptFont {
  /** CSS font-family the Fontsource package declares. */
  family: string;
  /** Fontsource variable package that loads the family. */
  package: string;
  /** True for right-to-left scripts. */
  rtl: boolean;
  /** Prompt label for the writing system. */
  label: string;
}

const LATIN_GREEK_CYRILLIC: ScriptFont = {
  family: 'Noto Sans Variable',
  package: '@fontsource-variable/noto-sans',
  rtl: false,
  label: 'Latin, Greek, Cyrillic (English, Spanish, Russian, ...)',
};

/** ISO 15924 script code -> the Noto family that renders it. Table order is stack order. */
export const SCRIPT_FONTS: Record<string, ScriptFont> = {
  Latn: LATIN_GREEK_CYRILLIC,
  Grek: LATIN_GREEK_CYRILLIC,
  Cyrl: LATIN_GREEK_CYRILLIC,
  Arab: {
    family: 'Noto Sans Arabic Variable',
    package: '@fontsource-variable/noto-sans-arabic',
    rtl: true,
    label: 'Arabic (Arabic, Persian, Urdu)',
  },
  Hebr: {
    family: 'Noto Sans Hebrew Variable',
    package: '@fontsource-variable/noto-sans-hebrew',
    rtl: true,
    label: 'Hebrew',
  },
  Deva: {
    family: 'Noto Sans Devanagari Variable',
    package: '@fontsource-variable/noto-sans-devanagari',
    rtl: false,
    label: 'Devanagari (Hindi, Marathi, Nepali)',
  },
  Thai: {
    family: 'Noto Sans Thai Variable',
    package: '@fontsource-variable/noto-sans-thai',
    rtl: false,
    label: 'Thai',
  },
  Hans: {
    family: 'Noto Sans SC Variable',
    package: '@fontsource-variable/noto-sans-sc',
    rtl: false,
    label: 'Chinese, Simplified',
  },
  Hant: {
    family: 'Noto Sans TC Variable',
    package: '@fontsource-variable/noto-sans-tc',
    rtl: false,
    label: 'Chinese, Traditional',
  },
  Jpan: {
    family: 'Noto Sans JP Variable',
    package: '@fontsource-variable/noto-sans-jp',
    rtl: false,
    label: 'Japanese',
  },
  Kore: {
    family: 'Noto Sans KR Variable',
    package: '@fontsource-variable/noto-sans-kr',
    rtl: false,
    label: 'Korean',
  },
};

/** Latin, Greek and Cyrillic: the coverage of the default stack before #2742. */
export const DEFAULT_SCRIPTS: readonly string[] = ['Latn', 'Grek', 'Cyrl'];

/**
 * Resolve codes to their fonts in table order, each font once. Throws on an
 * unknown code, naming it and listing the known ones.
 */
function fontsFor(scripts: readonly string[]): ScriptFont[] {
  const known = Object.keys(SCRIPT_FONTS);
  const unknown = scripts.filter((code) => !Object.hasOwn(SCRIPT_FONTS, code));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown writing system ${unknown.map((c) => `"${c}"`).join(', ')}. Known ISO 15924 codes: ${known.join(', ')}.`,
    );
  }
  const wanted = new Set(scripts);
  const fonts: ScriptFont[] = [];
  for (const code of known) {
    const font = SCRIPT_FONTS[code];
    if (font === undefined || !wanted.has(code) || fonts.includes(font)) continue;
    fonts.push(font);
  }
  return fonts;
}

/** The `font-sans` stack for the given scripts: each Noto family once, then `sans-serif`. */
export function fontStackFor(scripts: readonly string[]): string {
  return [...fontsFor(scripts).map((f) => `'${f.family}'`), 'sans-serif'].join(', ');
}

/** The Fontsource packages that load the given scripts, in stack order. */
export function fontImportsFor(scripts: readonly string[]): string[] {
  return fontsFor(scripts).map((f) => f.package);
}
