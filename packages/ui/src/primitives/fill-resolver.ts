/**
 * Fill Resolver Primitive
 *
 * Resolves fill token metadata into CSS classes based on consumption context.
 * Zero external dependencies -- works in React, Astro, and Web Components.
 *
 * Two contexts:
 * - "surface": resolves to background classes (bg-*, backdrop-blur-*, text-*)
 * - "text": resolves to text color classes (text-*, or bg-clip-text for gradients)
 *
 * Two entry points:
 * - resolveFillClasses(metadata, context): metadata-driven -- caller supplies shape
 * - resolveFillName(name, context): name-driven -- looks up the built-in or
 *   app-registered fill registry and resolves in one step. Unknown names fall
 *   back to direct class application (bg-{name} / text-{name}) so consumers do
 *   not crash on token drift.
 */

export type FillContext = 'surface' | 'text';

export interface FillMetadata {
  color?: string;
  opacity?: number;
  foreground?: string;
  backdropBlur?: string;
  gradient?: {
    direction: string;
    stops: Array<{
      color: string;
      position?: string;
      opacity?: number;
    }>;
  };
}

/**
 * Parse fill token value (JSON string) into structured metadata.
 */
export function parseFillValue(value: string): FillMetadata | null {
  try {
    return JSON.parse(value) as FillMetadata;
  } catch {
    return null;
  }
}

/**
 * Resolve a fill's metadata into CSS classes based on context.
 *
 * Surface context (Container, Card, Dialog):
 *   fill-surface { color: "neutral-900" } -> "bg-neutral-900 text-neutral-100"
 *   fill-glass { color: "neutral-900", opacity: 0.6, backdropBlur: "md" }
 *     -> "bg-neutral-900/60 backdrop-blur-md text-neutral-100"
 *   fill-hero { gradient } -> "bg-gradient-to-b from-primary to-primary/0 text-primary-foreground"
 *
 * Text context (Typography color prop):
 *   fill-primary { color: "primary" } -> "text-primary"
 *   fill-hero { gradient } -> "bg-gradient-to-r from-primary to-primary/0 bg-clip-text text-transparent"
 */
export function resolveFillClasses(fill: FillMetadata, context: FillContext): string {
  if (fill.gradient) {
    return resolveGradientFill(fill, context);
  }

  return resolveSolidFill(fill, context);
}

function resolveSolidFill(fill: FillMetadata, context: FillContext): string {
  const parts: string[] = [];

  if (!fill.color) return '';

  if (context === 'surface') {
    // Background color with optional opacity
    if (fill.opacity !== undefined && fill.opacity < 1) {
      parts.push(`bg-${fill.color}/${Math.round(fill.opacity * 100)}`);
    } else {
      parts.push(`bg-${fill.color}`);
    }

    // Backdrop blur
    if (fill.backdropBlur) {
      parts.push(`backdrop-blur-${fill.backdropBlur}`);
    }

    // Foreground text color
    if (fill.foreground) {
      parts.push(`text-${fill.foreground}`);
    }
  } else {
    // Text context -- just the text color
    if (fill.opacity !== undefined && fill.opacity < 1) {
      parts.push(`text-${fill.color}/${Math.round(fill.opacity * 100)}`);
    } else {
      parts.push(`text-${fill.color}`);
    }
  }

  return parts.join(' ');
}

function resolveGradientFill(fill: FillMetadata, context: FillContext): string {
  const parts: string[] = [];
  const gradient = fill.gradient;

  if (!gradient) return '';

  // Build gradient classes
  parts.push(`bg-gradient-${gradient.direction}`);

  const lastIndex = gradient.stops.length - 1;
  for (const [i, stop] of gradient.stops.entries()) {
    const prefix = i === 0 ? 'from' : i === lastIndex ? 'to' : 'via';

    let colorClass = `${prefix}-${stop.color}`;
    if (stop.opacity !== undefined && stop.opacity < 1) {
      colorClass = `${prefix}-${stop.color}/${Math.round(stop.opacity * 100)}`;
    }
    parts.push(colorClass);
  }

  if (context === 'surface') {
    // Surface: gradient background + foreground text
    if (fill.foreground) {
      parts.push(`text-${fill.foreground}`);
    }
  } else {
    // Text context: gradient applied as text color via bg-clip-text
    parts.push('bg-clip-text');
    parts.push('text-transparent');
  }

  return parts.join(' ');
}

/**
 * Built-in fill registry.
 *
 * Mirrors the default fill definitions shipped by @rafters/design-tokens so
 * components resolve common names without needing the token package at
 * runtime (ui is copied into consumer projects via the registry and must stay
 * zero-dep). Apps can override or extend via `registerFill`.
 */
const fillRegistry: Record<string, FillMetadata> = {
  surface: { color: 'neutral-900', foreground: 'neutral-100' },
  panel: { color: 'neutral-800', opacity: 0.95, foreground: 'neutral-100' },
  overlay: {
    color: 'neutral-950',
    opacity: 0.8,
    backdropBlur: 'sm',
    foreground: 'neutral-50',
  },
  glass: {
    color: 'neutral-900',
    opacity: 0.6,
    backdropBlur: 'md',
    foreground: 'neutral-100',
  },
  primary: { color: 'primary', foreground: 'primary-foreground' },
  muted: { color: 'muted', foreground: 'muted-foreground' },
  hero: {
    gradient: {
      direction: 'to-b',
      stops: [{ color: 'primary' }, { color: 'primary', opacity: 0 }],
    },
    foreground: 'primary-foreground',
  },
};

/**
 * Register or override a fill definition at runtime.
 *
 * Apps whose design systems define custom fills can call this once at startup
 * (or inject via their root layout) to make those fills resolvable by name
 * from any component using the fill prop.
 */
export function registerFill(name: string, metadata: FillMetadata): void {
  fillRegistry[name] = metadata;
}

/**
 * Look up fill metadata by name. Returns undefined for unknown names.
 */
export function getFillMetadata(name: string): FillMetadata | undefined {
  return fillRegistry[name];
}

/**
 * Resolve a fill token name into CSS classes for a given context.
 *
 * Known names resolve through the registry. Unknown names fall back to
 * direct class application so consumers do not crash on token drift:
 *   surface context -> `bg-{name}`
 *   text context    -> `text-{name}`
 *
 * Empty/undefined input returns an empty string.
 */
export function resolveFillName(name: string | undefined, context: FillContext): string {
  if (!name) return '';

  const metadata = fillRegistry[name];
  if (metadata) {
    return resolveFillClasses(metadata, context);
  }

  // Unknown name: fall back to direct Tailwind class application.
  return context === 'surface' ? `bg-${name}` : `text-${name}`;
}
