/**
 * DTCG Exporter
 *
 * Converts Rafters Token[] to one file per mode (light, dark) that conforms
 * to the Design Tokens Format Module 2025.10 and its Color Module, in the
 * subset Figma's Variables panel imports (one file per mode).
 *
 * - Each `$value` takes the form Figma reads: sRGB colours (mapped into sRGB
 *   with toGamutCeiling), `px` dimensions (rem x 16), `s` durations, one font
 *   family name, and font weights as numbers. Typography and shadow
 *   composites split into one variable per part, each carrying the Figma
 *   scope that binds it. A type Figma holds no variable for (cubicBezier,
 *   transition, border) is not a token.
 * - Every exported token rides whole in `$extensions.rafters.token`, beside
 *   its DTCG 2025.10 value (OKLCH, rem, ms, the full font stack, the
 *   composite) in `$extensions.rafters.value`, so nothing is lost.
 * - The dark file gives `X` the value of `X--dark`, so the files carry the
 *   same paths with the same types.
 *
 * - A token's path is its name split on `-` (empty segments dropped), so
 *   `zinc-600` lands at `zinc.600` and `card--dark` at `card.dark`. A token
 *   whose path is also a prefix of other paths is that group's `$root`.
 * - `$type` follows from the value, never from the name. CSS the spec can
 *   express (calc over tokens, em letter spacing, rgb(), shadow lists, the
 *   JSON payloads of typography, focus and motion semantics) is resolved to
 *   spec values; the original CSS stays at `$extensions.rafters.css`.
 * - A value no DTCG type or Figma variable carries is not a token: it is
 *   listed, whole, in the root record `$extensions.rafters.unrepresented`.
 *   Nothing is dropped.
 * - ColorReferences keep the role: `{neutral.50}` resolves through a role
 *   scale (`neutral.50` -> `{zinc.50}`), the DTCG twin of the CSS role scale.
 *
 * @see https://www.designtokens.org/TR/2025.10/format/
 * @see https://www.designtokens.org/TR/2025.10/color/
 */

import {
  oklchToSRGB,
  REFERENCE_STEP_INDEX,
  SCALE_POSITIONS,
  toGamutCeiling,
  tryParseColor,
} from '@rafters/color-utils';
import {
  type ColorReference,
  type ColorValue,
  type DTCGColorValue,
  type DTCGFile,
  SEMANTIC_FAMILY_ROLES,
  type Token,
} from '@rafters/shared';
import { NAMED_TRACKING, roleForPaletteReference } from './tailwind.js';

type DTCGType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'typography';

/** A reference to another token, by token name. Rendered as `{path}` once the layout is known. */
class Ref {
  constructor(readonly name: string) {}
}

interface Dimension {
  value: number;
  unit: 'px' | 'rem';
}

interface Emitted {
  kind: 'token';
  type?: DTCGType;
  /** A literal, a Ref, or a composite whose sub-values may be Refs. */
  value: unknown;
}

interface Unrepresented {
  kind: 'unrepresented';
  reason: string;
}

type Classified = Emitted | Unrepresented;

/** The types a split composite part takes: the ones Figma reads. */
type PartType = 'color' | 'dimension' | 'number' | 'fontFamily' | 'string';

/** One variable a typography or shadow composite splits into. */
interface Part {
  /** Path below the composite's own path. */
  key: string;
  type: PartType;
  /** A Ref, or a literal in its DTCG 2025.10 form. */
  value: unknown;
  /** The Figma scope that binds it to its text or effect property. */
  scope: string;
}

/** One mode's file and what the mode comparison needs from it. */
interface ModeFile {
  file: DTCGFile;
  /** Path -> `$type`, for every token and part. */
  types: Map<string, string>;
  /** Path -> the token name that owns it. */
  owners: Map<string, string>;
  /** Source token name -> why it is not a variable. */
  unrepresented: Map<string, string>;
}

/** A literal resolved through any chain of references. */
type Literal = { type: DTCGType; value: unknown };

/** Thrown while resolving a literal when the chain reaches an unrepresented or missing token. */
class Unresolved {
  constructor(
    readonly target: string,
    readonly missing: boolean,
  ) {}
}

const ROLE_STEPS: readonly string[] = SCALE_POSITIONS;
const FAMILY_ROLES: ReadonlySet<string> = new Set(SEMANTIC_FAMILY_ROLES);

const NUMBER = String.raw`-?(?:\d+\.?\d*|\.\d+)`;
const DIMENSION_RE = new RegExp(`^(${NUMBER})(px|rem)$`);
const EM_RE = new RegExp(`^(${NUMBER})em$`);
const DURATION_RE = new RegExp(`^(${NUMBER})(ms|s)$`);
const NUMBER_RE = new RegExp(`^${NUMBER}$`);
const VAR_RE = /^var\(--([A-Za-z0-9_-]+)\)$/;
const CALC_RE = /^calc\((.+)\)$/;
const CUBIC_BEZIER_RE = /^cubic-bezier\(([^)]*)\)$/;
const COLOR_FN_RE = /^(#|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\()/i;
const COLOR_MIX_RE =
  /^color-mix\(\s*in\s+oklch\s*,\s*(var\(--[A-Za-z0-9_-]+\))\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/;

const EASING_KEYWORDS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

const STROKE_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  'inset',
]);

