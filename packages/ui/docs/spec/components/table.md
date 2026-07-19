# Component Spec — Table

Status: DRAFT. Static score (imitates Card and Container). No state, no actions,
no keymap, no effects, no motion block beyond the row's colour transition
intent. A semantic data table performed across React and Astro; the Web
Component surface is deferred (see Framework scope).

Files (`src/components/table/`):

```
table.behavior.ts   table.classes.ts   table.tsx   table.astro
```

Tests mirror into `test/components/table/` (behavior, classes, React
conformance, Astro conformance).

## Purpose

A semantic table for structured, comparable data: rows are entities, columns
are their attributes. Table renders the native table landmark tree; it does not
sort, filter, or select on its own. A row can carry a selected state, but that
state is the consumer's datum, not a selection model the component owns.

## The finding: a pure static needs no bind

Table is the same data point Card and Container record. Its root score projects
no ARIA (the `<table>`/`<thead>`/`<tr>`/`<th>`/`<td>` tree carries native
role=table/rowgroup/row/columnheader/cell), holds no state, and runs no
effects. There is therefore **nothing to bind**:

- `table.behavior.ts` is the score **only** -- there is no `bindTable`. A DOM
  binding exists to run effects and apply projections imperatively; a static
  with an empty root projection and no effects has neither.
- `table.tsx` uses **no** `useBehavior`/`useMemory` -- config in, classes out,
  children through; the per-row selected projection is applied at render.
- `table.astro` ships **no** `<script>` -- server-rendered markup with the
  shared class strings and a default slot; there is nothing to hydrate.

The score is declared at all so the conformance harness can assert two real
contracts identically across frameworks: the `root` part renders and projects
no ARIA, and each `row` instance projects its selected state.

## Framework scope

React and Astro, matching the oracle (`frameworks.oldTree: [astro, react]`).
The Web Component surface is deferred: a table's styled elements
(`thead`/`tbody`/`tr`/`td`) must be real table descendants, so the pure-static
shadow+slot model (Card, Container) cannot wrap them without breaking table
layout and the shared-classes premise. The WC row of the matrix stays
`missing`; adding it is a separate disposition, not this port's.

## Composition

```
Table          root <table> (wrapped in an overflow div)
Table.Caption  <caption>, muted bottom-anchored label
Table.Header   <thead>, underlines its row
Table.Body     <tbody>, drops the last row's border
Table.Footer   <tfoot>, top border on a muted surface
Table.Row      <tr>, the selectable unit; selected -> aria-selected + data-state
Table.Head     <th>, header cell (give it scope="col"/"row")
Table.Cell     <td>, data cell
```

`Table.Header`/`Body`/`Footer`/`Head`/`Cell`/`Caption` carry no behaviour of
their own -- they are plain framework wrappers over literal class strings,
composed by the consumer inside a Table. Only `Table` and `Table.Row` map to
declared parts, because they are the only nodes with a contract to audit.

### Framework composition model

React composes freely through the namespaced compound (`Table.Header`,
`Table.Row`, ...), each sub-component applying its class string and, for
`Table.Row`, the `tableRowAttrs` selected projection. Astro cannot nest a
namespaced compound the same way, and a `<table>` cannot be built from named
region slots (its sections must be real table descendants), so the Astro
performance renders the root and the consumer composes the semantic tree inside
the default slot, applying the exported class strings (`tableHeaderClasses`,
`tableRowClasses`, ...) and `tableRowAttrs` to their own elements. This mirrors
the oracle's Astro surface (root + slot, sub-parts as class strings).

## Config, state, actions

```ts
type TableConfig = Record<never, never>;
type TableState = Record<never, never>;
type TableActions = Record<never, never>;
```

The root takes no config. The one per-instance input is `Table.Row`'s
`selected?: boolean` prop, projected by `tableRowAttrs`.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection; role=table is native to `<table>` |
| row | many, optional | selected -> `aria-selected="true"` + `data-state="selected"`; else neither |

