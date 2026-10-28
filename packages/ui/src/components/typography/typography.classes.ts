/**
 * Class resolution for Typography -- the view over the static score.
 *
 * Variant defaults are stored dimensionally (size, weight, color, line,
 * tracking, family, align, transform) rather than as flat utility strings.
 * Token-prop overrides replace the matching dimension at emit time, so defaults
 * never fight overrides in the Tailwind cascade (which orders utilities
 * alphabetically and thus cannot be trusted for overrides: `text-destructive` would
 * lose to `text-foreground` on 'd' < 'f').
 *
 * Ported from the oracle verbatim; the
 * TypographyVariant / TypographyTokenProps types now live on the score
 * (typography.behavior.ts) so the pure behavior test imports them with no DOM.
 */

import classy from '../../primitives/classy';
import type { TypographyTokenProps, TypographyVariant } from './typography.behavior';

/** The dimensions a container-query default can set. */
type CqDimension = 'size' | 'weight' | 'line' | 'tracking';

/** The props that each set one dimension; `fill` is resolved apart from them. */
type Dimension = Exclude<keyof TypographyTokenProps, 'fill'>;

interface VariantDefaults extends Omit<TypographyTokenProps, 'fill'> {
  layout?: string;
  /** The variant's surface; a fill replaces it with the colour. */
  surface?: string;
  /** Container-query defaults, each a whole literal class Tailwind can see. */
  cq?: Partial<Record<CqDimension, string>>;
}

/*
 * A variant sets a text colour only when it paints its own background (code,
 * codeblock, mark) or the colour is what it means (muted); every other variant
 * inherits, so text on a Card or a filled surface takes that surface's
 * foreground (#2888).
 */
const VARIANTS: Record<TypographyVariant, VariantDefaults> = {
  h1: {
    size: '4xl',
    weight: 'bold',
    tracking: 'tight',
    layout: 'scroll-m-20',
    cq: { size: '@lg:text-5xl' },
  },
  h2: {
    size: '3xl',
    weight: 'semibold',
    tracking: 'tight',
    layout: 'scroll-m-20',
  },
  h3: {
    size: '2xl',
    weight: 'semibold',
    tracking: 'tight',
    layout: 'scroll-m-20',
  },
  h4: {
    size: 'xl',
    weight: 'semibold',
    tracking: 'tight',
    layout: 'scroll-m-20',
  },
  p: { line: '7' },
  lead: { size: 'xl' },
  large: { size: 'lg', weight: 'semibold' },
  small: { size: 'sm', weight: 'medium', line: 'none' },
  muted: { size: 'sm', color: 'muted-foreground' },
  code: {
    size: 'sm',
    family: 'mono',
    color: 'foreground',
    surface: 'bg-muted',
    layout: 'rounded px-1 py-0.5',
  },
  codeblock: {
    size: 'sm',
    family: 'mono',
    color: 'foreground',
    surface: 'bg-muted',
    layout: 'relative rounded-lg p-4 overflow-x-auto [&_code]:bg-transparent [&_code]:p-0',
  },
  blockquote: { layout: 'mt-6 border-s-2 border-border ps-6 italic' },
  mark: { color: 'accent-foreground', surface: 'bg-accent', layout: 'px-1 rounded' },
  abbr: { layout: 'cursor-help underline decoration-dotted underline-offset-4' },
  ul: { layout: 'my-6 ms-6 list-disc [&>li]:mt-2' },
  ol: { layout: 'my-6 ms-6 list-decimal [&>li]:mt-2' },
  li: { line: '7' },
};

/*
 * Every class a prop can emit, written whole so Tailwind's scanner sees it in
 * this file (#2825). The keys are the ones the registry's typography generator
 * writes by default; a value with no entry renders no class.
 */
const SIZE: Readonly<Record<string, string>> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
  '7xl': 'text-7xl',
  '8xl': 'text-8xl',
  '9xl': 'text-9xl',
};

const WEIGHT: Readonly<Record<string, string>> = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
};

const LINE: Readonly<Record<string, string>> = {
  xs: 'leading-xs',
  sm: 'leading-sm',
  base: 'leading-base',
  lg: 'leading-lg',
  xl: 'leading-xl',
  '2xl': 'leading-2xl',
  '3xl': 'leading-3xl',
  '4xl': 'leading-4xl',
  '5xl': 'leading-5xl',
  '6xl': 'leading-6xl',
  '7xl': 'leading-7xl',
  '8xl': 'leading-8xl',
  '9xl': 'leading-9xl',
  none: 'leading-none',
  '7': 'leading-7',
  relaxed: 'leading-relaxed',
};

