# Component Spec — Command

Status: DRAFT. Wave-4 port. Archetype: menu-collection-popup.

A command palette: a search combobox that fuzzy-filters a listbox of options,
invoked keyboard-first. Ports the React-only `src/old/ui/command.tsx` to the
behavior layer with three performances (React, Web Component, Astro).

Files (`src/components/command/`):

```
command.classes.ts   command.behavior.ts   command.tsx   command.element.ts   command.astro
```

Tests mirror into `test/components/command/` (behavior, classes, and React / WC
/ Astro conformance).

## Composition

```
command slice   state {query, highlighted}, actions setQuery/highlight/
                highlightNext/Prev/First/Last/select, parts root/input/list/
                item/empty, combobox+listbox aria, input keymap
```

Single slice over the one `createBehavior` cell. The active option is a plain
reducer value, not a second cell: `createSelectionGroup`/`createCommandPalette`
own their own cells and do not compose, so the highlight is re-expressed as
`highlighted` on this cell (the pattern radio-group/select/tabs follow).

Filtering composes the `command-palette` primitive's **pure** `fuzzyMatch`. The
`createCommandPalette` CONTROLLER does not compose: it owns a cell and is
editor-specific (its `shouldTrigger` reads contenteditable selection ranges);
only the pure matcher is a seam.

`roving-focus` is deliberately NOT composed. See the oracle dispositions.

## Config, state, actions

```ts
interface CommandConfig {
  value?: string;        // controlled query
  defaultValue?: string; // uncontrolled seed
  label?: string;        // accessible name for the listbox (default 'Suggestions')
}
interface CommandState {
  query: string;                    // intrinsic search query
  highlighted: string | undefined;  // active option value (aria-activedescendant)
}
type CommandActions = {
  setQuery: string;         // set query, reset highlight
  highlight: string;        // point at a value (pointer)
  highlightNext: string[];  // step over the ordered visible values
  highlightPrev: string[];
  highlightFirst: string[];
  highlightLast: string[];
  select: string;           // commit: settle highlight; bindings fire the invoke
};
```

Controlled/uncontrolled per boundary 4: `config.value` shadows `state.query`;
projections read `queryValue(state, config)`. Changing the query resets the
highlight (ported `activeIndex = -1`). The navigation actions take the ordered
set of currently-visible option values as their payload, because that set is
DOM-derived (fuzzy match against the live option list) and the score is pure —
`moveHighlight` computes the next value over it, clamping (never wrapping).

There is **no open axis**: the palette list is always present. Open/close lives
only in the `CommandDialog` wrapper.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | container; no role |
| input | always | `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="true"`, `aria-controls` (listbox id, only when rendered), `aria-activedescendant` (highlighted option id, set by the bindings) |
| list | always | `role="listbox"`, `aria-label` (from `label`, default `Suggestions`) |
| item | many | `role="option"`, `aria-selected` (highlighted), `data-selected`/`data-highlighted`, `hidden` when it does not match the query |
| empty | present-but-hidden | shown only when the query is non-empty and nothing matches |

The consumer must give the `input` an accessible name (`aria-label` or an
associated `<label>`); it is a combobox and axe requires a name.

`aria-activedescendant` is set imperatively (its target is a per-instance option
id, not a part-name id), so it is not in `aria()` — the harness asserts it via
interaction, not contract equality.

## Keyboard

Focus stays on the input (virtual focus); options are never individually
focusable. On the input:

- `ArrowDown` / `ArrowUp`: move the highlight to the next / previous visible
  option, clamping at the ends (no wrap).
- `Home` / `End`: jump to the first / last visible option.
- `Enter`: invoke the highlighted option (routed through the option's click path
  so keyboard and pointer commit identically).
- Typing: filters; the highlight resets so no stale option stays active.

Invocation raises a `command-select` CustomEvent (`detail.value`) on the root
for WC/Astro consumers; React consumers use the item's `onSelect` prop, which
fires from the same click path.

## Oracle dispositions (`src/old/ui/command.tsx`, React-only)

| Oracle feature | Disposition |
| --- | --- |
| combobox input + listbox + option roles, aria-activedescendant virtual focus | contract |
| controlled/uncontrolled search value + onValueChange | contract |
| Command / Dialog / Input / List / Empty / Group / Item / Separator / Shortcut surface + `Command.*` namespace | contract (shadcn drop-in floor) |
| ArrowDown/Up clamp (no wrap), Home/End to first/last, reset highlight on query change | contract (extracted from the oracle's `min`/`max` on activeIndex) |
| mouse-enter highlights the pointed option | contract (moved to `pointermove` -> `highlight`) |
| substring `includes` filter | upgraded to fuzzy matching via the command-palette primitive's `fuzzyMatch` (issue-directed; a deliberate contract change, not a silent swap) |
| Enter only set `selectedValue`, never fired the item's action | defect-do-not-port — Enter now invokes the highlighted option through the same click path as pointer, so the option's `onSelect` fires |
| `roving-focus` (issue's "add" list) | dropped — a combobox keeps DOM focus on the input and points at the active option virtually (aria-activedescendant); roving-focus moves DOM focus and item tabindex (and wraps), which would pull focus off the search box and break typing. Three signals converge: the oracle's aria-activedescendant + its explicit "options not individually focusable" note, the issue's `highlighted` state axis (a reducer value, not DOM focus), and shadcn/cmdk parity (aria-activedescendant). The primitive list is INTENT; this is the INTENT-vs-FACT escape hatch the issue names |
| `CommandDialog` (React-only convenience) | contract, upgraded: the oracle wrapped Command in a backdrop + Escape listener; it now composes the modal trio (focus-trap + preventBodyScroll + outside-dismiss) via `startCommandDialogEffects`, imitating `dialog` per the issue. Provided in React (the surface the oracle shipped); WC/Astro consumers compose the merged `dialog` + `command` |
| slash-trigger / contenteditable activation (command-palette primitive) | framework-affordance not ported — that is the editor palette, a separate surface from the shadcn command list |

## Motion

Enter/exit intent is **fade** for the `CommandDialog` overlay. The core palette
has no open axis and therefore no enter/exit motion. The semantic motion tokens
(`motion-modal-in`/`-out`, #1899) do not exist yet, so per the issue the dialog
enter/exit motion is left **undeclared** rather than hardcoding a raw duration;
the option color swap uses `transition-colors` with `motion-reduce:transition-none`
and no numeric duration.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: combobox + listbox + option roles and the aria-controls /
  aria-activedescendant wiring asserted against real DOM ids by the harness.
- 2.1.1 Keyboard: full navigation and invocation from the input; no pointer
  requirement.
- 2.4.3 Focus Order: focus stays on the input; the active option is virtual and
  singular.

The empty state is a presentational (`role="presentation"`) visual affordance
that appears only when a query matches nothing; it is not a live region and
makes no 4.1.3 status-message announcement.
