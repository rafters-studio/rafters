# Component Spec — Grid

Status: DRAFT. Fifth test article: a static score whose contract is
structural (roles, per-instance priority projection) plus one keyboard
effect. The stock-layout carrier.

Files (`src/components/grid/`):

```
grid.classes.ts    grid.behavior.ts    grid.tsx
```

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

## Oracle dispositions (src/old/ui/grid.{tsx,classes.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| presets, patterns, spans, gap/padding, CQ auto-spacing | contract |
| `[&>*:first-child]` positional placement | defect-do-not-port — placement inferred intent from source order; replaced by the data-priority projection |
| auto columns emitting BOTH container (`@sm:`) and viewport (`sm:`) classes | defect-do-not-port — double-axis conflict, cascade-order-dependent; auto is container-axis only now |
| `role="grid"` set with no keyboard/row semantics | defect-do-not-port — 4.1.2 lie; replaced by the gated honest implementation |
| `Grid.Item` `priority` prop rendering data-priority with zero effect | defect-do-not-port as dead prop; now the placement channel |
| responsive columns object on the VIEWPORT axis | ported per documented intent (page-level layouts respond to viewport); container-axis variant pending ratification |
| editable / showColumnDropZones / GridItemDropZone / onConfigChange | stripped — studio-layer concern (pending ratification); onConfigChange was a void'd dead callback |

## WCAG obligations

- 4.1.2: role=grid only with real row/gridcell structure and an accessible
  name (type-enforced), silent otherwise.
- 2.1.1: full arrow/Home/End keyboard in grid mode, asserted in
  conformance.
- 1.3.1: layout grids stay presentation-silent so structure is not
  over-announced.
