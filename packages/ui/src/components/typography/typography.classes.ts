/**
 * Typography -- decoration for a static score. No behavior.ts: the element
 * (`as`) IS the contract, same as Container, and unlike Container this score
 * has no aria projection at all (headings/paragraph/list/quote/code carry
 * zero runtime-conditional attributes) -- so there is no BehaviorSpec for a
 * harness to audit (Spec 00 boundary 9: only a REAL projection earns a
 * behavior file).
 *
 * Variant defaults are the oracle's (src/old/ui/typography.classes.ts) raw
 * Tailwind sizes, ported VERBATIM -- not the type-system role tokens
 * (text-display-medium etc.). Repointing to role tokens is a designer pass,
 * the same deferred debt Container's article-mode typography flow carries
 * (packages/ui/docs/spec/components/container.md); it is flagged, not done,
 * here too.
 *
 * Spec 01: "every class string in the file is a literal... the function
 * selects among literals; it never constructs them." Every dimension below
 * is a Record lookup, same shape as Container's sizeClasses/paddingClasses
 * -- never `text-${v}` template construction, which Tailwind's scanner
 * cannot see in source. Token prop overrides replace the matching
 * dimension at emit time so defaults never fight overrides in the cascade
 * (alphabetical ordering cannot be trusted: `text-accent` loses to
 * `text-foreground`).
 */

import { resolveFillName } from '../../primitives/fill-resolver';

export type TypographyElement =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'code'
  | 'small'
  | 'blockquote'
  | 'ul'
  | 'ol';

/** The variant vocabulary VARIANTS keys on. h5/h6 resolve to h4 (oracle:
 *  same visual treatment, no separate entry -- see variantKeyFor). */
type VariantKey = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'code' | 'small' | 'blockquote' | 'ul' | 'ol';

export type TypographySize =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl';
export type TypographyWeight =
  | 'thin'
  | 'extralight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';
export type TypographyLine =
  | 'none'
  | 'tight'
  | 'snug'
  | 'normal'
  | 'relaxed'
  | 'loose'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10';
export type TypographyTracking = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
export type TypographyFamily = 'sans' | 'serif' | 'mono';
export type TypographyAlign = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
export type TypographyTransform = 'uppercase' | 'lowercase' | 'capitalize' | 'normal-case';

export interface TypographyTokenProps {
  size?: TypographySize | undefined;
  weight?: TypographyWeight | undefined;
  /** Fill signature over the color vocabulary (#1637), text context. */
  color?: string | undefined;
  line?: TypographyLine | undefined;
  tracking?: TypographyTracking | undefined;
  family?: TypographyFamily | undefined;
  align?: TypographyAlign | undefined;
  transform?: TypographyTransform | undefined;
}

export interface TypographyConfig extends TypographyTokenProps {
  as?: TypographyElement | undefined;
}

export interface TypographyClassSet {
  root: string;
}

interface VariantDefaults extends TypographyTokenProps {
  layout?: string;
}

const VARIANTS: Record<VariantKey, VariantDefaults> = {
  h1: {
    size: '4xl',
    weight: 'bold',
    tracking: 'tight',
    color: 'foreground',
    layout: 'scroll-m-20',
  },
  h2: {
    size: '3xl',
    weight: 'semibold',
    tracking: 'tight',
    color: 'foreground',
    layout: 'scroll-m-20',
  },
  h3: {
    size: '2xl',
    weight: 'semibold',
    tracking: 'tight',
    color: 'foreground',
    layout: 'scroll-m-20',
  },
  h4: {
    size: 'xl',
    weight: 'semibold',
    tracking: 'tight',
    color: 'foreground',
    layout: 'scroll-m-20',
  },
  p: { line: '7', color: 'foreground' },
  code: {
    size: 'sm',
    family: 'mono',
    color: 'foreground',
    layout: 'rounded bg-muted px-1 py-0.5',
  },
  small: { size: 'sm', weight: 'medium', line: 'none', color: 'foreground' },
  blockquote: { color: 'foreground', layout: 'mt-6 border-l-2 border-border pl-6 italic' },
  ul: { color: 'foreground', layout: 'my-6 ml-6 list-disc [&>li]:mt-2' },
  ol: { color: 'foreground', layout: 'my-6 ml-6 list-decimal [&>li]:mt-2' },
};

/** h5/h6 share h4's variant defaults (oracle: no separate visual tier). */
function variantKeyFor(element: TypographyElement): VariantKey {
  return element === 'h5' || element === 'h6' ? 'h4' : element;
}

/** h1 only (oracle): the size step-up survives only when the consumer
 *  didn't override size. A literal, not a constructed class -- Container's
 *  CQ-responsive edge padding (`@md:px-6 @lg:px-8`) is the same shape. */
const H1_CQ_SIZE_STEP_UP = '@lg:text-5xl';

const sizeClasses: Record<TypographySize, string> = {
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
};

const weightClasses: Record<TypographyWeight, string> = {
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

const lineClasses: Record<TypographyLine, string> = {
  none: 'leading-none',
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
  '3': 'leading-3',
  '4': 'leading-4',
  '5': 'leading-5',
  '6': 'leading-6',
  '7': 'leading-7',
  '8': 'leading-8',
  '9': 'leading-9',
  '10': 'leading-10',
};

const trackingClasses: Record<TypographyTracking, string> = {
  tighter: 'tracking-tighter',
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
  wider: 'tracking-wider',
  widest: 'tracking-widest',
};

const familyClasses: Record<TypographyFamily, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

const alignClasses: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
  start: 'text-start',
  end: 'text-end',
};

const transformClasses: Record<TypographyTransform, string> = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  'normal-case': 'normal-case',
};

export function typographyClasses(config: TypographyConfig): TypographyClassSet {
  const element = config.as ?? 'p';
  const defaults = VARIANTS[variantKeyFor(element)];

  const size = config.size ?? defaults.size;
  const weight = config.weight ?? defaults.weight;
  const color = config.color ?? defaults.color;
  const line = config.line ?? defaults.line;
  const tracking = config.tracking ?? defaults.tracking;
  const family = config.family ?? defaults.family;
  const align = config.align ?? defaults.align;
  const transform = config.transform ?? defaults.transform;

  const parts: string[] = [];
  if (defaults.layout) parts.push(defaults.layout);
  if (size) parts.push(sizeClasses[size]);
  if (weight) parts.push(weightClasses[weight]);
  if (line) parts.push(lineClasses[line]);
  if (tracking) parts.push(trackingClasses[tracking]);
  if (family) parts.push(familyClasses[family]);
  if (align) parts.push(alignClasses[align]);
  if (transform) parts.push(transformClasses[transform]);
  if (color) parts.push(resolveFillName(color, 'text'));

  if (variantKeyFor(element) === 'h1' && config.size == null) {
    parts.push(H1_CQ_SIZE_STEP_UP);
  }

  return { root: parts.filter(Boolean).join(' ') };
}
