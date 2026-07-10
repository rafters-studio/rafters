import type { PartIds } from '../../lib/contract';
import classy from '../../primitives/classy';
import { BehaviorElement } from '../../primitives/behavior-element';
import { RaftersElement } from '../../primitives/rafters-element';
import {
  grid,
  gridItemAttrs,
  type BentoPattern,
  type ContentPriority,
  type GridActions,
  type GridConfig,
  type GridPart,
  type GridPreset,
  type GridState,
  type ResponsiveColumns,
} from './grid.behavior';
import { gridClasses, gridColSpanClasses, gridRowSpanClasses } from './grid.classes';

/**
 * <rafters-grid> + <rafters-grid-item> -- the WC performance (Spec 00
 * boundary 2/3: no decisions here, mechanical execution over
 * grid.behavior.ts + grid.classes.ts, exactly like grid.tsx). One file, two
 * elements, same shape as the React target's `Grid` + `Grid.Item`.
 *
 * role="grid" is ALWAYS the linear preset with fixed columns (type-gated in
 * grid.tsx; enforced here by simply ignoring priority-based presets when
 * interactive -- role="grid" mode never carries data-priority children).
 * Interactive mode wraps each light-DOM child in a `role=row` > `role=
 * gridcell` shadow structure via NAMED slot assignment (`slot="cell-N"` on
 * the child, `<slot name="cell-N">` inside the cell) -- the child stays a
 * genuine light-DOM child of the host throughout (never reparented), which
 * both preserves the accessible-children relationship the host itself
 * carries (axe scores an empty light-DOM host as a violation once role=grid
 * is announced) and keeps the round trip between interactive and
 * non-interactive renders a plain attribute flip. `data-roving-item` +
 * `tabindex` live on the cell WRAPPER, the element the grid-roving effect
 * (wired in BehaviorElement) actually focuses -- same shape as grid.tsx,
 * where the div carrying `role=gridcell` is what gets `.focus()`, not its
 * content. Non-interactive presets clear any prior slot assignment and
 * fall back to the default `<slot>`, same as Container.
 */

const PRESETS: ReadonlySet<string> = new Set(['linear', 'golden', 'bento']);
const PATTERNS: ReadonlySet<string> = new Set(['editorial', 'dashboard', 'feature', 'portfolio']);
const SPACING: ReadonlySet<string> = new Set(['0', '1', '2', '3', '4', '5', '6', '8', '10', '12']);
const ROLES: ReadonlySet<string> = new Set(['presentation', 'grid']);
const COL_SPANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const ROW_SPANS = [1, 2, 3] as const;

function parsePreset(value: string | null): GridPreset | undefined {
  return value && PRESETS.has(value) ? (value as GridPreset) : undefined;
}

function parsePattern(value: string | null): BentoPattern | undefined {
  return value && PATTERNS.has(value) ? (value as BentoPattern) : undefined;
}

function parseColumns(value: string | null): ResponsiveColumns | undefined {
  if (value === null) return undefined;
  if (value === 'auto') return 'auto';
  const parsed = Number.parseInt(value, 10);
  return parsed >= 1 && parsed <= 12 ? (parsed as ResponsiveColumns) : undefined;
}

function parseSpacing(value: string | null): GridConfig['gap'] {
  return value && SPACING.has(value) ? (value as GridConfig['gap']) : undefined;
}

function parseRole(value: string | null): GridConfig['role'] {
  return value && ROLES.has(value) ? (value as GridConfig['role']) : undefined;
}

function parseSpan<T extends number>(
  value: string | null,
  allowed: ReadonlyArray<T>,
): T | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return (allowed as ReadonlyArray<number>).includes(parsed) ? (parsed as T) : undefined;
}