const TRACKING: Readonly<Record<string, string>> = {
  xs: 'tracking-xs',
  sm: 'tracking-sm',
  base: 'tracking-base',
  lg: 'tracking-lg',
  xl: 'tracking-xl',
  '2xl': 'tracking-2xl',
  '3xl': 'tracking-3xl',
  '4xl': 'tracking-4xl',
  '5xl': 'tracking-5xl',
  '6xl': 'tracking-6xl',
  '7xl': 'tracking-7xl',
  '8xl': 'tracking-8xl',
  '9xl': 'tracking-9xl',
  tighter: 'tracking-tighter',
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
  wider: 'tracking-wider',
  widest: 'tracking-widest',
};

const FAMILY: Readonly<Record<string, string>> = {
  sans: 'font-sans',
  mono: 'font-mono',
  serif: 'font-serif',
  heading: 'font-heading',
  body: 'font-body',
  code: 'font-code',
};

const ALIGN: Readonly<Record<string, string>> = {
  start: 'text-start',
  end: 'text-end',
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
  justify: 'text-justify',
};

const TRANSFORM: Readonly<Record<string, string>> = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  'normal-case': 'normal-case',
};

/*
 * Text colour is a literal map like every other dimension (FR-RAF-FILL-003):
 * the key is the colour token, the value its whole text utility. A value with
 * no entry renders no class. `muted` is not a key: it is a surface token, and
 * its text would render near-invisible (#2528) -- muted text is
 * `muted-foreground`.
 */
export const COLOR: Readonly<Record<string, string>> = {
  foreground: 'text-foreground',
  'muted-foreground': 'text-muted-foreground',
  'accent-foreground': 'text-accent-foreground',
  'card-foreground': 'text-card-foreground',
  'popover-foreground': 'text-popover-foreground',
  primary: 'text-primary',
  'primary-foreground': 'text-primary-foreground',
  'secondary-foreground': 'text-secondary-foreground',
  destructive: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
};

const fromMap =
  (map: Readonly<Record<string, string>>) =>
  (v: string): string =>
    Object.hasOwn(map, v) ? (map[v] ?? '') : '';

const DIM_TO_UTIL: Record<Dimension, (v: string) => string> = {
  size: fromMap(SIZE),
  weight: fromMap(WEIGHT),
  line: fromMap(LINE),
  tracking: fromMap(TRACKING),
  family: fromMap(FAMILY),
  align: fromMap(ALIGN),
  transform: fromMap(TRANSFORM),
  color: fromMap(COLOR),
};

const DIM_KEYS = Object.keys(DIM_TO_UTIL) as Dimension[];

function emitProps(props: TypographyTokenProps): string {
  const classes: string[] = [];
  for (const key of DIM_KEYS) {
    const value = props[key];
    if (value == null) continue;
    const util = DIM_TO_UTIL[key](value);
    if (util) classes.push(util);
  }
  return classes.join(' ');
}

/**
 * A fill that is exactly one `bg-fill-*` token wins over `color` and the
 * variant's colour and surface, so the recipe's foreground paints the text
 * (FR-RAF-FILL-003). Any other fill is dropped with a warning by classy.fill.
 */
export function resolveTypography(
  variant: TypographyVariant,
  overrides: TypographyTokenProps = {},
): string {
  const defaults = VARIANTS[variant];
  const merged: TypographyTokenProps = {};
  for (const key of DIM_KEYS) merged[key] = overrides[key] ?? defaults[key];
  const fill = classy.fill(overrides.fill);
  if (fill) merged.color = undefined;

  const parts: string[] = [];
  if (defaults.layout) parts.push(defaults.layout);
  parts.push(fill || (defaults.surface ?? ''));
  parts.push(emitProps(merged));

  // CQ defaults survive only where the prop didn't override the same dimension.
  for (const [key, cls] of Object.entries(defaults.cq ?? {}) as [CqDimension, string][]) {
    if (overrides[key] == null) parts.push(cls);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * A variant's type and nothing else: its size, weight, line, tracking, family
 * and colour, its container-query defaults, and the background its colour is
 * paired with. No layout. The article's descendant selectors are generated
 * from these (#2889), so prose type is defined once, here.
 */
export function typeClasses(variant: TypographyVariant): string[] {
  const defaults = VARIANTS[variant];
  return [defaults.surface ?? '', emitProps(defaults), ...Object.values(defaults.cq ?? {})]
    .join(' ')
    .split(' ')
    .filter(Boolean);
}

/**
 * Emit token-prop classes without any variant defaults. Exposed for tests that
 * exercise the prop-to-utility emit path in isolation.
 */
export function tokenPropsToClasses(props: TypographyTokenProps): string {
  return emitProps(props);
}

/**
 * Flat-string map of variant defaults with no overrides. Kept for consumers
 * that need the baseline class string (e.g. List's li, CodeBlock wrapper).
 */
export const typographyClasses = Object.fromEntries(
  (Object.keys(VARIANTS) as TypographyVariant[]).map((v) => [v, resolveTypography(v)]),
) as Record<TypographyVariant, string>;
