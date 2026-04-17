/**
 * <rafters-grid> Web Component
 *
 * Framework-target for the Grid component, parallel to grid.tsx (React) and
 * grid.astro (Astro). Consumes gridStylesheet() from grid.styles.ts so visual
 * parity is guaranteed across framework targets.
 *
 * Shadow DOM structure:
 *   <div class="grid"><slot></slot></div>
 *
 * Attributes:
 *   cols  1 | 2 | 3 | 4 | 6 | 12          (default 1)
 *   gap   0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16  (default 4)
 *   flow  row | col | dense                (default row)
 *
 * Unknown attribute values fall back to defaults silently.
 *
 * Container queries (NOT viewport media queries) drive responsive column
 * counts so the grid responds to its parent container's inline size, not
 * the viewport.
 *
 * Attribute changes regenerate the per-instance stylesheet only; the DOM
 * tree (the wrapping `<div class="grid">` and its slot) is a stable
 * reference for the lifetime of the element.
 *
 * @cognitive-load 4/10
 * @accessibility Layout-only container; consumers may set role on the host
 *                element when interactive grid semantics are required.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_FLOW,
  DEFAULT_GRID_GAP,
  GRID_COLS_VALUES,
  GRID_FLOW_VALUES,
  GRID_GAP_VALUES,
  gridStylesheet,
} from './grid.styles';

function parseEnumInt<T extends number>(raw: string | null, allowed: readonly T[], fallback: T): T {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  for (const candidate of allowed) {
    if (candidate === parsed) return candidate;
  }
  return fallback;
}

function parseEnumString<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (raw === null) return fallback;
  for (const candidate of allowed) {
    if (candidate === raw) return candidate;
  }
  return fallback;
}

export class RaftersGrid extends RaftersElement {
  /**
   * Static styles intentionally empty -- per-instance stylesheet is composed
   * from current attributes in connectedCallback so attribute changes can
   * swap the sheet without rebuilding the DOM tree.
   */
  static override styles = '';

  static readonly observedAttributes: ReadonlyArray<string> = ['cols', 'gap', 'flow'];

  /** Stable per-instance component stylesheet, swapped in place on attr change. */
  private instanceSheet: CSSStyleSheet | null = null;

  /** Stable per-instance grid wrapper. Built once, reused across attr changes. */
  private gridRoot: HTMLDivElement | null = null;

  private composeStyles(): string {
    const cols = parseEnumInt(this.getAttribute('cols'), GRID_COLS_VALUES, DEFAULT_GRID_COLS);
    const gap = parseEnumInt(this.getAttribute('gap'), GRID_GAP_VALUES, DEFAULT_GRID_GAP);
    const flow = parseEnumString(this.getAttribute('flow'), GRID_FLOW_VALUES, DEFAULT_GRID_FLOW);
    return gridStylesheet({ cols, gap, flow });
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const root = this.shadowRoot;
    if (!root) return;

    if (!this.instanceSheet) {
      this.instanceSheet = new CSSStyleSheet();
    }
    this.instanceSheet.replaceSync(this.composeStyles());

    const sheets: CSSStyleSheet[] = [];
    for (const existing of root.adoptedStyleSheets) {
      if (existing !== this.instanceSheet) sheets.push(existing);
    }
    sheets.push(this.instanceSheet);
    root.adoptedStyleSheets = sheets;
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (name !== 'cols' && name !== 'gap' && name !== 'flow') return;

    if (!this.instanceSheet) return; // pre-connect: connectedCallback will compose.

    this.instanceSheet.replaceSync(this.composeStyles());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // Keep gridRoot and instanceSheet so reconnects preserve stable references.
  }

  override render(): Node {
    if (!this.gridRoot) {
      this.gridRoot = this.buildGridRoot();
    }
    return this.gridRoot;
  }

  private buildGridRoot(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'grid';
    const slot = document.createElement('slot');
    wrapper.appendChild(slot);
    return wrapper;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-grid')) {
  customElements.define('rafters-grid', RaftersGrid);
}
