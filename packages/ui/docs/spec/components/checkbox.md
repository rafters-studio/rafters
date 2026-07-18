# Component Spec — Checkbox

Status: DRAFT. Wave-3 toggle-family port. Tri-state, form-associated.

Files (`src/components/checkbox/`):

```
checkbox.classes.ts    checkbox.behavior.ts    checkbox.tsx
checkbox.element.ts     checkbox.astro
```

Tests mirror into `test/components/checkbox/` (behavior, classes, and React +
WC + Astro conformance via the shared harness).

## Composition

```
checkbox slice   state {checked}, action toggle, part root
form-value       hidden-input attrs builder (name/value into a <form>)
```

The `pressable` slice is deliberately NOT folded in. It is binary
(`pressed: boolean`) and projects `aria-pressed` plus a `data-state` on root
that would collide, under `compose()`, with the checkbox `data-state`. The
checkbox imitates the press slice's SHAPE — its own slice, composed, sharing one
`bindCheckbox` — rather than reusing the toggle-button reducer.

The root is a native `<button role="checkbox">`, so the browser converts
Enter/Space to a click; `bindCheckbox` wires `click -> toggle` only (the button
archetype). Controlled/uncontrolled per boundary 4: `config.checked` is the
consumer's controlled value, `state.checked` is intrinsic, projections read
`effectiveChecked(state, config)`.

## Config, state, actions

```ts
type CheckedState = boolean | 'indeterminate';
interface CheckboxConfig {
  checked?: CheckedState;        // controlled
  defaultChecked?: CheckedState; // uncontrolled seed
  disabled?: boolean;
  required?: boolean;
  name?: string;                 // form field name
  value?: string;                // submitted when checked (default 'on')
  variant?: CheckboxVariant;
  size?: CheckboxSize;
}
interface CheckboxState { checked: CheckedState } // intrinsic only
type CheckboxActions = { toggle: undefined };
```

`toggle` is tri-state: a checked box unchecks; an unchecked AND an indeterminate
box both become checked (native `<input type=checkbox>` behavior). It therefore
never PRODUCES `mixed` — only a controlled/seeded `'indeterminate'` sets it.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="checkbox"`, `aria-checked` (`true`/`false`/`mixed`), `aria-required` (when required), `data-state` (`checked`/`unchecked`/`indeterminate`), `data-disabled` |

Hard-disabled uses the native `disabled` attribute only — no `aria-disabled`
duplication (the button-archetype rule). The two glyphs (checkmark, dash) are
aria-hidden and swap via `group-data-[state=…]` classes, so the score projects
no icon state. Form association renders a sibling `<input data-part="hidden-input">`
(not a declared part — a DOM hook, like select's) kept present-but-disabled off
the checked axis so an unchecked box submits nothing.

## Keyboard and effects

- `keymap`: Space on `root` -> `toggle`. Enter also toggles, but via the native
  button's click, so no keydown branch claims it (framework affordance).
- `effects(state, config)`: always `[]` — no announce, no roving, no dismiss.
- Motion: `state-swap` (the fill and glyph key off `data-state`; durations and
  easing come from tokens).

## Form association

`form-value` builds the mirrored hidden input's `{ type, name, value }`. The
binding (and the React decorator) keep it in sync: `value = config.value ?? 'on'`
and `disabled = !checked || controlDisabled`. A disabled input is excluded from
submission, so the `<form>`'s `FormData` carries the field only while the box is
checked — replicating the old element's `setFormValue(value|null)` without
ElementInternals. Conformance asserts the real `FormData` contract, not the
input mechanism.

## Oracle dispositions (src/old/ui/checkbox.*, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onCheckedChange | contract |
| variant/size class maps | contract (ported to `checkbox.classes.ts`) |
| Space toggles (React onKeyDown + WC host keydown) | contract (Space claimed by the score keymap) |
| Enter activates (native `<button>` click in both old targets) | framework affordance — the native button click drives toggle; not a score keymap claim |
| `role="checkbox"` + `aria-checked` on the inner button | contract |
| `name`/`value`, submit-when-checked, `required` valueMissing | contract, re-expressed through `form-value` + a mirrored hidden input (was ElementInternals `setFormValue`/`setValidity` in the WC) |
| ElementInternals form-associated WC (validity, reset, restore) | dropped — the behavior-layer WC is a light-DOM enhancer sharing `bindCheckbox`, not a shadow-DOM ElementInternals control; validity/reset/restore are framework machinery, not earned checkbox semantics, and the hidden-input mirror carries submission in every framework |
| indeterminate / `aria-checked="mixed"` | contract — NEW capability; the old tree (react + wc) was binary, this port adds the mixed axis |
| shadow-scoped `:host { inline-flex }` + `setUtilityCSS` | dropped — light-DOM enhancer needs no shadow layout shim; utility classes ride the light-DOM button |

## Deltas from the oracle

1. The box stays intentionally small (`h-3.5`/`h-4`/`h-5`) and skips the
   touch-floor container-query scaling buttons use — a checkbox's touch target
   is its paired label, not the glyph.
2. `press` appears in the issue's compose list but is NOT folded in (see
   Composition); `uses.current` records `classy` + `form-value` only.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `role="checkbox"`, `aria-checked` (including `mixed`), and
  `aria-required` asserted against real DOM by the harness; the accessible name
  comes from a paired label (`aria-label`/`aria-labelledby` in the conformance
  adapters).
- 2.1.1: Space toggles via the native button; the control is a real focusable
  `<button>`, so keyboard operation needs no synthetic tabindex.
- 2.4.7: token focus ring (`focus-visible:ring-2`).
- 1.4.11: the fill uses semantic foreground/background token pairs per variant.
