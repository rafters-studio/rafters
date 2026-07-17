# Component Spec — Select

Status: DRAFT. Wave-1 port. Archetype `menu-collection-popup`: the compound
ARIA of navigation-menu (combobox/listbox/option, many-instance options) over
the overlay effects of dialog (roving, typeahead, outside dismissal).

Files (`src/components/select/`):

```
select.classes.ts    select.behavior.ts    select.tsx    select.element.ts    select.astro
```

Tests mirror into `test/components/select/` (behavior, classes, React + WC +
Astro conformance).

## Composition

```
select slice   state {open, value, highlighted}, actions open/close/select/highlight,
               combobox/listbox/option aria, trigger + item keymaps, open effects
```

One score slice, no glue: the open/value/highlighted axes are tightly coupled
(select sets value AND closes AND clears highlight; close clears highlight), so
splitting `close` across a disclosable slice and the reset would collide on
action ownership. Controlled/uncontrolled per boundary 4: `config.value`/
`config.open` are the consumer's controlled values, `state.value`/`state.open`
are intrinsic, projections and gates read `selectedValue(state, config)` /
`isOpen(state, config)`. The idempotence gate (open only when effectively
closed, close only when effectively open) makes consumer callbacks fire once
per real transition.

`highlighted` mirrors DOM focus. Roving-focus (arrows), typeahead
(type-to-jump), pointer move, and open-focus all move focus to an option; the
binding's focus listener turns that into `highlight`, so exactly one option is
ever visibly active and `data-highlighted` follows the active option.

Substrate composed (never rewritten): `roving-focus`, `typeahead` (both run as
declarative effects), `dismiss-on-outside`, `aria-manager`, `memory`
(via `createBehavior`), `form-value` (new — the mirrored hidden input).

## Config, state, actions

```ts
interface SelectConfig {
  value?: string;        // controlled
  defaultValue?: string; // uncontrolled seed
  open?: boolean;        // controlled
  defaultOpen?: boolean; // uncontrolled seed
  disabled?: boolean;
  name?: string;         // form field name (drives the hidden input)
}
interface SelectState { open: boolean; value: string; highlighted: string | undefined }
type SelectActions = {
  open: undefined; close: undefined; select: string; highlight: string;
};
```

No `toggle` action: the trigger dispatches `open` or `close` computed from the
effective value, so intrinsic state never drifts from a controlled consumer.
`select` is the single action that moves both value and open — it fires
`onValueChange` and `onOpenChange(false)` and clears the highlight.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-state`, `data-disabled` |
| trigger | always | `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` (only while open and the listbox id is real), `aria-disabled`, `data-state`, `data-disabled` |
| content | always, hidden when closed | `role="listbox"`, `aria-labelledby` (the trigger), `data-state` |
| item (many) | always | `aria-selected`, `data-state` (`checked`/`unchecked`), `data-highlighted` (active only); `role="option"`, `tabindex="-1"`, `data-value`, `data-roving-item`, `aria-disabled` are static markup |
| value | always | none — the binding writes the selected option's label (or the placeholder) and toggles `data-empty` |
| hidden-input | when `name` set | none — `type=hidden name value`, mirrored from the value |

Empty-id convention (ratified 2026-07-08): a reference to an empty PartId
projects `undefined` (an absent attribute), never a dangling one. The trigger's
`aria-controls` keys off both `open` and a real content id.

Combobox naming (WCAG 4.1.2): a `role="combobox"` takes its accessible name
from a label, not its contents (its contents are the current value). The
consumer supplies the name (`aria-label`, or an associated `<label>`), exactly
as a native `<select>` requires.

## Keyboard and effects

- `keymap`:
  - trigger: `ArrowDown`/`ArrowUp`/`Enter`/`Space` -> `open` (the binding
    `preventDefault`s so the native button click cannot toggle back closed).
  - item/content: `Escape` -> `close` (returns focus to the trigger);
    `Enter`/`Space` -> `select` (the binding reads the focused option's value).
- Arrow/Home/End movement across options is the `roving-focus` effect, not the
  keymap — focus position is ephemeral DOM state.
- `effects(state, config)`: open ->
  `roving-focus(content, vertical)`, `typeahead(content)`,
  `dismiss-on-outside(content, close, except trigger)`. Closed -> `[]`.

## Oracle dispositions (src/old/ui/select.tsx + select.controller.ts)

| Oracle feature | Disposition |
| --- | --- |
| single-select value; `selectValue` fires onValueChange + closes | contract |
| `setOpen(false)` clears the keyboard highlight | contract (the `close`/`select` reducers clear `highlighted`) |
| controlled/uncontrolled value and open + callbacks | contract (effective-before vs intrinsic-after on both axes) |
| Trigger/Value/Content/Item/Group/Label/Separator/Portal/Viewport/ScrollUp/DownButton/Icon surface | contract (React shadcn drop-in; each extra is a thin view wrapper) |
| `asChild` on Trigger/Content/Value/Item | framework affordance (React) |
| chevron included in Trigger; checkmark indicator on selected option | contract |
| typeahead type-to-search | contract (moved into the closed effect vocabulary as `typeahead`, executor wraps the existing primitive) |
| roving keyboard navigation | contract (the `roving-focus` effect) |
| open focuses selected-or-first option | contract (`focusSelectedOption`, shared by bind + React) |
| pointer move highlights an option | contract (pointer move focuses the option; focus mirrors into highlight) |
| `labelVersion` bottom-up label registry | defect-do-not-port — React-specific machinery. The listbox lives in light DOM (present-but-hidden), so the value text reads the selected option's `textContent` directly |
| `computePosition` collision positioning + scroll/resize listeners | not ported — positioning is not behavior state and is not in the effect vocabulary. Tracked disposition: reduced positioning fidelity (the listbox anchors via CSS, not measured collision) |
| `SelectPortal` to `document.body` | pass-through in the behavior-layer model (no portal); the API is preserved for shadcn compatibility |
| form association | contract (new `form-value` primitive — a mirrored hidden input; the old select had none) |

## Deltas from the oracle

1. Trigger sizing: `h-11` touch floor, `@md:h-9` desktop, via the container
   query system (not viewport `sm:`).
2. `data-[highlighted]` is now a live styling hook (`bg-accent`) matching the
   focused-option look; the oracle set the attribute but never styled it.
3. The listbox stays in light DOM (crawlable, SSR-stable, effect-readable)
   rather than portaling — the dialog/navigation-menu overlay pattern.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: combobox/listbox/option roles, `aria-expanded`,
  `aria-controls`, `aria-selected`, and the trigger->listbox `aria-labelledby`
  wiring asserted against real DOM ids by the harness. The consumer supplies
  the combobox's accessible name.
- 2.1.1 Keyboard: open with the keyboard, rove options with arrows/Home/End,
  type-to-search, commit with Enter/Space, dismiss with Escape.
- 2.4.3 Focus Order: opening moves focus to the selected (or first) option;
  Escape and selection restore focus to the trigger.
- 2.4.7: token focus ring on the trigger; focused/highlighted options carry the
  accent surface.
- 4.1.2 Name, Role, Value: the mirrored hidden input carries the value into
  native form submission when `name` is set.
