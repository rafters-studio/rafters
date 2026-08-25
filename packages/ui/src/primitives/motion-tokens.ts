/**
 * Runtime motion token accessor -- the JS half of "one token source, two
 * consumption surfaces".
 *
 * The five motion namespaces (duration, ease, delay, extent, period -- ruling
 * 019fc49f) are emitted as `--rafters-<namespace>-<member>` custom properties.
 * CSS utilities consume them through `var()`. Everything the browser cannot
 * express as a transition -- hover-intent delays, warm-reopen grace, settle
 * timing, presence timeouts -- has to consume the SAME values from JavaScript,
 * and until now it did so by hardcoding numbers in behaviour files. That is a
 * second source of truth, and it drifts.
 *
 * This file is COPYABLE. It ships to consumer projects through the registry
 * (`rafters add`), so it must stay dependency-free -- it imports no `@rafters/*`
 * workspace package, because a consumer does not have one. The vocabulary below
 * is spelled out here as literal unions; the design VALUES live only in the
 * emitted `--rafters-*` sheet and are read back through `getComputedStyle`.
 *
 * RESOLUTION ORDER (documented, in this order, always):
 *
 *   1. REDUCED MOTION. When the user prefers reduced motion, `duration` and
 *      `delay` resolve to zero and nothing else is consulted. `ease` and
 *      `extent` are shaped BY a duration rather than zeroed themselves, and
 *      `period` is exempt by law -- work loops slow, they never stop. This
 *      mirrors the exporter's REDUCED_MOTION_ZEROED set exactly (see
 *      `namespaceLeaf` in the motion generator).
 *   2. COMPUTED STYLE. `getComputedStyle(element).getPropertyValue('--rafters-...')`.
 *      A non-empty result is validated at the boundary and returned with
 *      `source: 'computed'`. PRESENCE, not truthiness: `0ms` is a real,
 *      resolved value and never falls through.
 *
 * There is no third "default value" step: this file holds NO table of numbers,
 * and must never hold one, because a number typed here is a number that can
 * disagree with the emitted sheet. What remains after the two outcomes above is
 * two terminal conditions, not a fallback:
 *
 *   - A DOM exists (`getComputedStyle` is callable) but the custom property
 *     resolves to nothing. The token sheet is missing or misauthored -- a
 *     build/authoring defect. THROW, naming the token (FAIL LOUD, below).
 *   - There is no environment to read from at all (`getComputedStyle` is not a
 *     function: true SSR, a worker). Return an inert `source: 'unavailable'`
 *     placeholder (see `UNAVAILABLE_VALUE`). This carries no design value; it
 *     exists only so a render-time `useMemo` can type-check before a DOM exists.
 *
 * FAIL LOUD (#1977 posture). An unknown namespace or member throws, naming the
 * token and listing the vocabulary -- the failure is almost always a near-miss,
 * and the fix is unguessable without the known names in front of you. A var
 * that is present but unparseable throws for the same reason: a silent default
 * would turn a typo in someone's theme into a mystery timing bug.
 */

import { z } from 'zod';
import { detectMotionPreference } from './intelligence-integration';

// ==================== The vocabulary ====================

/** The five namespaces of equal rank (ruling 019fc49f). */
export const MOTION_NAMESPACES = ['duration', 'ease', 'delay', 'extent', 'period'] as const;
export type MotionNamespace = (typeof MOTION_NAMESPACES)[number];

export type MotionDurationMember = 'instant' | 'micro' | 'fast' | 'moderate' | 'normal' | 'slow';
export type MotionEaseMember =
  | 'standard'
  | 'enter'
  | 'exit'
  | 'linear'
  | 'spring-smooth'
  | 'spring-snappy';

/**
 * Member names for every namespace.
 *
 * These are NAMES, not values -- the design values stay in the emitted sheet.
 * Each union is spelled out here (not derived from a workspace package) so this
 * file stays copyable and dependency-free; this is a source of VOCABULARY, not
 * of design truth. `assertVocabulary` below checks each union against
 * `MOTION_MEMBERS` at module load, catching an internal typo or duplication
 * between the declarations. (Detecting the emitted sheet drifting out from under
 * this file is a separate guardrail lint, deliberately not done here.)
 */
