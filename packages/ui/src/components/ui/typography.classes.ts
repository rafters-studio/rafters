/**
 * Shared class definitions for Typography components
 * Used by both typography.tsx (React) and typography .astro files (Astro)
 */

export const typographyClasses = {
  h1: 'scroll-m-20 text-4xl font-bold tracking-tight @lg:text-5xl text-foreground',
  h2: 'scroll-m-20 text-3xl font-semibold tracking-tight text-foreground',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight text-foreground',
  h4: 'scroll-m-20 text-xl font-semibold tracking-tight text-foreground',
  p: 'leading-7 text-foreground',
  lead: 'text-xl text-muted-foreground',
  large: 'text-lg font-semibold text-foreground',
  small: 'text-sm font-medium leading-none text-foreground',
  muted: 'text-sm text-muted-foreground',
  code: 'rounded bg-muted px-1 py-0.5 font-mono text-sm text-foreground',
  blockquote: 'mt-6 border-l-2 border-border pl-6 italic text-foreground',
  ul: 'my-6 ml-6 list-disc [&>li]:mt-2 text-foreground',
  ol: 'my-6 ml-6 list-decimal [&>li]:mt-2 text-foreground',
  li: 'leading-7',
  codeblock:
    'relative rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto text-foreground [&_code]:bg-transparent [&_code]:p-0',
  mark: 'bg-accent text-accent-foreground px-1 rounded',
  abbr: 'cursor-help underline decoration-dotted underline-offset-4',
} as const;

/**
 * Token-level typography props for surgical override of any dimension.
 * Shared between React (.tsx) and Astro (.astro) tag components.
 */
export interface TypographyTokenProps {
  size?: string | undefined;
  weight?: string | undefined;
  color?: string | undefined;
  line?: string | undefined;
  tracking?: string | undefined;
  family?: string | undefined;
  align?: string | undefined;
  transform?: string | undefined;
}

/**
 * Build Tailwind utility classes from token props.
 * Returns a string of override classes or empty string if no overrides.
 *
 * Color values pass through directly as text-{value}:
 *   color="accent"            -> text-accent
 *   color="accent-foreground" -> text-accent-foreground
 *   color="muted-foreground"  -> text-muted-foreground
 */
export function tokenPropsToClasses(props: TypographyTokenProps): string {
  const classes: string[] = [];
  if (props.size) classes.push(`text-${props.size}`);
  if (props.weight) classes.push(`font-${props.weight}`);
  if (props.color) classes.push(`text-${props.color}`);
  if (props.line) classes.push(`leading-${props.line}`);
  if (props.tracking) classes.push(`tracking-${props.tracking}`);
  if (props.family) classes.push(`font-${props.family}`);
  if (props.align) classes.push(`text-${props.align}`);
  if (props.transform) classes.push(props.transform);
  return classes.join(' ');
}
