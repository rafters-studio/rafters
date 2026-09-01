/**
 * Graph core primitive
 * Base rendering engine for the rafters chart system.
 *
 * Provides SVG/Canvas container creation, scale helpers, coordinate transforms,
 * and path builders that chart-type primitives (gauge, bar, line, etc.) build on.
 *
 * Leaf primitive: zero external deps, framework-agnostic, SSR-safe.
 */

export interface GraphConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  renderer?: 'svg' | 'canvas';
}

export interface GraphControls {
  resize: (width: number, height: number) => void;
  destroy: () => void;
  readonly element: SVGSVGElement | HTMLCanvasElement | null;
}

export interface BandScaleOptions {
  paddingInner?: number;
  paddingOuter?: number;
  /** Distributes leftover range; 0.5 (default) centers bands, like d3-scale. */
  align?: number;
}

export interface BandScale<T extends string> {
  /** Returns the left edge of the band for a given category value. */
  scale: (value: T) => number;
  /** Returns the width of each band (excluding padding). */
  bandwidth: () => number;
  /** Returns the distance between the starts of adjacent bands. */
  step: () => number;
  domain: readonly T[];
  range: readonly [number, number];
}

export interface GridLines {
  horizontal: Array<{ y: number; x1: number; x2: number }>;
  vertical: Array<{ x: number; y1: number; y2: number }>;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;

/**
 * Create a graph rendering context.
 * Appends an SVG or Canvas element to the container.
 */
export function createGraph(config: GraphConfig): GraphControls {
  if (!config.container) {
    throw new Error('Graph container is required');
  }

  const { container, renderer = 'svg' } = config;
  let width = config.width ?? DEFAULT_WIDTH;
  let height = config.height ?? DEFAULT_HEIGHT;
  let element: SVGSVGElement | HTMLCanvasElement | null = null;

  if (renderer === 'svg') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';
    svg.setAttribute('role', 'img');
    container.appendChild(svg);
    element = svg;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    element = canvas;
  }

  return {
    get element() {
      return element;
    },

    resize(newWidth: number, newHeight: number) {
      width = newWidth;
      height = newHeight;

      if (!element) return;

      if (element instanceof SVGSVGElement) {
        element.setAttribute('viewBox', `0 0 ${width} ${height}`);
      } else {
        element.width = width;
        element.height = height;
      }
    },

    destroy() {
      if (element) {
        element.remove();
        element = null;
      }
    },
  };
}

/**
 * Create a linear scale that maps values from domain to range.
 * Handles inverted domains (domain[0] > domain[1]).
 */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): (value: number) => number {
  const domainSpan = domain[1] - domain[0];
  const rangeSpan = range[1] - range[0];

  if (domainSpan === 0) {
    return () => range[0];
  }

  return (value: number) => {
    const normalized = (value - domain[0]) / domainSpan;
    return range[0] + normalized * rangeSpan;
  };
}

/**
 * Create a band scale that maps categorical values to evenly-spaced bands,
 * reproducing d3-scale scaleBand: step = span / (n - paddingInner + 2*paddingOuter),
 * bandwidth = step * (1 - paddingInner), and leftover range distributed by align
 * (default 0.5 centers). paddingInner/paddingOuter/align are fractions in [0,1].
 */
export function bandScale<T extends string>(
  domain: readonly T[],
  range: readonly [number, number],
  opts?: BandScaleOptions,
): BandScale<T> {
  const rangeSpan = range[1] - range[0];
  const count = domain.length;
  const pInner = opts?.paddingInner ?? 0;
  const pOuter = opts?.paddingOuter ?? 0;
  const align = opts?.align ?? 0.5;

  // d3 denominator: n - paddingInner + 2*paddingOuter (clamped so a single band divides by >= 1).
  const stepVal = count === 0 ? 0 : rangeSpan / Math.max(1, count - pInner + 2 * pOuter);
  const bw = stepVal * (1 - pInner);

  // Distribute leftover range by align (0.5 centers); firstEdge is the left edge of band 0.
  const firstEdge = range[0] + (rangeSpan - stepVal * (count - pInner)) * align;

  const indexMap = new Map<T, number>();
  for (let i = 0; i < domain.length; i++) {
    indexMap.set(domain[i] as T, i);
  }

  return {
    scale(value: T): number {
      const idx = indexMap.get(value);
      if (idx === undefined) return range[0];
      return firstEdge + idx * stepVal;
    },
    bandwidth: () => bw,
    step: () => stepVal,
    domain,
    range,
  };
}

