/**
 * Fill signature (#1637).
 *
 * A fill is a SIGNATURE: a compact form that sets namespaced classes and
 * existing Tailwind utilities on things. Not a grammar, not an adjective
 * system. The phrase is color vocabulary only:
 *
 *   word            solid          fill="barbie-pink"
 *   word/alpha      with opacity   fill="muted/50"        (Tailwind's slash, verbatim)
 *   word-to-word    2-stop gradient  fill="barbie-pink-to-ken-brown"
 *
 * '-to-' is RESERVED in the color namer (generated names can never contain
 * it), so splitting at the first '-to-' is deterministic without vocabulary.
 * With a vocabulary present, every word must resolve or the signature is
 * rejected naming the unresolvable word (the #1632 lesson: hyphens are
 * overloaded in generated names; split only at reserved separators and
 * validate every side).
 *
 * Everything else -- blur, blend, direction -- is already Tailwind's
 * namespace; our tokens set the VALUES behind those words (what
 * backdrop-blur-sm ends up as). Those words are spoken as plain utilities
 * where class lists are legitimate. Not fill's job.
 *
 * Dark contract: falls out of which utility is emitted. Semantic words
 * compile to utilities over flipping vars (bg-primary follows .dark);
 * family words compile to literal scale utilities (never flip).
 */

export interface FillStop {
  /** A vocabulary word: semantic role, family, or family-position. */
  word: string;
  /** Tailwind slash-opacity, integer 0-100. Absent = opaque. */
  alpha?: number;
}

export interface FillSignature {
  /** One stop = solid; two stops = linear gradient (to-b). */
  stops: [FillStop] | [FillStop, FillStop];
}

export type FillParseResult =
  | { ok: true; signature: FillSignature }
  | { ok: false; word: string; reason: string };

export type FillContext = 'surface' | 'text';

/**
 * Hyphen segments reserved across the system (#1637). The fill parser
 * splits at '-to-'; 'via' and 'from' are Tailwind's other gradient
 * connectors and are reserved alongside so they can join the signature
 * without a namer migration. The color namer's bank invariant test
 * imports this list -- one copy of the reservation.
 */
export const RESERVED_FILL_SEGMENTS = ['to', 'via', 'from'] as const;

const SEPARATOR = `-${RESERVED_FILL_SEGMENTS[0]}-`;
const ALPHA_PATTERN = /^(100|[1-9]?[0-9])$/;
const WORD_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function parseStop(term: string): FillStop | { word: string; reason: string } {
  const slash = term.indexOf('/');
  const word = slash === -1 ? term : term.slice(0, slash);
  if (!WORD_PATTERN.test(word)) {
    return { word: word || term, reason: 'not a vocabulary word' };
  }
  if (slash === -1) return { word };
  const alphaRaw = term.slice(slash + 1);
  if (!ALPHA_PATTERN.test(alphaRaw)) {
    return { word, reason: `invalid opacity "/${alphaRaw}" (integer 0-100)` };
  }
  return { word, alpha: Number(alphaRaw) };
}

/**
 * Parse a fill signature. Syntax only -- vocabulary validation is the
 * caller's job via `validateFillSignature` wherever a registry exists
 * (build, tests, MCP). Runtime components expand optimistically; the
 * build-time safelist pass is the strict gate.
 */
export function parseFillSignature(input: string): FillParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, word: input, reason: 'empty fill' };
  }
  if (trimmed.includes(' ')) {
    return {
      ok: false,
      word: trimmed,
      reason:
        'fill is a single signature -- other utilities are plain Tailwind words in the class list',
    };
  }

  const split = trimmed.indexOf(SEPARATOR);
  if (split === -1) {
    const stop = parseStop(trimmed);
    if ('reason' in stop) return { ok: false, ...stop };
    return { ok: true, signature: { stops: [stop] } };
  }

  const left = trimmed.slice(0, split);
  const right = trimmed.slice(split + SEPARATOR.length);
  if (right.includes(SEPARATOR)) {
    return {
      ok: false,
      word: trimmed,
      reason: 'three-stop gradients are not supported (two stops only)',
    };
  }
  const from = parseStop(left);
  if ('reason' in from) return { ok: false, ...from };
  const to = parseStop(right);
  if ('reason' in to) return { ok: false, ...to };
  return { ok: true, signature: { stops: [from, to] } };
}

/**
 * Validate every word in a parsed signature against a vocabulary.
 * Returns null when valid, else the first unresolvable word.
 */
export function validateFillSignature(
  signature: FillSignature,
  hasWord: (word: string) => boolean,
): string | null {
  for (const stop of signature.stops) {
    if (!hasWord(stop.word)) return stop.word;
  }
  return null;
}

/**
 * The surface roles whose `{word}-foreground` pair is guaranteed by the
 * frozen contract (shadcn drop-in names plus rafters role extensions --
 * doctrine: contract names are frozen interface). Pairing is membership
 * here, never spelling: family words (barbie-pink, blue-300) and unknown
 * words never pair, so no phantom text-*-foreground class ever ships.
 */
const PAIRED_SURFACE_ROLES = new Set([
  'background',
  'card',
  'panel',
  'popover',
  'surface',
  'primary',
  'secondary',
  'muted',
  'accent',
  'destructive',
  'success',
  'warning',
  'info',
  'alert',
  'highlight',
  'selection',
  'sidebar',
  'nav',
  'tooltip',
  'overlay',
  'table',
  'table-header',
  'code',
  'badge',
  'avatar',
  'input',
]);

/**
 * The paired foreground word for a surface word, or null when pairing
 * does not apply. `background` pairs irregularly with `foreground`.
 * With a vocabulary present (`hasWord`), any word whose `-foreground`
 * pair resolves may pair; without one, only the frozen role set does.
 */
export function foregroundWordFor(
  word: string,
  hasWord?: (word: string) => boolean,
): string | null {
  const pair = word === 'background' ? 'foreground' : `${word}-foreground`;
  if (hasWord) return hasWord(pair) ? pair : null;
  return PAIRED_SURFACE_ROLES.has(word) ? pair : null;
}

function stopClass(prefix: string, stop: FillStop): string {
  return stop.alpha === undefined
    ? `${prefix}-${stop.word}`
    : `${prefix}-${stop.word}/${stop.alpha}`;
}

/**
 * Expand a signature to its class words. Surface context emits the
 * background (and the paired foreground when one exists in the
 * vocabulary); text context emits text color, or gradient text via
 * bg-clip-text. Gradients emit Tailwind v4 utilities (bg-linear-to-b --
 * bg-gradient-to-* is a deprecated v3 alias and is never emitted).
 */
export function expandFillSignature(
  signature: FillSignature,
  context: FillContext,
  hasWord?: (word: string) => boolean,
): string {
  const [first, second] = signature.stops;

  if (!second) {
    if (context === 'text') return stopClass('text', first);
    const parts = [stopClass('bg', first)];
    const fg = foregroundWordFor(first.word, hasWord);
    if (fg) parts.push(`text-${fg}`);
    return parts.join(' ');
  }

  const gradient = ['bg-linear-to-b', stopClass('from', first), stopClass('to', second)];
  if (context === 'text') {
    return [...gradient, 'bg-clip-text', 'text-transparent'].join(' ');
  }
  const fg = foregroundWordFor(first.word, hasWord);
  if (fg) gradient.push(`text-${fg}`);
  return gradient.join(' ');
}
