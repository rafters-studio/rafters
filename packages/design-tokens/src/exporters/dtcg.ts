/**
 * DTCG Exporter
 *
 * Converts Rafters Token[] to a file that conforms to the Design Tokens
 * Format Module 2025.10 and its Color Module.
 *
 * - A token's path is its name split on `-` (empty segments dropped), so
 *   `zinc-600` lands at `zinc.600` and `card--dark` at `card.dark`. A token
 *   whose path is also a prefix of other paths is that group's `$root`.
 * - `$type` follows from the value, never from the name. CSS the spec can
 *   express (calc over tokens, em letter spacing, rgb(), shadow lists, the
 *   JSON payloads of typography, focus and motion semantics) is resolved to
 *   spec values; the original CSS stays at `$extensions.rafters.css`.
 * - A value no DTCG type carries is not a token: it is listed, verbatim, in
 *   the root record `$extensions.rafters.unrepresented`. Nothing is dropped.
 * - ColorReferences keep the role: `{neutral.50}` resolves through a role
 *   scale (`neutral.50` -> `{zinc.50}`), the DTCG twin of the CSS role scale.
 *
 * @see https://www.designtokens.org/TR/2025.10/format/
 * @see https://www.designtokens.org/TR/2025.10/color/
 */

import { REFERENCE_STEP_INDEX, SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
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
  /** Extra `$extensions.rafters` keys (payload keys the DTCG value cannot hold). */
  extras?: Record<string, unknown>;
}

interface Unrepresented {
  kind: 'unrepresented';
  reason: string;
}

type Classified = Emitted | Unrepresented;

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

/** The payload keys a DTCG composite does not carry, kept under `$extensions.rafters`. */
function extrasOf(
  payload: Record<string, unknown>,
  carried: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([k]) => !carried.includes(k)));
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

  constructor(input: Token[]) {
    for (const token of input) {
      const existing = this.tokens.get(token.name);
      if (!existing) {
        this.tokens.set(token.name, token);
        continue;
      }
      if (JSON.stringify(existing.value) !== JSON.stringify(token.value)) {
        throw new Error(`toDTCG: duplicate token name "${token.name}" with different values`);
      }
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
        extras: extrasOf(payload, ['durationTier', 'curve']),
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
      extras: extrasOf(p, TYPOGRAPHY_KEYS),
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
      extras: extrasOf(p, ['width', 'style', 'color']),
    };
  }

  /** Every Ref inside a classified value. */
  static refsOf(value: unknown): Ref[] {
    if (value instanceof Ref) return [value];
    if (Array.isArray(value)) return value.flatMap((v) => DTCGBuilder.refsOf(v));
    if (isRecord(value)) return Object.values(value).flatMap((v) => DTCGBuilder.refsOf(v));
    return [];
  }

  build(options: Required<ToDTCGOptions>): DTCGFile {
    const names = [...this.tokens.keys(), ...this.roleScale.keys()];
    for (const name of names) this.classify(name);

    this.checkCycles(names);
    this.checkTargets(names);
    this.propagateUnrepresented(names);

    const emitted = names.filter((n) => this.classified.get(n)?.kind === 'token');
    const pathOwner = new Map<string, string>();
    for (const name of emitted) {
      const path = pathOf(name);
      const other = pathOwner.get(path);
      if (other !== undefined) {
        throw new Error(`toDTCG: tokens "${other}" and "${name}" both derive the path "${path}"`);
      }
      pathOwner.set(path, name);
    }
    const groups = new Set<string>();
    for (const path of pathOwner.keys()) {
      const segs = path.split('.');
      for (let i = 1; i < segs.length; i++) groups.add(segs.slice(0, i).join('.'));
    }
    const layoutPath = (name: string): string => {
      const path = pathOf(name);
      return groups.has(path) ? `${path}.$root` : path;
    };

    const typeMemo = new Map<string, DTCGType>();
    const typeOf = (name: string): DTCGType => {
      const memo = typeMemo.get(name);
      if (memo) return memo;
      const c = this.classified.get(name);
      if (c?.kind !== 'token') throw new Error(`toDTCG: token "${name}" has no type`);
      const type = c.type ?? (c.value instanceof Ref ? typeOf(c.value.name) : undefined);
      if (!type) throw new Error(`toDTCG: token "${name}" has no type`);
      typeMemo.set(name, type);
      return type;
    };

    const render = (value: unknown): unknown => {
      if (value instanceof Ref) return `{${layoutPath(value.name)}}`;
      if (Array.isArray(value)) return value.map(render);
      if (isRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, render(v)]));
      }
      return value;
    };

    const root: Record<string, unknown> = {};
    for (const name of emitted) {
      const c = this.classified.get(name) as Emitted;
      const out: Record<string, unknown> = { $value: render(c.value), $type: typeOf(name) };
      const token = this.tokens.get(name);
      if (token) {
        if (token.description) out.$description = token.description;
        else if (token.semanticMeaning) out.$description = token.semanticMeaning;
        if (token.deprecated) out.$deprecated = true;
        if (options.includeExtensions) {
          const rafters: Record<string, unknown> = { ...buildExtensions(token), ...c.extras };
          if (typeof token.value === 'string') rafters.css = token.value;
          if (Object.keys(rafters).length > 0) out.$extensions = { rafters };
        }
      }
      const segs = layoutPath(name).split('.');
      let node = root;
      for (const seg of segs.slice(0, -1)) {
        const next = Object.hasOwn(node, seg) ? node[seg] : undefined;
        if (isRecord(next)) {
          node = next;
        } else {
          const group: Record<string, unknown> = {};
          node[seg] = group;
          node = group;
        }
      }
      node[segs[segs.length - 1] as string] = out;
    }

    const unrepresentedEntries: Array<[string, unknown]> = [];
    for (const [name, token] of this.tokens) {
      const c = this.classified.get(name);
      if (c?.kind === 'unrepresented') {
        unrepresentedEntries.push([
          name,
          { value: token.value, category: token.category, reason: c.reason },
        ]);
      }
    }
    // fromEntries defines own keys, so a token literally named __proto__ is kept, not swallowed.
    const unrepresented = Object.fromEntries(unrepresentedEntries);
    root.$extensions = { rafters: { unrepresented } };
    return root as DTCGFile;
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
            reason: `It references token "${dead.name}", which has no DTCG type.`,
          });
          changed = true;
        }
      }
    }
  }
}