`tableRowAttrs(selected)` is the row's per-instance projection (the same shape
as Grid's `gridItemAttrs`): a selected row is announced (`aria-selected="true"`,
a spec-supported property of role=row) and tinted (the `data-state="selected"`
hook the row decoration keys off). An unselected row carries NEITHER attribute
-- `aria-selected="false"` on every row is noise, so absence is the default.

Header/body/footer/head/cell/caption are structural composition, not
ARIA-bearing parts of the score (boundary 5: a binding rendering an undeclared
part is structure the score never authorized). Cells and sections carry
`data-slot`, never `data-part`.

## Keyboard and effects

None. A static score with an empty root projection and no selection model has
nothing to dispatch, gate, or execute -- which is why it needs no client. The
row's colour transition (`transition-colors motion-reduce:transition-none`) is
a decoration intent; its duration comes from tokens, never a hardcoded utility.

## Oracle dispositions (src/old/ui/table.{tsx,astro,classes.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `Table` + `TableHeader`/`TableBody`/`TableFooter`/`TableRow`/`TableHead`/`TableCell`/`TableCaption` compound | contract (shadcn v4 drop-in family) |
| overflow wrapper `<div>` around the `<table>` | contract -- horizontal scroll for wide data |
| `data-[state=selected]` row hook | contract -- now driven by the `selected` prop through `tableRowAttrs`, which also adds `aria-selected` (the oracle set only the class hook, no ARIA) |
| `[&:has([role=checkbox])]:pr-0` / `[&>[role=checkbox]]:translate-y-0.5` cell selectors | contract -- shadcn checkbox flush |
| `duration-150` on the row transition | dropped -- redundant with `transition-colors` (Tailwind's default duration), and durations come from tokens (Spec 04) |
| Astro `data-table=""` marker attributes | dropped -- replaced by the `data-part`/`data-slot` vocabulary the harness reads |
| Web Component surface | deferred -- oldTree ships no WC; the shadow+slot static model cannot wrap real table descendants (see Framework scope) |

## Deltas from the oracle

1. Row selection now projects `aria-selected` alongside the `data-state` hook,
   so a selected row is announced, not merely coloured -- driven by the
   `selected` prop through `tableRowAttrs`.
2. The redundant `duration-150` is dropped; `transition-colors` carries the
   default duration/easing and the motion intent stays token-driven.
3. The `data-table`/`data-table-*` marker attributes are replaced by the
   `data-part`/`data-slot` vocabulary the conformance harness audits.

## shadcn drop-in parity

shadcn's Table exports `Table`, `TableHeader`, `TableBody`, `TableFooter`,
`TableRow`, `TableHead`, `TableCell`, and `TableCaption`. This port matches that
surface through the namespaced compound (`Table.Header`, `Table.Body`, ...). A
consumer migrating a shadcn table needs no prop changes beyond the import path;
the added `selected` prop on `Table.Row` is a superset (the oracle set
`data-state="selected"` by hand), not a breaking change.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the native table tree carries the structure --
  give `Table.Head` a `scope` (`col`/`row`) so assistive tech associates each
  data cell with its headers, and never hide the header row or use a table for
  layout.
- 4.1.2 Name, Role, Value: a selected row's `aria-selected="true"` rides the
  native row role; absence (never `aria-selected="false"`) keeps unselected
  rows quiet.
- 1.4.3 Contrast: the row surfaces (`bg-muted/50` hover, `bg-muted` selected)
  and the muted label/caption typography are contrast-tuned token pairings.
- 2.1.1 Keyboard: the table itself is not interactive; when cells contain
  controls (a selection checkbox, a link), those controls carry their own
  keyboard semantics.
- Landmark containment: a table is not a landmark -- the page around it supplies
  the region. The conformance suites render inside a `<main>` so the axe
  best-practice `region` rule is satisfied by the page, not the table.