/**
 * Generate nicely-rounded tick values for a numeric axis.
 * Uses d3-array's 1/2/5 x 10^n "nice number" rule with d3's exact factor
 * thresholds (sqrt(2), sqrt(10), sqrt(50)), so the step matches what d3 picks
 * across the input space, not only for round cases: ticks(0,100,5) -> step 20
 * ([0,20,40,60,80,100]); 25 (2.5 x 10) is never chosen.
 */
export function ticks(min: number, max: number, count: number): number[] {
  if (count <= 0 || min === max) return [min];

  const rawStep = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;

  // d3-array tickIncrement factor thresholds: sqrt(50), sqrt(10), sqrt(2).
  const e10 = Math.sqrt(50);
  const e5 = Math.sqrt(10);
  const e2 = Math.sqrt(2);
  const factor = residual >= e10 ? 10 : residual >= e5 ? 5 : residual >= e2 ? 2 : 1;
  const niceStep = factor * magnitude;

  const niceMin = Math.ceil(min / niceStep) * niceStep;
  const result: number[] = [];

  for (let v = niceMin; v <= max; v += niceStep) {
    const rounded = Math.round(v * 1e12) / 1e12;
    result.push(rounded);
  }

  return result;
}

/**
 * Generate gridline coordinates from tick arrays.
 */
export function gridLines(
  xTicks: number[],
  yTicks: number[],
  plotArea: { x1: number; y1: number; x2: number; y2: number },
): GridLines {
  return {
    horizontal: yTicks.map((y) => ({
      y,
      x1: plotArea.x1,
      x2: plotArea.x2,
    })),
    vertical: xTicks.map((x) => ({
      x,
      y1: plotArea.y1,
      y2: plotArea.y2,
    })),
  };
}

/**
 * Convert polar coordinates to cartesian.
 * Angle in degrees, 0 = right (3 o'clock), counterclockwise.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy - radius * Math.sin(angleRad),
  };
}

/**
 * Build a straight-line SVG path from a series of points.
 */
export function linePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';

  const segments = points.map((p, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd} ${p.x} ${p.y}`;
  });

  return segments.join(' ');
}

/**
 * Build a smooth cubic bezier SVG path from a series of points.
 * Uses Catmull-Rom to cubic bezier conversion for smooth interpolation.
 */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) return linePath(points);

  const first = points[0] as { x: number; y: number };
  let d = `M ${first.x} ${first.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)] as { x: number; y: number };
    const p1 = points[i] as { x: number; y: number };
    const p2 = points[i + 1] as { x: number; y: number };
    const p3 = points[Math.min(points.length - 1, i + 2)] as { x: number; y: number };

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/**
 * Build an SVG arc path between two angles.
 * Angles in degrees, 0 = right (3 o'clock), counterclockwise.
 */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
  ].join(' ');
}

/**
 * Build a closed area SVG path: the line path closed back along a baseline.
 */
export function areaPath(
  points: { x: number; y: number }[],
  baseline: number,
  smooth?: boolean,
): string {
  if (points.length === 0) return '';

  const topPath = smooth ? smoothPath(points) : linePath(points);
  const last = points[points.length - 1] as { x: number; y: number };
  const first = points[0] as { x: number; y: number };

  return `${topPath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

/**
 * Build a filled pie/donut slice SVG path.
 * Angles in degrees, 0 = top (12 o'clock), clockwise -- standard chart convention.
 */
export function slicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = radialToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = radialToCartesian(cx, cy, outerRadius, endAngle);

  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;
  const largeArc = sweep > 180 ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ');
  }

  const innerStart = radialToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = radialToCartesian(cx, cy, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/**
 * Convert a value on a radial axis to cartesian coordinates.
 * Used for radar/radial charts. Angle 0 = top, clockwise.
 */
export function radialToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Build a closed polygon path for radar charts.
 * Takes values at equally-spaced angles from 0 (top), clockwise.
 */
export function radarPath(cx: number, cy: number, values: number[], maxRadius: number): string {
  if (values.length === 0) return '';

  const angleStep = 360 / values.length;
  const points = values.map((v, i) => {
    const angle = i * angleStep;
    const r = v * maxRadius;
    return radialToCartesian(cx, cy, r, angle);
  });

  return linePath(points) + ' Z';
}

/**
 * Observe a container's content-box size, calling back with { width, height }.
 * Fires once on observe and on every subsequent resize (ResizeObserver's own
 * cadence). Returns a cleanup that disconnects. SSR-safe: a no-op cleanup when
 * ResizeObserver is absent. Signature matches the #2223 pinned interface.
 */
export function observeResize(
  el: HTMLElement,
  onResize: (size: { width: number; height: number }) => void,
): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    onResize({ width, height });
  });

  observer.observe(el);

  return () => {
    observer.disconnect();
  };
}
