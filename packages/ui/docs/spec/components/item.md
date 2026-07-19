# Component Spec — Item

Status: DRAFT. Static score with a CONFIG-DRIVEN projection (imitates the
Card/Container no-bind shape, but the projection is not empty). No state, no
actions, no keymap, no effects, no motion state. Performed across all three
frameworks (React, the `<rafters-item>` web component, and Astro).

Files (`src/components/item/`):

```
item.behavior.ts   item.classes.ts   item.tsx   item.element.ts   item.astro
```

Tests mirror into `test/components/item/` (behavior, classes, React
conformance, WC conformance, Astro conformance).

## Purpose

A generic list row: an optional leading icon, the label, and an optional
description, laid out as a single `role="option"`. Item is the building block a
listbox, menu, or selection surface stacks -- it carries the row's semantics
(selected / disabled) but not a control's keyboard contract.

## The finding: a static can project without a bind

Card and Container are pure statics with EMPTY projections -- a div/article's
semantics are native to the element, so the score projects nothing and needs no
client. Item is the next point on that line: `role="option"` and the
selected/disabled semantics are NOT native to a `div`, so the score projects
them -- but they are derived purely from config, with no runtime state to
remember and no effect to run. So Item still needs **nothing to bind**:

- `item.behavior.ts` is the score **only** -- there is no `bindItem`. The
  projection is a total function of config; there is no state axis and no
  effect vocabulary to execute.
- `item.tsx` reads `item.aria(...)` synchronously in render and spreads it --
  **no** `useMemory`, no subscription.
- `item.astro` ships **no** `<script>` -- the projection is resolved at SSR and
  spread onto the row.
- `item.element.ts` applies the projection once per observed-attribute change
  in `render()` -- **no** binding, no event wiring.

The score is a total function from config to attributes, so the three
performances cannot drift; the conformance harness asserts the same projection
against real DOM in each.

## Composition

```
Item   root (div, role=option): the row
  icon         div (aria-hidden), leading slot -- a visual anchor, not content
  content      div (flex column): label + optional description
    label       div, the primary text (default slot)
    description div, muted secondary text
```

Only `Item` (the row) is a declared part -- it is the only node with a contract
to project. The icon / content / label / description wrappers carry classes but
no `data-part` (boundary 5). The wrappers are `div`s, not the oracle's `span`s
and not Typography components (the new tree has no Typography yet -- the
card/alert disposition); under the flex row/column they lay out identically.

### Framework slot model

React composes freely (`icon` and `description` are props, children are the
label). The web component and Astro cannot nest arbitrary children into regions
without a runtime, so they expose fixed named slots: `icon`, `description`, and
the default slot for the label.

## Config, state, actions

```ts
type ItemSize = 'default' | 'sm' | 'lg';

interface ItemConfig {
  size?: ItemSize;   // padding + typography scale
  selected?: boolean; // projects aria-selected + data-selected
  disabled?: boolean; // projects aria-disabled + data-disabled, tabindex -1
}
type ItemState = Record<never, never>;
type ItemActions = Record<never, never>;
```

State is styled by **variant**, not by a JS branch: the score projects the
`aria-*` attributes and the Tailwind `aria-selected:` / `aria-disabled:`
variants react to them (attribute-selector specificity wins over the base
`text-foreground` regardless of compiled source order). Selected and hover both
resolve to the accent pairing -- the same tokens, so they never compete -- and
`aria-disabled:pointer-events-none` suppresses hover on a disabled row. The
oracle's imperative `stateStyles` branch is replaced by one projection plus one
declarative rule per state.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="option"`; `aria-selected` always (`"true"`/`"false"`); `aria-disabled="true"` only when disabled; `tabindex` `0`, or `-1` when disabled; `data-selected`/`data-disabled` styling hooks only when set |

`aria-selected` is projected in both states so the selection is announced either
way. `aria-disabled` and the `data-*` hooks are omitted (not rendered) when
false -- a projected `undefined` means the attribute must not appear.

## Keyboard and effects

None. Item claims no keys and runs no effects. A list row is an **option** owned
by a listbox/menu parent, and the parent owns roving focus (which row is
`tabindex=0`) and activation (Enter/Space/click). Item projects the option
semantics and the disabled tab-order rule; it does not fabricate a standalone
control's keyboard contract.

## Oracle dispositions (src/old/ui/item.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `size` (default/sm/lg) | contract |
| `selected` -> aria-selected + data-selected | contract |
| `disabled` -> aria-disabled + data-disabled + tabindex | contract |
| `role="option"` on the row | contract |
| `icon` slot + `description` slot + label | contract |
| Enter/Space -> synthetic `click` on a bare `div` (React `handleKeyDown`) | dropped -- framework affordance. A row is an option; the listbox/menu parent owns activation and roving focus. A no-bind static wires no events |
| `onClick`/`onKeyDown` guarded by `disabled` in the React row | dropped -- the row is not a control; consumer/parent handlers ride `...props`. `aria-disabled:pointer-events-none` already blocks pointer interaction on a disabled row |
| imperative `stateStyles` branch (JS picks one of disabled/selected/default) | ported as VARIANT classes -- the projection sets `aria-*`, the `aria-*:` variants style; no JS branch |
| inner wrappers as `<span>` | ported as `<div>` -- the new tree has no Typography component (card/alert disposition); flex layout is identical |
| React `tabIndex={undefined}` when disabled vs WC `tabIndex=-1` | reconciled to a single projected `tabindex="-1"` when disabled -- one score, no per-framework drift |

## Deltas from the oracle

1. The synthetic-click keyboard activation is dropped -- Item is an option, not
   a self-activating control; the container owns activation and roving focus.
2. State visuals move from an imperative JS branch to `aria-*` variant classes
   driven by the projection -- one source of truth, styled declaratively.
3. The disabled tab-order is reconciled to a single projected `tabindex="-1"`,
   ending the oracle's React-vs-WC discrepancy.
4. Inner text wrappers are `div`s (no Typography component yet).

## shadcn drop-in parity

The oracle Item is a Rafters extension (icon / description / selected / disabled
/ size), not part of classic shadcn's surface; this port preserves that oracle
surface verbatim (EXTRACT, not rebuild). shadcn's newer `Item` composition
family (ItemMedia/ItemContent/ItemTitle/...) is a separate upstream API and is
out of scope for this port.

## Package export

Exported at module level exactly as the article statics (Container, Grid) are:
`export const Item` plus a default export from `item.tsx`, consumed by the
composite tree via its component path. No `package.json` export entry is added
(the articles carry none).

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the row projects `role="option"` and its
  selection state. An option is only meaningful inside its required container --
  place Item inside a `listbox`/`menu` (with an accessible name); every
  conformance scenario renders it inside a `role="listbox"` so axe's
  `aria-required-parent` is satisfied.
- 4.1.2 Name, Role, Value: `aria-selected` is always present so assistive tech
  reads the selection state; `aria-disabled` marks an unavailable row.
- 2.1.1 Keyboard: Item itself claims no keys -- the listbox/menu parent supplies
  roving focus and activation. A disabled row is dropped from the tab order
  (`tabindex="-1"`).
- 1.4.3 Contrast: the `text-foreground` / accent pairings are contrast-tuned
  token pairs; a disabled row uses `text-muted-foreground` at reduced opacity,
  which stays a non-interactive affordance, not primary content.
- Motion: the colour transition is honoured only when the user allows motion
  (`motion-reduce:transition-none`).