export type MotionDelayMember = 'hover-intent' | 'linger' | 'choreo-step' | 'stagger-step' | 'skip';
export type MotionExtentMember = 'pop' | 'press' | 'draw';
export type MotionPeriodMember = 'spin' | 'pulse' | 'blink' | 'shimmer';

/** The member type each namespace accepts. */
export interface MotionMemberOf {
  duration: MotionDurationMember;
  ease: MotionEaseMember;
  delay: MotionDelayMember;
  extent: MotionExtentMember;
  period: MotionPeriodMember;
}

/** Namespaces whose values are times, and so can be read as milliseconds. */
export const MOTION_TIME_NAMESPACES = ['duration', 'delay', 'period'] as const;
export type MotionTimeNamespace = (typeof MOTION_TIME_NAMESPACES)[number];

/**
 * Namespaces that go to zero under `prefers-reduced-motion`. Mirrors the
 * exporter's REDUCED_MOTION_ZEROED set: `ease` and `extent` are shaped by a
 * duration rather than zeroed, and `period` is exempt by law.
 */
const REDUCED_MOTION_ZEROED: ReadonlySet<MotionNamespace> = new Set(['duration', 'delay']);

// ==================== The vocabulary table ====================

/**
 * The member names of each namespace -- NAMES only, never values. Nothing here
 * can encode a design number, so nothing here can disagree with the emitted
 * sheet. It exists to validate the member unions above and to name the known
 * members when a lookup misses (`requireMember`).
 */
const MOTION_MEMBERS: Readonly<Record<MotionNamespace, readonly string[]>> = {
  duration: ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'],
  ease: ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'],
  delay: ['hover-intent', 'linger', 'choreo-step', 'stagger-step', 'skip'],
  extent: ['pop', 'press', 'draw'],
  period: ['spin', 'pulse', 'blink', 'shimmer'],
};

/**
 * Cross-check a declared member union against `MOTION_MEMBERS`, both ways. This
 * catches an internal typo or duplication between the declaration and the table
 * at module load. It cannot see the emitted sheet drifting out from under this
 * file -- that gap is intentional and belongs to a separate guardrail lint.
 */
function assertVocabulary(namespace: MotionNamespace, declared: readonly string[]): void {
  const actual = [...MOTION_MEMBERS[namespace]].sort();
  const expected = [...declared].sort();
  if (actual.join(',') !== expected.join(',')) {
    throw new Error(
      `motion accessor: the ${namespace} namespace is inconsistent. ` +
        `Table members: ${actual.join(', ')}. Accessor members: ${expected.join(', ')}.`,
    );
  }
}

assertVocabulary('duration', ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow']);
assertVocabulary('ease', ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy']);
assertVocabulary('delay', ['hover-intent', 'linger', 'choreo-step', 'stagger-step', 'skip']);
assertVocabulary('extent', ['pop', 'press', 'draw']);
assertVocabulary('period', ['spin', 'pulse', 'blink', 'shimmer']);

// ==================== The boundary ====================

/**
 * Zod schemas for values crossing in from the DOM. A custom property is author
 * input: anything can be written into it, so it is validated exactly like any
 * other external data.
 */
const TimeValueSchema = z
  .string()
  .regex(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)$/, 'expected a CSS time (e.g. 200ms, 1.25s)');
const EaseValueSchema = z.string().min(1, 'expected a CSS easing function');
const ExtentValueSchema = z
  .string()
  .regex(
    /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:%|px|rem|em)?$/,
    'expected a unitless number or a CSS length/percentage',
  );

const NAMESPACE_SCHEMA: Readonly<Record<MotionNamespace, z.ZodType<string>>> = {
  duration: TimeValueSchema,
  ease: EaseValueSchema,
  delay: TimeValueSchema,
  extent: ExtentValueSchema,
  period: TimeValueSchema,
};

// ==================== Resolution ====================

export interface MotionTokenOptions {
  /**
   * The element whose computed style is read. Defaults to the document root,
   * which is where the emitted sheet declares the namespaces. Pass a component
   * element when a scoped override may apply to it.
   */
  element?: Element | null | undefined;
  /**
   * Override the reduced-motion decision. Left unset, the accessor asks the
   * media query (SSR-safe: no window means 'normal').
   */
  motionPreference?: 'reduced' | 'normal' | undefined;
}

