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
 * RESOLUTION ORDER (documented, in this order, always):
 *
 *   1. REDUCED MOTION. When the user prefers reduced motion, `duration` and
 *      `delay` resolve to zero and nothing else is consulted. `ease` and
 *      `extent` are shaped BY a duration rather than zeroed themselves, and
 *      `period` is exempt by law -- work loops slow, they never stop. This
 *      mirrors the exporter's REDUCED_MOTION_ZEROED set exactly (see
 *      `namespaceLeaf` in the motion generator).
 *   2. COMPUTED STYLE. `getComputedStyle(element).getPropertyValue('--rafters-...')`.
 *      A non-empty result is validated at the boundary and returned. PRESENCE,
 *      not truthiness: `0ms` is a real, resolved value and never falls through.
 *   3. BASELINE. No DOM (SSR, a worker, a test without a document) or a var
 *      that resolves to nothing: the generator's own default definitions.
 *
 * The baseline is DERIVED, never restated. `MOTION_BASELINE` is built from the
 * very definition tables the emission reads, through the very function the
 * emission calls (`deriveDuration` at the neutral intent). There is no second
 * table of numbers in this package, and there must never be one: a number typed
 * here is a number that can disagree with the emitted sheet.
 *
 * FAIL LOUD (#1977 posture). An unknown namespace or member throws, naming the
 * token and listing the vocabulary -- the failure is almost always a near-miss,
 * and the fix is unguessable without the known names in front of you. A var
 * that is present but unparseable throws for the same reason: a silent default
 * would turn a typo in someone's theme into a mystery timing bug.
 */

import {
  DEFAULT_DELAY_NAMESPACE,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_EXTENT_NAMESPACE,
  DEFAULT_PERIOD_NAMESPACE,
} from '@rafters/design-tokens/generators/defaults';
import { deriveDuration } from '@rafters/design-tokens/generators/motion-derivation';
import type { MotionBand } from '@rafters/design-tokens/generators/motion-derivation';
import { EASING_CURVES, MOTION_DURATION_SCALE } from '@rafters/design-tokens/generators/types';
import { z } from 'zod';
import { detectMotionPreference } from './intelligence-integration';

// ==================== The vocabulary ====================

/** The five namespaces of equal rank (ruling 019fc49f). */
export const MOTION_NAMESPACES = ['duration', 'ease', 'delay', 'extent', 'period'] as const;
export type MotionNamespace = (typeof MOTION_NAMESPACES)[number];

export type MotionDurationMember = (typeof MOTION_DURATION_SCALE)[number];
export type MotionEaseMember = (typeof EASING_CURVES)[number];

/**
 * Member names for the three authored namespaces.
 *
 * These are NAMES, not values -- the values stay in the generator. The union is
 * spelled out because the definition tables are `Record<string, ...>` and carry
 * no literal keys, and a `string` member would give callers no typing at all.
 * `assertVocabulary` below checks each union against the real table in both
 * directions at module load, so a namespace change fails here rather than
 * drifting quietly.
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

// ==================== The baseline, derived ====================

/**
 * The intent the shipped system emits at. `deriveDuration` returns each tier's
 * authored default here, which is exactly what the generator writes into
 * `--rafters-duration-*` for a fresh install.
 */
const BASELINE_INTENT = 'efficient';

function mapMemberValues(defs: Record<string, { value: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [member, def] of Object.entries(defs)) out[member] = def.value;
  return out;
}

function durationBaseline(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const band of Object.keys(DEFAULT_DURATION_DEFINITIONS)) {
    const ms = deriveDuration(band as MotionBand, BASELINE_INTENT, DEFAULT_DURATION_DEFINITIONS);
    out[band] = `${ms}ms`;
  }
  return out;
}

function easeBaseline(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [curve, def] of Object.entries(DEFAULT_EASING_DEFINITIONS)) out[curve] = def.css;
  return out;
}

/**
 * The no-DOM resolution, derived from the generator definitions. Every entry
 * here is computed from the same input the emission uses; nothing is typed.
 */
export const MOTION_BASELINE: Readonly<Record<MotionNamespace, Readonly<Record<string, string>>>> =
  {
    duration: durationBaseline(),
    ease: easeBaseline(),
    delay: mapMemberValues(DEFAULT_DELAY_NAMESPACE),
    extent: mapMemberValues(DEFAULT_EXTENT_NAMESPACE),
    period: mapMemberValues(DEFAULT_PERIOD_NAMESPACE),
  };

/**
 * Cross-check a declared member union against the generator table, both ways.
 * A member the generator dropped, or one it grew that this file does not know
 * about, is a definition error and belongs at module-load time.
 */
function assertVocabulary(namespace: MotionNamespace, declared: readonly string[]): void {
  const actual = Object.keys(MOTION_BASELINE[namespace]).sort();
  const expected = [...declared].sort();
  if (actual.join(',') !== expected.join(',')) {
    throw new Error(
      `motion accessor: the ${namespace} namespace has drifted. ` +
        `Generator members: ${actual.join(', ')}. Accessor members: ${expected.join(', ')}.`,
    );
  }
}

assertVocabulary('duration', MOTION_DURATION_SCALE);
assertVocabulary('ease', EASING_CURVES);
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

/** Where a resolved value came from -- the three steps of the resolution order. */
export type MotionTokenSource = 'reduced-motion' | 'computed' | 'baseline';

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

function requireMember(namespace: MotionNamespace, member: string): string {
  const table = MOTION_BASELINE[namespace];
  const value = table[member];
  if (value === undefined) {
    throw new Error(
      `motion accessor: unknown motion token "${motionTokenName(namespace, member)}" -- ` +
        `no member "${member}" in the ${namespace} namespace. ` +
        `Known ${namespace} members: ${Object.keys(table).sort().join(', ')}.`,
    );
  }
  return value;
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
 * Read a custom property off the computed style.
 *
 * Returns null for "no DOM" and for "declared nowhere" alike, because both mean
 * the same thing to the caller: fall through to the baseline. An empty string
 * is the browser's own answer for an undeclared property, so it is the only
 * emptiness this treats as absence -- `0ms` is a resolved value and survives.
 */
function readCustomProperty(
  customProperty: string,
  element: Element | null | undefined,
): string | null {
  const view = typeof globalThis.getComputedStyle === 'function' ? globalThis : null;
  if (view === null) return null;
  const root = typeof document === 'undefined' ? null : document.documentElement;
  const target = element ?? root;
  if (target === null) return null;
  const raw = view.getComputedStyle(target).getPropertyValue(customProperty).trim();
  return raw === '' ? null : raw;
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
  const baseline = requireMember(ns, member);
  const token = motionTokenName(ns, member);
  const customProperty = `--${token}`;

  const preference = options.motionPreference ?? detectMotionPreference();
  if (preference === 'reduced' && REDUCED_MOTION_ZEROED.has(ns)) {
    return { token, customProperty, namespace: ns, member, value: '0ms', source: 'reduced-motion' };
  }

  const raw = readCustomProperty(customProperty, options.element);
  if (raw === null) {
    return { token, customProperty, namespace: ns, member, value: baseline, source: 'baseline' };
  }

  const parsed = NAMESPACE_SCHEMA[ns].safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? 'invalid value';
    throw new Error(
      `motion accessor: motion token "${token}" resolved to "${raw}", which is not a valid ` +
        `${ns} value (${reason}).`,
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
