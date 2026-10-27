# Component Spec — Grid

Status: DRAFT. Fifth test article: a static score whose contract is
structural (roles, per-instance priority projection) plus one keyboard
effect. The stock-layout carrier.

Files (`src/components/grid/`):

```
grid.behavior.ts   grid.classes.ts   grid.tsx   grid.astro
```

`grid.behavior.ts` holds the score AND `bindGrid(root)` -- the DOM-native
client the
Astro `<script>` (`grid.astro`) imports. React (`grid.tsx`) reads the
projection declaratively via `createBehavior` + `useMemory` +
`useBehaviorEffects` (no `useBehavior`). One score, two performances.

## Rulings (Sean, 2026-07-03)

1. **Columns are whatever the agent wants, 1–12.** Twelve is the mechanical
   ceiling: the literal class vocabulary ends there (JIT scanner; no
   arbitrary values) and 12 is the span denominator (halves, thirds,
   quarters, sixths). Miller's-law limits are ADVICE in the docblocks and
   MCP intelligence, never enforcement.
2. **Priority is 100% behavior.** Items DECLARE what they are —
   `gridItemAttrs(priority)` projects `data-priority` — and the stock
   layouts place by that projection. Boundary 6 corollary: looks key off
   projected attributes. Reordering the tree cannot change which item is
   the hero (asserted in conformance).
3. **`role="grid"` is honest or absent.** The ARIA grid pattern demands row
   structure, and fluid columns cannot honestly claim rows. Type-gated:
   `role='grid'` compiles only with a fixed numeric `columns`, a required
   `aria-label`, and the linear preset (uniform cells). The performance
   chunks children into `role=row` wrappers (display: contents) of exactly
   N `role=gridcell` cells; the `grid-roving` effect supplies the keyboard
   contract (Left/Right ±1, Up/Down ±columns, Home/End). Default stays
   presentation — layout grids are silent furniture.

## Stock layouts

| Preset | Structure | Intent |
| --- | --- | --- |
| linear | equal grid-cols-N, or auto (`1 → @sm:2 → @lg:3 → @xl:4`, container axis) | democratic attention |
| golden | 3-col, `[data-priority=primary]` spans 2 | 2:1 editorial hierarchy |
| bento/editorial | 3×2, primary 2×2 | hero + supporting |
| bento/dashboard | 4×2, primary 2×2 | metric + data |
| bento/feature | 2-col, primary spans 2 rows | feature + benefits |
| bento/portfolio | 3×3, primary 2×2 | featured + gallery |

Future direction (pinned, second round): stock layouts as a REGISTERED
SCHEMA — layout JSON in the token registry, named slots, generator-emitted
selection classes. Geometry only, ever: the first conditional or binding in
that JSON is the template framework boundary 5 prohibits.

## Item content

The content of a `Grid.Item` fills the item. The item is placed by its
spans (or by `data-priority` under a stock layout) and its content takes the
item's full block size, so a Card in a primary bento item is as tall as both
rows plus the gap, and the tiles in a row are one height. `Grid.Item` carries
`grid` for this: its auto track stretches to the item's area and its child
stretches to the track. Placement is unchanged.

The item makes its content fill, not Card, because the outcome is about a grid
item's content rather than only Cards, and it reaches every child placed in a
grid.

## Oracle dispositions (boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| presets, patterns, spans, gap/padding, CQ auto-spacing | contract |
| `[&>*:first-child]` positional placement | defect-do-not-port — placement inferred intent from source order; replaced by the data-priority projection |
| auto columns emitting BOTH container (`@sm:`) and viewport (`sm:`) classes | defect-do-not-port — double-axis conflict, cascade-order-dependent; auto is container-axis only now |
| `role="grid"` set with no keyboard/row semantics | defect-do-not-port — 4.1.2 lie; replaced by the gated honest implementation |
| `Grid.Item` `priority` prop rendering data-priority with zero effect | defect-do-not-port as dead prop; now the placement channel |
| responsive columns object on the VIEWPORT axis | ported per documented intent (page-level layouts respond to viewport); container-axis variant pending ratification |
| editable / showColumnDropZones / GridItemDropZone / onConfigChange | stripped — studio-layer concern (pending ratification); onConfigChange was a void'd dead callback |

## Framework dispositions

- **`role="grid"` opt-in attribute is `grid-role`.** On a light-DOM host a
  bare `role="grid"` both collides with the platform `role` attribute and is
  a 4.1.2 axe violation before the row/gridcell children are parsed.
  `bindGrid` reads `grid-role` and PROJECTS the honest `role="grid"` onto the
  root once the structure exists. React keeps the idiomatic `role` prop (it
  renders role and rows in the same commit, so there is no bare-role window).
- **`grid-roving` executor resolves focus via `getRootNode()`**, which is
  `document` in light DOM.
- **Astro conformance is not exercised.** `grid.astro` ships and SSRs the
  initial projection, but the repo has no `conformance [astro]` harness on
  `feat/behavior-layer`, so the matrix leaves `astro: "missing"`. React
  drives the one score under the shared harness (`react: "verified"`).

## Gotcha ledger

1. **Controlled-callback before/after: N/A.** Grid has no controlled value
   and no actions (`GridActions = Record<never, never>`), so there is no
   consumer callback to fire and nothing to compare. The gotcha is
   inapplicable to this archetype, not omitted.
2. **`aria-manager` `{ validate: false }`.** The score's projection is
   already resolved, so `bindGrid` applies it with `validate:false` to skip
   author-input coercion (which would flip the string `'false'` to truthy).

## WCAG obligations

- 4.1.2: role=grid only with real row/gridcell structure and an accessible
  name (type-enforced), silent otherwise.
- 2.1.1: full arrow/Home/End keyboard in grid mode, asserted in
  conformance.
- 1.3.1: layout grids stay presentation-silent so structure is not
  over-announced.