/**
 * Where a resolved value came from. `reduced-motion` and `computed` are the two
 * real outcomes; `unavailable` marks the inert no-environment placeholder (see
 * `UNAVAILABLE_VALUE`), which carries no design value at all.
 */
export type MotionTokenSource = 'reduced-motion' | 'computed' | 'unavailable';

export interface MotionTokenResolution {
  /** The system token name, e.g. `rafters-delay-hover-intent`. */
  token: string;
  /** The CSS custom property, e.g. `--rafters-delay-hover-intent`. */
  customProperty: string;
  namespace: MotionNamespace;
  member: string;
  value: string;
  source: MotionTokenSource;
}

/** The system token name a namespace member owns. Mirrors the generator. */
export function motionTokenName(namespace: MotionNamespace, member: string): string {
  return `rafters-${namespace}-${member}`;
}

function requireMember(namespace: MotionNamespace, member: string): void {
  if (!MOTION_MEMBERS[namespace].includes(member)) {
    throw new Error(
      `motion accessor: unknown motion token "${motionTokenName(namespace, member)}" -- ` +
        `no member "${member}" in the ${namespace} namespace. ` +
        `Known ${namespace} members: ${[...MOTION_MEMBERS[namespace]].sort().join(', ')}.`,
    );
  }
}

function requireNamespace(namespace: string): MotionNamespace {
  if (!(MOTION_NAMESPACES as readonly string[]).includes(namespace)) {
    throw new Error(
      `motion accessor: unknown motion namespace "${namespace}". ` +
        `Known namespaces: ${MOTION_NAMESPACES.join(', ')}.`,
    );
  }
  return namespace as MotionNamespace;
}

/**
 * The result of reading a custom property, with the two empty cases kept apart
 * because they mean different things now:
 *
 *   - `value`: the property resolved to a non-empty string.
 *   - `absent`: a DOM exists but the property resolves to nothing. A build or
 *     authoring defect (the token sheet is missing) -- the caller throws.
 *   - `unavailable`: there is no environment to read from at all (no
 *     `getComputedStyle`, or no element to read off). True SSR -- the caller
 *     returns an inert placeholder rather than throwing.
 */
type CustomPropertyRead =
  | { readonly kind: 'value'; readonly value: string }
  | { readonly kind: 'absent' }
  | { readonly kind: 'unavailable' };

/**
 * INERT PLACEHOLDER -- ENGINEERING FAILSAFE, OUTSIDE THE VALUE SYSTEM.
 *
 * State it plainly, the way `use-presence.ts` classifies its `fallbackMs`
 * constants (its own doc comment there is the precedent). This value is NOT a
 * design number: it is not a perceptual fact and not a designer's personality,
 * so it does not belong in the five namespaces and must never be tuned. It is
 * returned only from the no-environment (`source: 'unavailable'`) branch, which
 * is reachable because `resolveMotionToken` runs inside a render-time
 * `React.useMemo` (tooltip.tsx / navigation-menu.tsx) that also executes during
 * Astro SSR, before any DOM exists. Nothing fires pointer events server-side,
 * so this is never perceived as motion; the delay closures that capture it
 * (`createControlledHoverDelay` in hover-delay.ts) are re-created the moment the
 * client has a DOM and a real computed value. It exists ONLY so those closures
 * can type-check before a DOM exists. It reads as an inert `0ms` -- do not
 * promote it to a token, and do not read it as though it were one.
 */
const UNAVAILABLE_VALUE = '0ms';

/** Read a custom property off the computed style. See {@link CustomPropertyRead}. */
function readCustomProperty(
  customProperty: string,
  element: Element | null | undefined,
): CustomPropertyRead {
  if (typeof globalThis.getComputedStyle !== 'function') return { kind: 'unavailable' };
  const target = element ?? (typeof document === 'undefined' ? null : document.documentElement);
  if (target === null) return { kind: 'unavailable' };
  const raw = globalThis.getComputedStyle(target).getPropertyValue(customProperty).trim();
  return raw === '' ? { kind: 'absent' } : { kind: 'value', value: raw };
}

