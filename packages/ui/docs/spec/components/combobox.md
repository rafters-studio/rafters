# Component Spec — Combobox

Status: PORTED (wave-4). A filtering autocomplete: a text input that discloses a
listbox of options, filtered by what is typed, committed by selection.

Files (`src/components/combobox/`):

```
combobox.behavior.ts   combobox.classes.ts
combobox.tsx           combobox.element.ts   combobox.astro
```

Tests mirror into `test/components/combobox/`: a pure behavior test, a classes
parity test, and conformance across React, WC, and Astro through the shared
harness.

## Archetype

`menu-collection-popup`, in its EDITABLE combobox variant (WAI-ARIA APG
"Combobox" with `aria-autocomplete="list"`). DOM focus never leaves the input;
the active option is advertised with `aria-activedescendant`, not by moving
focus into the list. This is the semantic the old React code earned and the port
preserves.

## Composition

The behavior is a single slice over the one `createBehavior` cell. Impure work is
composed DIRECTLY (effects-as-data is retired, Spec 03):

```
collision-detector   positionCombobox(input, content) -- fixed positioning,
                     listbox width matched to the input, run after un-hide
outside-click        onPointerDownOutside(content, close) -- light dismiss,
                     sparing the input and the toggle
```

Escape rides the score's `keymap` (no `escape-keydown` primitive needed: focus is
on the input, inside the root, so the root keydown listener sees it).

### Primitives the archetype names but this variant does not compose

| Primitive | Why not here |
| --- | --- |
| roving-focus | Moves DOM focus and tabindex across options. The editable combobox keeps focus on the input and tracks the active option with `aria-activedescendant`, so there is no focus to rove. `highlighted` is a plain reducer over the cell. |
| typeahead | Type-to-jump over a focused list. Here keystrokes go to the input and FILTER; there is no separate typeahead surface. |
| selection-group | Cell-owning (returns its own memory cell) and therefore cannot compose. The selected value is re-expressed as the `value` reducer, as radio-group/select/tabs did. |
| form-value | Builds a hidden mirror input for controls that are NOT native form fields. This component already has a real `<input>`; mirroring would submit twice. |
| input-events | The contenteditable/IME editor handler, not a plain-input primitive (input, input-group, input-otp all refused it). The native `<input>` owns caret/IME. |

roving-focus and typeahead are live primitives (select composes both). Their
absence here is a fits-this-component call, not a rejected-primitive call.

## Config, state, actions

```ts
interface ComboboxConfig {
  value?: string;        // controlled selected value ('' = none)
  defaultValue?: string; // uncontrolled seed
  open?: boolean;        // controlled open
  defaultOpen?: boolean; // uncontrolled seed
  disabled?: boolean;
}
interface ComboboxState {
  open: boolean;
  query: string;                    // the input's text
  value: string;                    // intrinsic selected value
  highlighted: string | undefined;  // value of the active option
}
type ComboboxActions = {
  open: undefined;
  close: undefined;
  setQuery: string;                        // type -> filter, opens, clears highlight
  highlight: string;                       // pointer hover -> point at a value
  highlightNext: string[];                 // arrow down; payload = visible values (DOM order)
  highlightPrev: string[];                 // arrow up; payload = visible values
  select: { value: string; label: string }; // commit: set value + fill input, close
};
```

`open` and `value` follow the controlled-vs-intrinsic boundary (config shadows
state; effective reads are `isOpen`/`selectedValue`). The idempotence gate on the
open axis makes `onOpenChange` fire once per real transition. `highlighted` is a
VALUE, not an index, so `comboboxItemAria` and the `aria-activedescendant`
projection resolve it directly; the navigation actions take the visible
(filtered) values the binding supplies and clamp against them purely
(`nextHighlight`).

The filter predicate is pure and shared by all three performances:
`matchesQuery(label, value, query)` matches on label OR value, case-insensitively,
with an empty query matching everything.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-state`, `data-disabled` |
| input | always | `role="combobox"`, `aria-autocomplete="list"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` (open + real id), `aria-activedescendant` (open + highlight + real id), `aria-disabled`, `data-state` |
| trigger | optional (toggle chevron) | `aria-label` (view), `tabindex="-1"` (view) |
| content | present, hidden when closed | `role="listbox"`, `aria-labelledby` (the input), `data-state` |
| item | many | `role="option"`, `aria-selected`, `data-state` checked/unchecked, `data-highlighted`, `aria-disabled`, `id = \`${content-id}-option-${value}\`` |
| empty | optional | shown by the binding when the filter leaves no visible option |

