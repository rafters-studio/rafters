/**
 * ChartTooltip -- pointer-driven datum surface over a chart's plot (#2228)
 *
 * @cognitive-load 2/10 - One consumer decision (what `content` renders); the
 * hit-testing, positioning, and announcing are invisible plumbing.
 * @attention-economics Appears only while a datum is under the pointer;
 * never competes for attention at rest, and never blocks the plot's own
 * pointer events (`pointer-events-none` on the floating panel).
 * @trust-building The swatch color and label always trace to the SAME
 * `ChartConfig` the legend and marks read -- a tooltip row can never show a
 * color or label the rest of the chart disagrees with.
 * @accessibility Never focusable (matches the shipped tooltip/hover-card
 * contract): the datum is announced through `sr-announcer` on every change,
 * one-shot per transition, so a screen-reader user gets the same content a
 * sighted pointer user sees. Keyboard datum traversal is the owning chart
 * shell's responsibility (Bar #2225 etc.) -- it dispatches into this SAME
 * `point`/`clear` action pair, so this component never needs to know
 * whether a datum arrived via mouse, touch, or keyboard.
 * @semantic-meaning Ports shadcn's `<ChartTooltip content={<ChartTooltipContent />} />`
 * call site. One declared divergence: shadcn's version reads its plot data
 * from Recharts internally; rafters has no such pipeline yet (Bar/Line/Area
 * do not exist in this tree), so this element exposes `domain`/`range`/`data`
 * as plain JS properties (a `BandScale`'s functions cannot round-trip
 * through an attribute) the owning chart shell sets once it exists. Unset,
 * it mounts and tracks the pointer but never resolves a datum -- no throw.
 *
 * @usage-patterns
 * DO: Set `.domain`, `.range`, `.data`, `.config` as JS properties before or
 *     after connection -- each setter re-binds
 * NEVER: Try to pass a `BandScale` through an attribute -- its functions do
 *        not serialize; this element reconstructs one via graph.ts `bandScale()`
 *
 * @example
 * ```html
 * <rafters-chart-tooltip data-part="root">
 *   <div data-part="content"></div>
 * </rafters-chart-tooltip>
 * <script type="module">
 *   const el = document.querySelector('rafters-chart-tooltip');
 *   el.config = { desktop: { label: 'Desktop', token: 'chart-1' } };
 *   el.domain = ['Jan', 'Feb', 'Mar'];
 *   el.range = [0, 300];
 *   el.data = [{ desktop: 120 }, { desktop: 200 }, { desktop: 150 }];
 * </script>
 * ```
 */
import { bandScale } from '../../primitives/graph';
import type { ChartConfig } from './chart.behavior';
import { bindChartTooltip } from './chart-tooltip.behavior';

export class RaftersChartTooltip extends HTMLElement {
  private teardown: (() => void) | null = null;
  private _domain: readonly string[] = [];
  private _range: readonly [number, number] = [0, 0];
  private _data: readonly Readonly<Record<string, number>>[] = [];
  private _config: ChartConfig = {};
  private _nameKey: string | undefined;

  get domain(): readonly string[] {
    return this._domain;
  }
  set domain(value: readonly string[]) {
    this._domain = value;
    this.rebind();
  }

  get range(): readonly [number, number] {
    return this._range;
  }
  set range(value: readonly [number, number]) {
    this._range = value;
    this.rebind();
  }

  get data(): readonly Readonly<Record<string, number>>[] {
    return this._data;
  }
  set data(value: readonly Readonly<Record<string, number>>[]) {
    this._data = value;
    this.rebind();
  }

  get config(): ChartConfig {
    return this._config;
  }
  set config(value: ChartConfig) {
    this._config = value;
    this.rebind();
  }

  get nameKey(): string | undefined {
    return this._nameKey;
  }
  set nameKey(value: string | undefined) {
    this._nameKey = value;
    this.rebind();
  }

  private rebind(): void {
    if (!this.isConnected) return;
    this.teardown?.();
    this.teardown = bindChartTooltip(this, {
      scale: bandScale(this._domain, this._range),
      data: this._data,
      config: this._config,
      nameKey: this._nameKey,
    });
  }

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.rebind();
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-chart-tooltip')) {
  customElements.define('rafters-chart-tooltip', RaftersChartTooltip);
}