/** Categories whose bare `0` is a length (spacing-0, radius-none). */
const LENGTH_CATEGORIES = new Set(['spacing', 'radius', 'shadow', 'breakpoint', 'focus']);

const TYPOGRAPHY_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'];

/** The root font size rem is measured against; the generators assume 16px. */
const ROOT_FONT_SIZE = 16;

/** Types Figma holds no variable for. */
const UNHELD_TYPES: ReadonlySet<DTCGType> = new Set(['cubicBezier', 'transition', 'border']);

const FIGMA_SCOPES = 'com.figma.scopes';

/** OpenType weight names, as Figma lists font styles. */
const STYLE_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

const DARK_SUFFIX = '--dark';

const MODE_MISMATCH =
  'Its light and dark values take different forms, and both mode files must carry the same paths and types.';

function isColorValue(value: Token['value']): value is ColorValue {
  return typeof value === 'object' && value !== null && 'scale' in value;
}

function isColorReference(value: Token['value']): value is ColorReference {
  return typeof value === 'object' && value !== null && 'family' in value && 'position' in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Format §7.2.3 violation, naming the loop from where it closes. */
function circularError(chain: readonly string[], name: string): Error {
  const loop = chain.includes(name) ? chain.slice(chain.indexOf(name)) : chain;
  return new Error(`toDTCG: circular reference ${[...loop, name].join(' -> ')}`);
}

/** The path segments of a token name: split on `-`, empty segments dropped. */
function segmentsOf(name: string): string[] {
  return name.split('-').filter(Boolean);
}

function pathOf(name: string): string {
  return segmentsOf(name).join('.');
}

/** Format §5.1.1: a name must not be empty, start with `$`, or contain `{`, `}` or `.`. */
function invalidSegment(name: string): string | null {
  const segs = segmentsOf(name);
  if (segs.length === 0) return 'Its name has no path segments, and DTCG names must not be empty.';
  const bad = segs.find((s) => s.startsWith('$') || /[{}.]/.test(s));
  if (bad !== undefined) {
    return `Its path segment "${bad}" starts with $ or contains {, } or ., which DTCG names must not.`;
  }
  // These keys would write through to Object.prototype when the group tree is built.
  const reserved = segs.find((s) => s === '__proto__' || s === 'constructor' || s === 'prototype');
  return reserved === undefined
    ? null
    : `Its path segment "${reserved}" is a JavaScript object key the exported tree cannot hold.`;
}

/** Floating point noise from resolving calc and em values; colour components are never rounded. */
function tidy(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function toPx(d: Dimension): Dimension {
  return d.unit === 'rem' ? { value: tidy(d.value * ROOT_FONT_SIZE), unit: 'px' } : d;
}

function styleFor(weight: number): string {
  const hundred = Math.min(900, Math.max(100, Math.round(weight / 100) * 100));
  return STYLE_NAMES[hundred] ?? 'Regular';
}

/** An oklch colour as sRGB with hex; `mapped` when it lay outside sRGB. */
function toSRGB(color: DTCGColorValue): { value: DTCGColorValue; mapped: boolean } {
  const [l = 0, c = 0, h = 0] = color.components.map((x) => (x === 'none' ? 0 : x));
  const inside = toGamutCeiling({ l, c, h, alpha: 1 }, 'srgb');
  const { components, hex } = oklchToSRGB(inside);
  return {
    value: { colorSpace: 'srgb', components, alpha: color.alpha ?? 1, hex },
    mapped: inside.c !== c,
  };
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Split on a separator at parenthesis depth 0. */
function splitTopLevel(input: string, separator: ',' | ' '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    const isSeparator = separator === ' ' ? /\s/.test(ch) : ch === separator;
    if (isSeparator && depth === 0) {
      if (current.trim() !== '') parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

function parseDimension(s: string): Dimension | null {
  const m = DIMENSION_RE.exec(s);
  if (!m) return null;
  return { value: Number(m[1]), unit: m[2] as Dimension['unit'] };
}

function parseColorLiteral(s: string): DTCGColorValue | null {
  if (!COLOR_FN_RE.test(s)) return null;
  const parsed = tryParseColor(s);
  if (!parsed) return null;
  const value: DTCGColorValue = {
    colorSpace: 'oklch',
    components: [parsed.l, parsed.c, normalizeHue(parsed.h)],
  };
  if (parsed.alpha !== undefined && parsed.alpha < 1) value.alpha = parsed.alpha;
  return value;
}

function parseCubicBezier(s: string): [number, number, number, number] | null {
  const keyword = EASING_KEYWORDS[s];
  if (keyword) return keyword;
  const m = CUBIC_BEZIER_RE.exec(s);
  if (!m?.[1]) return null;
  const nums = m[1].split(',').map((p) => p.trim());
  if (nums.length !== 4 || !nums.every((p) => NUMBER_RE.test(p))) return null;
  const [x1, y1, x2, y2] = nums.map(Number) as [number, number, number, number];
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
  return [x1, y1, x2, y2];
}

function parseFontStack(s: string): string[] | null {
  if (s.includes('(')) return null;
  const items = s.split(',').map((p) => p.trim());
  const item = /^(?:'[^']*'|"[^"]*"|[A-Za-z][\w -]*)$/;
  if (!items.every((p) => item.test(p))) return null;
  const last = items[items.length - 1] ?? '';
  if (!GENERIC_FONT_FAMILIES.has(last) && items.length < 2) return null;
  return items.map((p) => p.replace(/^(['"])(.*)\1$/, '$2'));
}

/** Why a value matched no DTCG type: one sentence. */
function reasonFor(s: string): string {
  if (/^\(.*:.*\)$/.test(s)) return 'A CSS media query; DTCG 2025.10 has no media query type.';
  if (/\{[^}]*;[^}]*\}/.test(s)) return 'CSS keyframes; DTCG 2025.10 has no animation type.';
  if (s === 'none') return 'The CSS keyword none; DTCG 2025.10 has no type for an absent value.';
  const parts = splitTopLevel(s, ' ');
  if (parts.length > 1 && /^[a-z][a-z0-9-]*$/.test(parts[0] ?? '')) {
    return 'A CSS animation shorthand naming keyframes; DTCG 2025.10 has no animation type.';
  }
  if (parts.length > 1) {
    return 'A CSS shorthand of several values, and no DTCG 2025.10 composite type matches it.';
  }
  return `The CSS value "${s}" matches no DTCG 2025.10 type.`;
}

/**
 * Builds the export. Holds the token index, the role scales and the
 * classification of every token, then lays out the tree.
 */
class DTCGBuilder {
  private readonly tokens = new Map<string, Token>();
  /** Role scale step name (`neutral-50`) -> the family step it points at (`zinc-50`). */
  private readonly roleScale = new Map<string, string>();
  private readonly classified = new Map<string, Classified>();
  private readonly classifying: string[] = [];
  private readonly literalChain: string[] = [];
  private readonly parts = new Map<string, Part[]>();

  /**
   * @param hidden Names this file does not emit (every `X--dark` with an `X`).
   * @param stand Name -> the name whose value it takes in this file (the dark
   *   file's `X` takes `X--dark`'s).
   * @param forced Names made unrepresented, with why.
   */
  constructor(
    input: Token[],
    private readonly hidden: ReadonlySet<string> = new Set(),
    private readonly stand: ReadonlyMap<string, string> = new Map(),
    private readonly forced: ReadonlyMap<string, string> = new Map(),
  ) {
    for (const token of input) {
      const existing = this.tokens.get(token.name);
      if (existing && JSON.stringify(existing.value) !== JSON.stringify(token.value)) {
        throw new Error(`toDTCG: duplicate token name "${token.name}" with different values`);
      }
      // The last of equal duplicates wins, as in the registry.
      this.tokens.set(token.name, token);
    }
    this.buildRoleScales();
  }

  /**
   * One 11-step scale per family role with a root (as the CSS role scale), and
   * per token another token's ColorReference names as its family. Each step
   * points at the backing colour family, found by following the role token's
   * own ColorReference until it reaches a token that is not a ColorReference.
   */
  private buildRoleScales(): void {
    const roles = new Set<string>();
    for (const [name, token] of this.tokens) {
      if (
        FAMILY_ROLES.has(name) &&
        token.namespace === 'semantic' &&
        isColorReference(token.value)
      ) {
        roles.add(name);
      }
      if (isColorReference(token.value)) {
        const family = this.tokens.get(token.value.family);
        if (family && isColorReference(family.value)) roles.add(token.value.family);
      }
    }
    for (const role of roles) {
      const backing = this.backingFamily(role);
      for (const step of ROLE_STEPS) {
        const name = `${role}-${step}`;
        if (this.tokens.has(name)) {
          throw new Error(`toDTCG: role scale step "${name}" collides with an input token`);
        }
        this.roleScale.set(name, `${backing}-${step}`);
      }
    }
  }

  private backingFamily(role: string): string {
    const chain = [role];
    let current = role;
    for (;;) {
      const token = this.tokens.get(current);
      if (!token || !isColorReference(token.value)) return current;
      const next = token.value.family;
      if (chain.includes(next)) throw circularError(chain, next);
      chain.push(next);
      current = next;
    }
  }

  private has(name: string): boolean {
    return this.tokens.has(name) || this.roleScale.has(name);
  }

  /** NAME or NAME minus a leading `rafters-`, when either is a token. */
  private varTarget(expr: string): string | null {
    const m = VAR_RE.exec(expr);
    if (!m?.[1]) return null;
    const name = m[1];
    if (this.has(name)) return name;
    const bare = name.replace(/^rafters-/, '');
    return this.has(bare) ? bare : null;
  }

  classify(name: string): Classified {
    const done = this.classified.get(name);
    if (done) return done;
    if (this.classifying.includes(name)) throw circularError(this.classifying, name);
    this.classifying.push(name);
    let result: Classified;
    try {
      result = this.classifyUncached(name);
    } catch (e) {
      if (!(e instanceof Unresolved)) throw e;
      result = e.missing
        ? {
            kind: 'unrepresented',
            reason: `Its value needs "${e.target}", which is not a token.`,
          }
        : {
            kind: 'unrepresented',
            reason: `Its value needs token "${e.target}", which has no DTCG type.`,
          };
    } finally {
      this.classifying.pop();
    }
    this.classified.set(name, result);
    return result;
  }

  /** The literal a token resolves to, following references. Throws Unresolved. */
  private literalOf(name: string): Literal {
    if (!this.has(name)) throw new Unresolved(name, true);
    if (this.literalChain.includes(name)) throw circularError(this.literalChain, name);
    this.literalChain.push(name);
    try {
      const c = this.classify(name);
      if (c.kind === 'unrepresented') throw new Unresolved(name, false);
      if (c.value instanceof Ref) return this.literalOf(c.value.name);
      if (!c.type) throw new Unresolved(name, false);
      return { type: c.type, value: c.value };
    } finally {
      this.literalChain.pop();
    }
  }

  private dimensionOf(name: string): Dimension {
    const lit = this.literalOf(name);
    if (lit.type !== 'dimension' || !isRecord(lit.value)) throw new Unresolved(name, false);
    return lit.value as unknown as Dimension;
  }

  private classifyUncached(name: string): Classified {
    const roleTarget = this.roleScale.get(name);
    if (roleTarget !== undefined)
      return { kind: 'token', type: 'color', value: new Ref(roleTarget) };

    const token = this.tokens.get(name);
    if (!token) throw new Unresolved(name, true);

    const forced = this.forced.get(name);
    if (forced !== undefined) return { kind: 'unrepresented', reason: forced };

    const invalid = invalidSegment(name);
    if (invalid) return { kind: 'unrepresented', reason: invalid };

    const { value } = token;
    if (isColorValue(value)) {
      const step = SCALE_POSITIONS[REFERENCE_STEP_INDEX];
      return { kind: 'token', type: 'color', value: new Ref(`${name}-${step}`) };
    }
    if (isColorReference(value)) {
      // A stored palette reference keeps its role link when the CSS renders it through a role.
      const family = roleForPaletteReference(name, this.tokens) ?? value.family;
      return { kind: 'token', type: 'color', value: new Ref(`${family}-${value.position}`) };
    }
    // A fill recipe has no DTCG type: it is carried verbatim, as data (FR-RAF-FILL-002).
    if (typeof value !== 'string')
      return { kind: 'unrepresented', reason: 'A fill recipe has no DTCG type.' };
    return this.classifyString(token, value.trim());
  }

  private classifyString(token: Token, s: string): Classified {
    if (s.startsWith('{')) return this.classifyPayload(token, s);

    const alias = VAR_RE.test(s) ? this.varTarget(s) : null;
    if (alias !== null) return { kind: 'token', value: new Ref(alias) };

    const calc = CALC_RE.exec(s);
    if (calc?.[1]) {
      const dim = this.evaluateCalc(calc[1]);
      return dim
        ? { kind: 'token', type: 'dimension', value: dim }
        : { kind: 'unrepresented', reason: reasonFor(s) };
    }

    const dim = parseDimension(s);
    if (dim) return { kind: 'token', type: 'dimension', value: dim };

    const em = EM_RE.exec(s);
    if (em?.[1] !== undefined) return this.emDimension(token, Number(em[1]), s);
    if (s === '0') {
      if (token.category === 'typography') return this.emDimension(token, 0, s);
      if (LENGTH_CATEGORIES.has(token.category)) {
        return { kind: 'token', type: 'dimension', value: { value: 0, unit: 'px' } };
      }
    }

    const duration = DURATION_RE.exec(s);
    if (duration?.[1] !== undefined) {
      return {
        kind: 'token',
        type: 'duration',
        value: { value: Number(duration[1]), unit: duration[2] },
      };
    }

    if (NUMBER_RE.test(s)) {
      const n = Number(s);
      if (token.category === 'typography' && Number.isInteger(n) && n >= 100 && n <= 1000) {
        return { kind: 'token', type: 'fontWeight', value: n };
      }
      return { kind: 'token', type: 'number', value: n };
    }

    const bezier = parseCubicBezier(s);
    if (bezier) return { kind: 'token', type: 'cubicBezier', value: bezier };

    const color = parseColorLiteral(s);
    if (color) return { kind: 'token', type: 'color', value: color };

    const stack = parseFontStack(s);
    if (stack) return { kind: 'token', type: 'fontFamily', value: stack };

    const shadow = this.parseShadow(s);
    if (shadow) return { kind: 'token', type: 'shadow', value: shadow };

    return { kind: 'unrepresented', reason: reasonFor(s) };
  }

  /** `em` letter spacing x the font size the token depends on, in that size's unit. */
  private emDimension(token: Token, em: number, s: string): Classified {
    for (const dep of token.dependsOn ?? []) {
      if (!this.has(dep) || dep === token.name) continue;
      const lit = this.literalOf(dep);
      if (lit.type === 'dimension' && isRecord(lit.value)) {
        const size = lit.value as unknown as Dimension;
        return {
          kind: 'token',
          type: 'dimension',
          value: { value: tidy(em * size.value), unit: size.unit },
        };
      }
    }
    return {
      kind: 'unrepresented',
      reason: `The em length "${s}" names no font size token to resolve against.`,
    };
  }

  /** `calc(A op B)` where A and B are var() over tokens, numbers or lengths, op `*` or `/`. */
  private evaluateCalc(expr: string): Dimension | null {
    const parts = splitTopLevel(expr, ' ');
    if (parts.length !== 3) return null;
    const [left, op, right] = parts as [string, string, string];
    if (op !== '*' && op !== '/') return null;
    const operand = (p: string): Dimension | number | null => {
      if (NUMBER_RE.test(p)) return Number(p);
      const d = parseDimension(p);
      if (d) return d;
      const target = this.varTarget(p);
      if (target !== null) return this.dimensionOf(target);
      if (VAR_RE.test(p)) {
        throw new Unresolved(VAR_RE.exec(p)?.[1] ?? p, true);
      }
      return null;
    };
    const a = operand(left);
    const b = operand(right);
    if (a === null || b === null) return null;
    if (typeof a === 'object' && typeof b === 'number') {
      return { value: tidy(op === '*' ? a.value * b : a.value / b), unit: a.unit };
    }
    if (typeof a === 'number' && typeof b === 'object' && op === '*') {
      return { value: tidy(a * b.value), unit: b.unit };
    }
    return null;
  }

  /** A CSS shadow list: one object per comma-separated layer. */
  private parseShadow(s: string): Record<string, unknown>[] | null {
    const layers = splitTopLevel(s, ',');
    if (layers.length === 0) return null;
    const out: Record<string, unknown>[] = [];
    for (const layer of layers) {
      const parts = splitTopLevel(layer, ' ');
      if (parts.includes('inset')) return null;
      if (parts.length < 3 || parts.length > 5) return null;
      const colorPart = parts[parts.length - 1] ?? '';
      const lengths = parts.slice(0, -1).map((p) => this.shadowLength(p));
      if (lengths.some((l) => l === null)) return null;
      const color = this.shadowColor(colorPart);
      if (color === null) return null;
      const zero: Dimension = { value: 0, unit: 'px' };
      out.push({
        color,
        offsetX: lengths[0],
        offsetY: lengths[1],
        blur: lengths[2] ?? zero,
        spread: lengths[3] ?? zero,
      });
    }
    return out;
  }

  private shadowLength(p: string): Ref | Dimension | null {
    if (p === '0') return { value: 0, unit: 'px' };
    const d = parseDimension(p);
    if (d) return d;
    const target = this.varTarget(p);
    return target === null ? null : new Ref(target);
  }

  private shadowColor(p: string): Ref | DTCGColorValue | null {
    const target = this.varTarget(p);
    if (target !== null) return new Ref(target);
    const literal = parseColorLiteral(p);
    if (literal) return literal;
    // color-mix(in oklch, var(--x) N%, transparent): the colour of x with its alpha scaled by N%.
    const mix = COLOR_MIX_RE.exec(p);
    if (!mix?.[1] || mix[2] === undefined) return null;
    const mixTarget = this.varTarget(mix[1]);
    if (mixTarget === null) throw new Unresolved(VAR_RE.exec(mix[1])?.[1] ?? mix[1], true);
    const lit = this.literalOf(mixTarget);
    if (lit.type !== 'color' || !isRecord(lit.value)) throw new Unresolved(mixTarget, false);
    const base = lit.value as unknown as DTCGColorValue;
    return {
      colorSpace: base.colorSpace,
      components: [...base.components],
      alpha: tidy((base.alpha ?? 1) * (Number(mix[2]) / 100)),
    };
  }

  private classifyPayload(token: Token, s: string): Classified {
    let payload: unknown;
    try {
      payload = JSON.parse(s);
    } catch {
      return { kind: 'unrepresented', reason: reasonFor(s) };
    }
    if (!isRecord(payload)) return { kind: 'unrepresented', reason: reasonFor(s) };

    if (TYPOGRAPHY_KEYS.every((k) => typeof payload[k] === 'string')) {
      return this.typographyComposite(payload as Record<string, string>);
    }
    if (['width', 'style', 'color'].every((k) => typeof payload[k] === 'string')) {
      return this.focusBorder(payload as Record<string, string>);
    }
    if (typeof payload.durationTier === 'string' && typeof payload.curve === 'string') {
      return {
        kind: 'token',
        type: 'transition',
        value: {
          duration: new Ref(`rafters-duration-${payload.durationTier}`),
          delay: { value: 0, unit: 'ms' },
          timingFunction: new Ref(`rafters-ease-${payload.curve}`),
        },
      };
    }
    if (typeof payload.keyframe === 'string') {
      return {
        kind: 'unrepresented',
        reason:
          'A motion cell is a keyframe animation, and DTCG 2025.10 has no animation type; transition would misdescribe it.',
      };
    }
    return {
      kind: 'unrepresented',
      reason: `A JSON payload of ${token.category} metadata, which no DTCG 2025.10 type carries.`,
    };
  }

  private typographyComposite(p: Record<string, string>): Classified {
    const fontSize = new Ref(`font-size-${p.fontSize}`);
    const letterSpacingName = `letter-spacing-${p.letterSpacing}`;
    let letterSpacing: Ref | Dimension = new Ref(letterSpacingName);
    const named = p.letterSpacing === undefined ? undefined : NAMED_TRACKING[p.letterSpacing];
    if (!this.has(letterSpacingName) && named !== undefined) {
      // A named tracking value (the CSS exporter's NAMED_TRACKING), not a token: resolve it.
      const em = EM_RE.exec(named);
      if (em?.[1] === undefined) throw new Unresolved(letterSpacingName, true);
      const size = this.dimensionOf(fontSize.name);
      letterSpacing = { value: tidy(Number(em[1]) * size.value), unit: size.unit };
    }
    return {
      kind: 'token',
      type: 'typography',
      value: {
        fontFamily: new Ref(`font-${p.fontFamily}`),
        fontSize,
        fontWeight: new Ref(`font-weight-${p.fontWeight}`),
        letterSpacing,
        lineHeight: new Ref(`line-height-${p.lineHeight}`),
      },
    };
  }

  private focusBorder(p: Record<string, string>): Classified {
    const colorSrc = p.color ?? '';
    const colorTarget = this.varTarget(colorSrc);
    const color: Ref | DTCGColorValue | null =
      colorTarget !== null ? new Ref(colorTarget) : parseColorLiteral(colorSrc);
    if (color === null) {
      return {
        kind: 'unrepresented',
        reason: `Its colour "${colorSrc}" is not a token or a colour any DTCG colour space carries.`,
      };
    }
    const widthSrc = p.width ?? '';
    const widthTarget = this.varTarget(widthSrc);
    let width: Ref | Dimension | null = widthTarget !== null ? new Ref(widthTarget) : null;
    if (width === null) {
      const calc = CALC_RE.exec(widthSrc);
      width = calc?.[1] ? this.evaluateCalc(calc[1]) : parseDimension(widthSrc);
    }
    const style = p.style ?? '';
    if (width === null || !STROKE_STYLES.has(style)) {
      return {
        kind: 'unrepresented',
        reason: `The focus ring "${JSON.stringify(p)}" has no width or style a DTCG border carries.`,
      };
    }
    return {
      kind: 'token',
      type: 'border',
      value: { color, width, style },
    };
  }

  /** Every Ref inside a classified value. */
  static refsOf(value: unknown): Ref[] {
    if (value instanceof Ref) return [value];
    if (Array.isArray(value)) return value.flatMap((v) => DTCGBuilder.refsOf(v));
    if (isRecord(value)) return Object.values(value).flatMap((v) => DTCGBuilder.refsOf(v));
    return [];
  }

  /** The value's own type, else the type of the token its reference chain reaches. */
  private typeOf(name: string): DTCGType {
    const type = this.typeIfAny(name);
    if (type === null) throw new Error(`toDTCG: token "${name}" has no type`);
    return type;
  }

  /** As typeOf, or null when the chain reaches an unrepresented token. */
  private typeIfAny(name: string): DTCGType | null {
    const c = this.classified.get(name);
    if (c?.kind !== 'token') return null;
    if (c.type) return c.type;
    return c.value instanceof Ref ? this.typeIfAny(c.value.name) : null;
  }

  /** A composite part's literal: itself, or the literal its reference resolves to. */
  private partLiteral(part: unknown): unknown {
    return part instanceof Ref ? this.literalOf(part.name).value : part;
  }

  /**
   * Marks every token Figma cannot hold as a variable unrepresented, and
   * splits every typography and shadow composite into its parts.
   */
  private splitForFigma(names: string[]): void {
    for (const name of names) {
      const c = this.classified.get(name);
      const type = this.typeIfAny(name);
      // A chain that reaches an unrepresented token is propagated afterwards.
      if (c?.kind !== 'token' || type === null) continue;
      let result: Part[] | string | null = null;
      if (UNHELD_TYPES.has(type)) {
        result = `A ${type}; Figma variables hold only colours, numbers, strings and booleans.`;
      } else if (type === 'typography' || type === 'shadow') {
        if (c.value instanceof Ref) {
          result = `An alias of a ${type} composite; only a composite's own value splits into variables.`;
        } else {
          try {
            result =
              type === 'typography' ? this.typographyParts(c.value) : this.shadowParts(c.value);
          } catch (e) {
            if (!(e instanceof Unresolved)) throw e;
            result = `Its ${type} parts need token "${e.target}", which resolves to no value.`;
          }
        }
      }
      if (typeof result === 'string') {
        this.classified.set(name, { kind: 'unrepresented', reason: result });
      } else if (result) {
        this.parts.set(name, result);
      }
    }
  }

  /** Family, style, weight, size, line height (ratio x size, in px) and letter spacing. */
  private typographyParts(value: unknown): Part[] | string {
    if (!isRecord(value)) return 'A typography value that is not an object.';
    const weight = this.partLiteral(value.fontWeight);
    const ratio = this.partLiteral(value.lineHeight);
    const size = this.partLiteral(value.fontSize);
    if (typeof weight !== 'number' || typeof ratio !== 'number' || !isRecord(size)) {
      return 'Its weight, line height or size resolves to no value a text property binds to.';
    }
    const px = toPx(size as unknown as Dimension);
    return [
      { key: 'family', type: 'fontFamily', value: value.fontFamily, scope: 'FONT_FAMILY' },
      { key: 'style', type: 'string', value: styleFor(weight), scope: 'FONT_STYLE' },
      { key: 'weight', type: 'number', value: value.fontWeight, scope: 'FONT_WEIGHT' },
      { key: 'size', type: 'dimension', value: value.fontSize, scope: 'FONT_SIZE' },
      {
        key: 'lineHeight',
        type: 'dimension',
        value: { value: tidy(ratio * px.value), unit: 'px' },
        scope: 'LINE_HEIGHT',
      },
      {
        key: 'letterSpacing',
        type: 'dimension',
        value: value.letterSpacing,
        scope: 'LETTER_SPACING',
      },
    ];
  }

  /** Per layer: colour, offsets, blur and spread. */
  private shadowParts(value: unknown): Part[] | string {
    if (!Array.isArray(value)) return 'A shadow value that is not a list of layers.';
    return value.flatMap((layer: unknown, i): Part[] => {
      if (!isRecord(layer)) return [];
      const at = `layer${i + 1}`;
      const float = (key: string): Part => ({
        key: `${at}.${key}`,
        type: 'dimension',
        value: layer[key],
        scope: 'EFFECT_FLOAT',
      });
      return [
        { key: `${at}.color`, type: 'color', value: layer.color, scope: 'EFFECT_COLOR' },
        float('offsetX'),
        float('offsetY'),
        float('blur'),
        float('spread'),
      ];
    });
  }

  build(options: Required<ToDTCGOptions>, onGamutMapped: (name: string) => void): ModeFile {
    const names = [...this.tokens.keys(), ...this.roleScale.keys()];
    for (const name of names) this.classify(name);

    this.checkCycles(names);
    this.checkTargets(names);
    this.splitForFigma(names);
    this.propagateUnrepresented(names);

    const own = (name: string): string => this.stand.get(name) ?? name;
    const shown = names.filter((n) => !this.hidden.has(n));
    const emitted = shown.filter((n) => this.classified.get(own(n))?.kind === 'token');
    const pathOwner = new Map<string, string>();
    const claim = (path: string, name: string): void => {
      const other = pathOwner.get(path);
      if (other !== undefined && other !== name) {
        throw new Error(`toDTCG: tokens "${other}" and "${name}" both derive the path "${path}"`);
      }
      pathOwner.set(path, name);
    };
    for (const name of emitted) {
      const parts = this.parts.get(own(name));
      if (parts) for (const part of parts) claim(`${pathOf(name)}.${part.key}`, name);
      else claim(pathOf(name), name);
    }
    const groups = new Set<string>();
    for (const path of pathOwner.keys()) {
      const segs = path.split('.');
      for (let i = 1; i < segs.length; i++) groups.add(segs.slice(0, i).join('.'));
    }
    const layoutPath = (path: string): string => (groups.has(path) ? `${path}.$root` : path);

    const render = (value: unknown): unknown => {
      if (value instanceof Ref) return `{${layoutPath(pathOf(value.name))}}`;
      if (Array.isArray(value)) return value.map(render);
      if (isRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, render(v)]));
      }
      return value;
    };
    /** A literal in the form Figma reads: sRGB, px, s, one family name. */
    const figmaValue = (name: string, type: string, value: unknown): unknown => {
      if (value instanceof Ref) return render(value);
      if (type === 'color') {
        const { value: color, mapped } = toSRGB(value as DTCGColorValue);
        if (mapped) onGamutMapped(name);
        return color;
      }
      if (type === 'dimension') return toPx(value as Dimension);
      if (type === 'duration') {
        const d = value as { value: number; unit: string };
        return d.unit === 'ms' ? { value: tidy(d.value / 1000), unit: 's' } : d;
      }
      if (type === 'fontFamily' && Array.isArray(value)) return value[0];
      return value;
    };

    const root: Record<string, unknown> = {};
    const nodeAt = (segs: readonly string[]): Record<string, unknown> => {
      let node = root;
      for (const seg of segs) {
        const next = Object.hasOwn(node, seg) ? node[seg] : undefined;
        if (isRecord(next)) {
          node = next;
        } else {
          const group: Record<string, unknown> = {};
          node[seg] = group;
          node = group;
        }
      }
      return node;
    };
    const place = (path: string, out: Record<string, unknown>): void => {
      const segs = layoutPath(path).split('.');
      nodeAt(segs.slice(0, -1))[segs[segs.length - 1] as string] = out;
    };
    const types = new Map<string, string>();

    for (const name of emitted) {
      const c = this.classified.get(own(name)) as Emitted;
      const token = this.tokens.get(own(name));
      const meta: Record<string, unknown> = {};
      if (token?.description) meta.$description = token.description;
      else if (token?.semanticMeaning) meta.$description = token.semanticMeaning;
      if (token?.deprecated) meta.$deprecated = true;
      if (options.includeExtensions && token) {
        meta.$extensions = { rafters: { token, value: render(c.value) } };
      }
      const parts = this.parts.get(own(name));
      if (parts) {
        Object.assign(nodeAt(pathOf(name).split('.')), meta);
        for (const part of parts) {
          const path = `${pathOf(name)}.${part.key}`;
          place(path, {
            $value: figmaValue(own(name), part.type, part.value),
            $type: part.type,
            $extensions: { [FIGMA_SCOPES]: [part.scope] },
          });
          types.set(path, part.type);
        }
        continue;
      }
      const type = this.typeOf(own(name));
      const figmaType = type === 'fontWeight' ? 'number' : type;
      place(pathOf(name), {
        $value: figmaValue(own(name), type, c.value),
        $type: figmaType,
        ...meta,
      });
      types.set(pathOf(name), figmaType);
    }

    const unrepresented = new Map<string, string>();
    const unrepresentedEntries: Array<[string, unknown]> = [];
    for (const name of shown) {
      const c = this.classified.get(own(name));
      const token = this.tokens.get(own(name));
      if (c?.kind !== 'unrepresented' || !token) continue;
      unrepresented.set(token.name, c.reason);
      unrepresentedEntries.push([token.name, { reason: c.reason, token }]);
    }
    // fromEntries defines own keys, so a token literally named __proto__ is kept, not swallowed.
    root.$extensions = { rafters: { unrepresented: Object.fromEntries(unrepresentedEntries) } };
    return { file: root as DTCGFile, types, owners: pathOwner, unrepresented };
  }

  /** Format §7.2.3: no reference chain may be circular. */
  private checkCycles(names: string[]): void {
    const state = new Map<string, 'visiting' | 'done'>();
    const stack: string[] = [];
    const visit = (name: string): void => {
      const s = state.get(name);
      if (s === 'done') return;
      if (s === 'visiting') throw circularError(stack, name);
      const c = this.classified.get(name);
      if (c?.kind !== 'token') {
        state.set(name, 'done');
        return;
      }
      state.set(name, 'visiting');
      stack.push(name);
      for (const ref of DTCGBuilder.refsOf(c.value)) visit(ref.name);
      stack.pop();
      state.set(name, 'done');
    };
    for (const name of names) visit(name);
  }

  /** Format §7.4.5: a reference to a token not in the input is an error. */
  private checkTargets(names: string[]): void {
    for (const name of names) {
      const c = this.classified.get(name);
      if (c?.kind !== 'token') continue;
      for (const ref of DTCGBuilder.refsOf(c.value)) {
        if (!this.has(ref.name)) {
          throw new Error(
            `toDTCG: token "${name}" references "{${pathOf(ref.name)}}", which is not in the export`,
          );
        }
      }
    }
  }

  /** A token whose value references an unrepresented token is itself unrepresented. */
  private propagateUnrepresented(names: string[]): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const name of names) {
        const c = this.classified.get(name);
        if (c?.kind !== 'token') continue;
        const dead = DTCGBuilder.refsOf(c.value).find(
          (ref) => this.classified.get(ref.name)?.kind === 'unrepresented',
        );
        if (dead) {
          this.classified.set(name, {
            kind: 'unrepresented',
            reason: `It references token "${dead.name}", which is not a variable in this export.`,
          });
          changed = true;
        }
      }
    }
  }
}

/**
 * Options for DTCG conversion
 */
export interface ToDTCGOptions {
  /** Include per-token $extensions.rafters. Default true. Never removes the root unrepresented record. */
  includeExtensions?: boolean;
}

/** The export: one file per mode, and what the CLI reports from it. */
export interface DTCGExport {
  light: DTCGFile;
  dark: DTCGFile;
  /** Every token that is not a variable, with why; each is whole in the files' root record. */
  unrepresented: Array<{ name: string; reason: string }>;
  /** Every token whose colour lay outside sRGB and was mapped into it. */
  gamutMapped: string[];
}

/** Names whose path or type differs between the two mode files. */
function modeMismatches(light: ModeFile, dark: ModeFile): string[] {
  const names = new Set<string>();
  for (const [a, b] of [
    [light, dark],
    [dark, light],
  ] as const) {
    for (const [path, type] of a.types) {
      if (b.types.get(path) === type) continue;
      const owner = a.owners.get(path);
      if (owner !== undefined) names.add(owner);
    }
  }
  return [...names];
}

/**
 * Convert Token[] to a DTCG 2025.10 file per mode, in the form Figma imports.
 *
 * Needs the whole token set in one call: calc, em, shadow, colour-mix,
 * typography, role and dark references read sibling tokens by name. A token
 * `X--dark` whose `X` exists is X's dark value; any other token is in both.
 *
 * Throws on a reference to a token that is not in the input, on a circular
 * reference chain, and on two input tokens with one name and different
 * values. A value no Figma variable carries never throws: it goes to the root
 * `$extensions.rafters.unrepresented` record of each file it belongs to.
 *
 * @example
 * ```typescript
 * const { light, dark } = toDTCG(generateBaseSystem().allTokens);
 * fs.writeFileSync('light.tokens.json', JSON.stringify(light, null, 2));
 * ```
 */
export function toDTCG(tokens: Token[], options: ToDTCGOptions = {}): DTCGExport {
  const { includeExtensions = true } = options;
  const names = new Set(tokens.map((t) => t.name));
  const darkOf = new Map<string, string>();
  for (const { name } of tokens) {
    const base = name.endsWith(DARK_SUFFIX) ? name.slice(0, -DARK_SUFFIX.length) : null;
    if (base !== null && names.has(base)) darkOf.set(base, name);
  }
  const hidden = new Set(darkOf.values());

  const forced = new Map<string, string>();
  for (;;) {
    const gamut = new Set<string>();
    const build = (stand: ReadonlyMap<string, string>): ModeFile =>
      new DTCGBuilder(tokens, hidden, stand, forced).build({ includeExtensions }, (n) =>
        gamut.add(n),
      );
    const light = build(new Map());
    const dark = build(darkOf);
    const mismatched = modeMismatches(light, dark).filter((n) => !forced.has(n));
    if (mismatched.length > 0) {
      for (const n of mismatched) {
        forced.set(n, MODE_MISMATCH);
        const dark = darkOf.get(n);
        if (dark !== undefined) forced.set(dark, MODE_MISMATCH);
      }
      continue;
    }
    const unrepresented = new Map([...light.unrepresented, ...dark.unrepresented]);
    return {
      light: light.file,
      dark: dark.file,
      unrepresented: [...unrepresented].map(([name, reason]) => ({ name, reason })),
      gamutMapped: [...gamut].sort(),
    };
  }
}