/**
 * Rafters-specific extension data for a token
 */
function buildExtensions(token: Token): Record<string, unknown> {
  const extensions: Record<string, unknown> = {};

  // Core intelligence metadata
  if (token.semanticMeaning) extensions.semanticMeaning = token.semanticMeaning;
  if (token.usageContext) extensions.usageContext = token.usageContext;
  if (token.usagePatterns) extensions.usagePatterns = token.usagePatterns;

  // Dependency tracking
  if (token.dependsOn && token.dependsOn.length > 0) extensions.dependsOn = token.dependsOn;
  if (token.progressionSystem) extensions.progressionSystem = token.progressionSystem;
  if (token.mathRelationship) extensions.mathRelationship = token.mathRelationship;
  if (token.scalePosition !== undefined) extensions.scalePosition = token.scalePosition;

  // Responsive behavior
  if (token.containerQueryAware !== undefined) {
    extensions.containerQueryAware = token.containerQueryAware;
  }
  if (token.reducedMotionAware) extensions.reducedMotionAware = token.reducedMotionAware;

  // Motion metadata
  if (token.motionIntent) extensions.motionIntent = token.motionIntent;
  if (token.easingName) extensions.easingName = token.easingName;

  // Export hints
  if (token.generateUtilityClass !== undefined) {
    extensions.generateUtilityClass = token.generateUtilityClass;
  }
  if (token.tailwindOverride) extensions.tailwindOverride = token.tailwindOverride;
  if (token.customPropertyOnly) extensions.customPropertyOnly = token.customPropertyOnly;

  // Designer intent (the "why" layer)
  if (token.userOverride) extensions.userOverride = token.userOverride;
  if (token.computedValue !== undefined) extensions.computedValue = token.computedValue;
  if (token.generationRule) extensions.generationRule = token.generationRule;

  // Design system relationships
  if (token.pairedWith && token.pairedWith.length > 0) extensions.pairedWith = token.pairedWith;
  if (token.conflictsWith && token.conflictsWith.length > 0) {
    extensions.conflictsWith = token.conflictsWith;
  }
  if (token.applicableComponents && token.applicableComponents.length > 0) {
    extensions.applicableComponents = token.applicableComponents;
  }
  if (token.requiredForComponents && token.requiredForComponents.length > 0) {
    extensions.requiredForComponents = token.requiredForComponents;
  }

  // AI intelligence metadata
  if (token.trustLevel) extensions.trustLevel = token.trustLevel;
  if (token.cognitiveLoad !== undefined) extensions.cognitiveLoad = token.cognitiveLoad;
  if (token.consequence) extensions.consequence = token.consequence;
  if (token.accessibilityLevel) extensions.accessibilityLevel = token.accessibilityLevel;
  if (token.appliesWhen && token.appliesWhen.length > 0) extensions.appliesWhen = token.appliesWhen;

  return extensions;
}

/**
 * Options for DTCG conversion
 */
export interface ToDTCGOptions {
  /** Include per-token $extensions.rafters. Default true. Never removes the root unrepresented record. */
  includeExtensions?: boolean;
}

/**
 * Convert Token[] to a DTCG 2025.10 file.
 *
 * Needs the whole token set in one call: calc, em, shadow, colour-mix,
 * typography and role references read sibling tokens by name.
 *
 * Throws on a reference to a token that is not in the input, on a circular
 * reference chain, and on two input tokens with one name and different
 * values. A value no DTCG type carries never throws: it goes to the root
 * `$extensions.rafters.unrepresented` record.
 *
 * @example
 * ```typescript
 * const dtcg = toDTCG(generateBaseSystem().allTokens);
 * fs.writeFileSync('tokens.json', JSON.stringify(dtcg, null, 2));
 * ```
 */
export function toDTCG(tokens: Token[], options: ToDTCGOptions = {}): DTCGFile {
  const { includeExtensions = true } = options;
  return new DTCGBuilder(tokens).build({ includeExtensions });
}