/**
 * Resolve one motion token, reporting where the value came from.
 *
 * Callers that only need the value use {@link motionValue}; callers that need
 * milliseconds use {@link motionTimeMs}. This is the full form, and the one
 * tests assert the resolution order against.
 */
export function resolveMotionToken<N extends MotionNamespace>(
  namespace: N,
  member: MotionMemberOf[N],
  options: MotionTokenOptions = {},
): MotionTokenResolution {
  const ns = requireNamespace(namespace);
  requireMember(ns, member);
  const token = motionTokenName(ns, member);
  const customProperty = `--${token}`;

  const preference = options.motionPreference ?? detectMotionPreference();
  if (preference === 'reduced' && REDUCED_MOTION_ZEROED.has(ns)) {
    return { token, customProperty, namespace: ns, member, value: '0ms', source: 'reduced-motion' };
  }

  const read = readCustomProperty(customProperty, options.element);

  if (read.kind === 'unavailable') {
    // True SSR / no environment -- return the inert failsafe, never throw. A
    // throw here would turn a server-rendered page into a 500 (see
    // UNAVAILABLE_VALUE for why this path is reachable at render time).
    return {
      token,
      customProperty,
      namespace: ns,
      member,
      value: UNAVAILABLE_VALUE,
      source: 'unavailable',
    };
  }

  if (read.kind === 'absent') {
    // A DOM exists but the custom property is declared nowhere: the token sheet
    // is missing or misauthored. FAIL LOUD -- a silent default would hide a
    // real build/authoring defect.
    throw new Error(
      `motion accessor: motion token "${token}" (${customProperty}) is not declared on the ` +
        `read element and no design-time default is available -- check that the token sheet ` +
        `is loaded.`,
    );
  }

  const parsed = NAMESPACE_SCHEMA[ns].safeParse(read.value);
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? 'invalid value';
    throw new Error(
      `motion accessor: motion token "${token}" resolved to "${read.value}", which is not a ` +
        `valid ${ns} value (${reason}).`,
    );
  }

  return { token, customProperty, namespace: ns, member, value: parsed.data, source: 'computed' };
}

/** The resolved CSS value of a motion token, e.g. `200ms` or `cubic-bezier(...)`. */
export function motionValue<N extends MotionNamespace>(
  namespace: N,
  member: MotionMemberOf[N],
  options?: MotionTokenOptions,
): string {
  return resolveMotionToken(namespace, member, options).value;
}

/**
 * Convert a CSS time to milliseconds. Throws rather than defaulting: the value
 * has already passed the schema, so a failure here is a bug in this file.
 */
function timeToMs(value: string, token: string): number {
  const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(ms|s)$/.exec(value);
  if (match === null) {
    throw new Error(`motion accessor: motion token "${token}" value "${value}" is not a CSS time.`);
  }
  const magnitude = Number(match[1]);
  return match[2] === 's' ? magnitude * 1000 : magnitude;
}

/** A time-namespace token in milliseconds. */
export function motionTimeMs<N extends MotionTimeNamespace>(
  namespace: N,
  member: MotionMemberOf[N],
  options?: MotionTokenOptions,
): number {
  const resolution = resolveMotionToken(namespace, member, options);
  return timeToMs(resolution.value, resolution.token);
}

/** `--rafters-delay-<member>` in milliseconds. The JS-consumed delay cells. */
export function motionDelayMs(member: MotionDelayMember, options?: MotionTokenOptions): number {
  return motionTimeMs('delay', member, options);
}

/** `--rafters-duration-<member>` in milliseconds. Travel and settle timing. */
export function motionDurationMs(
  member: MotionDurationMember,
  options?: MotionTokenOptions,
): number {
  return motionTimeMs('duration', member, options);
}

/** `--rafters-period-<member>` in milliseconds. Loops -- never zeroed. */
export function motionPeriodMs(member: MotionPeriodMember, options?: MotionTokenOptions): number {
  return motionTimeMs('period', member, options);
}

/** `--rafters-ease-<member>` as a CSS easing function. */
export function motionEase(member: MotionEaseMember, options?: MotionTokenOptions): string {
  return motionValue('ease', member, options);
}