function parsePriority(value: string | null): ContentPriority | undefined {
  return value === 'primary' || value === 'secondary' || value === 'tertiary' ? value : undefined;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export class RaftersGrid extends BehaviorElement<GridConfig, GridState, GridActions, GridPart> {
  static observedAttributes = [
    'preset',
    'pattern',
    'columns',
    'gap',
    'padding',
    'grid-role',
    'aria-label',
    'class',
  ];

  /** Structural :host shim only -- the inner root carries the utility
   *  class strings, exactly like Container's. */
  static override styles = ':host { display: block; }';

  protected override readonly spec = grid;

  protected override readConfig(): GridConfig {
    return {
      preset: parsePreset(this.getAttribute('preset')),
      pattern: parsePattern(this.getAttribute('pattern')),
      columns: parseColumns(this.getAttribute('columns')),
      gap: parseSpacing(this.getAttribute('gap')),
      padding: parseSpacing(this.getAttribute('padding')),
      // `grid-role`, not `role`: a literal `role` attribute is a REAL,
      // globally-recognized ARIA attribute -- leaving it on the light-DOM
      // HOST (whose actual children are plain slotted content, not row
      // wrappers) makes a false structural claim axe correctly flags
      // (aria-required-children). The real role="grid" lands on the
      // shadow-root part via the aria projection below; the host stays
      // role-less.
      role: parseRole(this.getAttribute('grid-role')),
      ariaLabel: this.getAttribute('aria-label') ?? undefined,
    };
  }

  protected override buildParts(
    _state: GridState,
    config: GridConfig,
    ids: PartIds<GridPart>,
  ): Node {
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    if (ids.root) root.id = ids.root;

    const classes = gridClasses(config, {});
    root.className = classy(classes.root, this.getAttribute('class')) || '';

    const columns = typeof config.columns === 'number' ? config.columns : null;
    const interactive = config.role === 'grid' && columns !== null;
    const children = Array.from(this.children);

    if (interactive) {
      let cellIndex = 0;
      for (const rowChildren of chunk(children, columns)) {
        const row = document.createElement('div');
        row.setAttribute('data-part', 'row');
        row.setAttribute('role', 'row');
        row.className = 'contents';
        for (const child of rowChildren) {
          const slotName = `cell-${cellIndex++}`;
          child.setAttribute('slot', slotName);

          const cell = document.createElement('div');
          cell.setAttribute('data-part', 'cell');
          cell.setAttribute('role', 'gridcell');
          cell.setAttribute('data-roving-item', '');
          cell.setAttribute('tabindex', '-1');

          const slot = document.createElement('slot');
          slot.setAttribute('name', slotName);
          cell.appendChild(slot);
          row.appendChild(cell);
        }
        root.appendChild(row);
      }
    } else {
      for (const child of children) child.removeAttribute('slot');
      root.appendChild(document.createElement('slot'));
    }

    return root;
  }
}

if (!customElements.get('rafters-grid')) {
  customElements.define('rafters-grid', RaftersGrid);
}

/**
 * <rafters-grid-item> -- the item DECLARES what it is (`priority`); the
 * stock layouts in grid.classes.ts place it by that projection, never by
 * source order (grid.md ruling 2). No BehaviorSpec: like React's GridItem,
 * this is plain decoration + the `gridItemAttrs` projection, not a scored
 * part of `grid` (the row/gridcell parts belong to the interactive mode
 * `<rafters-grid>` builds itself; items are for the non-interactive
 * presets). Not registered as a `grid` part -- extends RaftersElement
 * directly rather than BehaviorElement.
 *
 * The projection lands on the HOST itself (light DOM), not an inner shadow
 * div: a parent Grid's structural selectors -- and any plain ancestor
 * query -- need `data-priority` and the span classes visible without
 * reaching into a second shadow root, which is invisible from outside its
 * own tree regardless of query mechanism (real CSS combinator or test
 * traversal alike). Content passes through RaftersElement's default
 * `<slot>` unchanged -- no render() override needed. `classList` is
 * additive (add/remove named span classes only), so a consumer's own
 * `class` attribute is never touched or merged, unlike Container's
 * inner-div indirection.
 */
export class RaftersGridItem extends RaftersElement {
  static observedAttributes = ['priority', 'col-span', 'row-span'];

  static override styles = ':host { display: block; }';

  override connectedCallback(): void {
    super.connectedCallback();
    this.project();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    this.project();
  }

  private project(): void {
    const priority = parsePriority(this.getAttribute('priority'));
    for (const [attr, value] of Object.entries(gridItemAttrs(priority))) {
      if (value === undefined) {
        this.removeAttribute(attr);
      } else {
        this.setAttribute(attr, String(value));
      }
    }

    const colSpan = parseSpan(this.getAttribute('col-span'), COL_SPANS);
    this.classList.remove(...Object.values(gridColSpanClasses));
    if (colSpan) this.classList.add(gridColSpanClasses[colSpan] as string);

    const rowSpan = parseSpan(this.getAttribute('row-span'), ROW_SPANS);
    this.classList.remove(...Object.values(gridRowSpanClasses));
    if (rowSpan) this.classList.add(gridRowSpanClasses[rowSpan] as string);
  }
}

if (!customElements.get('rafters-grid-item')) {
  customElements.define('rafters-grid-item', RaftersGridItem);
}
