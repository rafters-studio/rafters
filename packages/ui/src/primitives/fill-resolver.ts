/**
 * Fill Resolver Primitive
 *
 * Resolves fill token metadata into CSS classes based on consumption context.
 * Zero external dependencies -- works in React, Astro, and Web Components.
 *
 * Two contexts:
 * - "surface": resolves to background classes (bg-*, backdrop-blur-*, text-*)
 * - "text": resolves to text color classes (text-*, or bg-clip-text for gradients)
 */

export type FillContext = 'surface' | 'text';

interface FillMetadata {
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