Option-id contract: each option renders `id="${content-id}-option-${value}"`, and
the `aria-activedescendant` projection keys off it via the empty-id sentinel (only
referenced when open, highlighted, and the content id is real -- a dangling
reference is an axe violation).

## Keyboard

All keys ride the input (focus never leaves it):

- ArrowDown: open a closed list; step the highlight to the next visible option
  (clamped at the end).
- ArrowUp: step to the previous visible option while open (clamped at the start);
  no-op while closed (ported: no open-on-ArrowUp).
- Enter: commit the highlighted option (set value, fill the input with the label,
  close). No-op with no highlight.
- Escape: close an open list, keeping focus on the input.
- Tab: close an open list and let focus move on (no `preventDefault`).
- Printable keys: handled natively by the input, dispatched as `setQuery`, which
  filters and opens.

## Motion

Enter/exit intent: fade + zoom on the listbox, exit shorter than entrance
(dropdown scale). The semantic token `motion-dropdown-in`/`-out` is documented in
`docs/MOTION.md` but NOT yet generated as a utility class (the token layer is
being rebuilt under #1899/#1902); there is no CSS `@utility` for it and zero
component usage. Per the port rules the motion is left UNDECLARED rather than
hardcoding a numeric duration -- the listbox appears/disappears via the `hidden`
toggle. The chevron's open-state rotation and the input's shadow transition carry
`motion-reduce:transition-none` and no explicit duration. Re-declare the enter/exit
motion when the dropdown token ships.

## Oracle dispositions (src/old/ui/combobox.tsx, boundary 9)

The old React controller (`combobox.controller.ts`) is the rejected architecture
and was NOT read; dispositions are taken from `combobox.tsx` and the archetype.

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled value + onValueChange | contract |
| controlled/uncontrolled open + onOpenChange | contract |
| `role="combobox"` + `aria-autocomplete="list"` + `aria-expanded`/`aria-controls` on the input | contract |
| `aria-activedescendant` tracking the active option (focus stays on the input) | contract (now a pure projection off the option-id contract) |
| typing filters options by label/value substring, case-insensitive | contract (`matchesQuery`, pure) |
| ArrowDown/ArrowUp move the highlight; Enter commits; Escape/Tab close | contract (score keymap) |
| toggle chevron button (tabindex -1) opens/closes | contract |
| clicking/hovering an option selects/highlights it | contract |
| empty-state message when no option matches | contract |
| option group + separator surface | contract (thin view wrappers) |
| collision positioning against the input, width-matched | contract (composed collision-detector; select had dropped positioning, combobox keeps it) |
| outside-pointerdown dismissal sparing the input wrapper | contract (`outside-click`, sparing input + toggle) |
| portal of the listbox to `document.body` | dropped — the listbox lives in light DOM present-but-hidden (select precedent), so all three performances share one bind; portaling is a framework affordance not needed for behavior |
| selecting fills the input with the option's label, then closes | reconstructed from the archetype: the exact post-select display lived in the off-limits controller. The standard editable-autocomplete behavior (input shows the committed label, list closes) is the sanctioned reconstruction |
| React unmounts filtered-out options | defect-avoided — the port HIDES filtered options (`hidden`) instead of unmounting, so option ids stay stable for `aria-activedescendant` |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="combobox"`/`role="listbox"`/`role="option"`,
  `aria-expanded`, `aria-controls`, `aria-labelledby`, and `aria-activedescendant`
  wired against real DOM ids, asserted by the harness (axe clean).
- 2.1.1: fully operable from the keyboard on the input alone (arrows, Enter,
  Escape, Tab, typing); no keyboard trap.
- 2.4.3 Focus Order: focus stays on the input; the active option is announced via
  `aria-activedescendant` without a focus move.
- 4.1.3 Status: the empty state is surfaced in the listbox when the filter empties.
- 2.4.7: token focus ring on the input.
