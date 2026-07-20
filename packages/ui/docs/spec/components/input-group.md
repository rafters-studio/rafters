# Component Spec -- InputGroup

Status: DRAFT. The wrapper archetype applied to the text-input family. Answers
whether a component that LOOKS like a control -- one border, one focus ring, one
apparent field -- must therefore OWN a control's state. It must not.

Files (`src/components/input-group/`):

```
input-group.classes.ts   input-group.behavior.ts   input-group.tsx
input-group.element.ts   input-group.astro
```

Tests mirror into `test/components/input-group/`. React, Web Component, and
Astro are all conformance-verified against the shared harness.

## The archetype question

The issue lists `value` and `invalid` as the group's states, and the group is
drawn as a single control. The tempting reading is that InputGroup owns a value
the way `input` does -- a `setValue` reducer over a controlled/uncontrolled
cell.

It does not, and the oracle says so first. `src/old/ui/input-group.tsx` ships an
`InputGroupInput` that is a bare styled `<input>` with no value handling and no
validity wiring; `src/old/ui/input-group.element.ts` propagates `disabled` and
draws a focus-within ring and nothing else. Neither surface ever held a value.

Two further constraints close it:

- `createBehavior` owns THE single memory cell. A group-level value cell placed
  over a control that already has one gives the assembly two cells for one
  string, and they diverge the moment a consumer nests the ported `<Input>`
  (whose own score owns the value) inside a group.
- The value is not the group's to hold. Caret, IME composition, selection, and
  form participation all belong to the native `<input>`, which is exactly the
  boundary `input.md` already drew.

So `value` is satisfied by COMPOSITION -- the contained control holds it -- and
`invalid` is a config the group PROJECTS onto that control. The group is a
wrapper, and `field.behavior.ts` is its template: a static, projection-only
score plus a bind that reaches into a slotted control SSR cannot touch.

## Config, state, actions

```ts
interface InputGroupConfig {
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  invalid?: boolean;
}
type InputGroupState = Record<never, never>;   // no state axis
type InputGroupActions = Record<never, never>; // nothing dispatchable
```

There is no reducer, no `canDispatch` gate, and no keymap. The score is a total
function from config (plus the rendered part ids) to the assembly's projection.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-state` (`invalid`/`default`). No role, no `aria-invalid` |
| control | always | `aria-invalid` (only when invalid), `data-state` (`invalid`/`default`) |
| addonStart | optional | `data-position="start"` |
| addonEnd | optional | `data-position="end"` |

**No role on the root.** `field` sets the precedent. A `role="group"` with no
accessible name adds a nameless node to the AT tree without adding meaning, and
the group has no name to give -- the label belongs to the control. The contained
control carries the semantics; the wrapper carries the chrome.

**`aria-invalid` is omitted when valid**, which is `field`'s convention rather
than `input`'s always-present `'true'`/`'false'`. The group is a wrapper, so an
absent attribute leaves a contained control that projects its OWN validity -- the
ported `Input` -- as the single authority, instead of overwriting it with a
literal `'false'`. As a side effect this sidesteps `aria-manager`'s truthy
coercion of the string `'false'` entirely; the bind still applies with
`{ validate: false }`, but no projected value depends on it.

**`data-state` is reflected on the root as well as the control** because the
root draws the border. The contained control renders no border of its own to
turn destructive, so the destructive treatment has to land on the box.

**`data-position` is projected, not hand-written.** Each affix's side comes out
of the score, so React, the Web Component, and Astro are asserted against one
source rather than three markup conventions.

## The disabled rule

```ts
isControlDisabled(config, ownDisabled) = config.disabled === true || ownDisabled
```

Stated once and read by every performance: `bindInputGroup` for the DOM-native
path, `InputGroupInput` and `input-group.astro` for the retained/SSR paths.

A disabled group disables every disableable descendant, not just the control --
an affix's "Apply" button must not stay live inside a dead group. That is the
oracle's earned rule and it is kept.

The OR is the correction. See the disposition table.

## Host signals vs projection output

`bindInputGroup` recovers its config from the root's attributes, so the two
kinds of attribute are kept separate:

- **Host signals** (author/SSR input, read by the client): `disabled` /
  `data-disabled`, `data-invalid`, `data-size`.
- **Projection output** (the score's own writing): `data-state`,
  `aria-invalid`, `data-position`.

Without the split the client would read back its own output on a second bind and
could not tell config from consequence.

## Keyboard

None claimed. Every keystroke belongs to the contained control, and an affix
holds ordinary focusable content that keeps its native behavior. `keymap`
returns `null` for every key on every part.

Focus is visible wherever it lands inside the box: the ring is a
`focus-within` ring on the root, not a `focus-visible` ring on the control.

## Motion

Intent only: the focus ring transitions its shadow on focus change
(`transition-shadow duration-100`), and honours `motion-reduce:transition-none`.
Durations and easing come from tokens; the score declares no motion.

## Oracle dispositions (`src/old/ui/input-group.*`, react + wc)

| Item | Disposition |
| --- | --- |
| `InputGroup` / `InputGroupAddon` / `InputGroupInput` React surface | contract -- same names, same props (`size`, `disabled`, `position`, `variant`), same composition order; a drop-in |
| `size` vocabulary (`sm`/`default`/`lg`) and unknown-value fallback | contract -- carried into the score, with `parseInputGroupSize` for the attribute path |
| addon `position` (`start`/`end`) and its divider side | contract -- promoted from a class-only concern to two declared parts, so the harness asserts it in all three frameworks |
| addon `variant` (`default`/`filled`) | contract -- decoration only, so it stays in `input-group.classes.ts` and never reaches the score |
| focus-within ring around the whole assembly | contract -- an ordinary class on the light-DOM root instead of a `:host(:focus-within)` rule |
| `disabled` propagation to contained controls | contract, CORRECTED -- see below |
| unconditional `child.disabled = disabled` | defect-do-not-port -- the oracle assigned `false` as readily as `true`, so an ENABLED group silently re-enabled a control the author had disabled individually. `isControlDisabled` makes propagation an OR |
| `<rafters-input-group-addon>` custom element | dropped -- it existed so an affix could own a shadow root. In the light-DOM model an affix is a `<div data-part="addonStart">`; a second element with a lifecycle buys nothing |
| shadow DOM, `::slotted()` normalisation, `:host` display shims, the rebuilt inner `.group` wrapper | dropped -- all were shadow-boundary workarounds. A light-DOM enhancer needs none of them (the same trade `field` made) |
| `bg-background` on the group | replaced -- `bg-transparent`, so the control inherits the surface it sits on (fill-never-background) |
| `text-sm` on the small size | replaced -- `text-body-small`, the typography role token |
| `form-value` primitive (issue: "add") | not ported -- it builds a hidden mirror input for controls that are NOT native form fields. The contained `<input>` is form-associated already, so a mirror would submit the field twice |
| `input-events` primitive (issue: "add") | not ported -- it is the contenteditable/IME handler for the editor subsystem. The group runs no editing path at all; the native control owns `beforeinput` and composition (the same disposition `input.md` reached) |
| `required`, error message, `aria-describedby` | not ported -- `field` owns them and composes AROUND a group. Duplicating them here would put two authorities on one control's `aria-describedby` |

## Deltas from the oracle

1. **Light DOM, not shadow DOM.** The Web Component enhances author markup
   rather than rendering a wrapper into a shadow root. This is what lets the
   affixes be plain elements and the ring be a plain class.
2. **Fill is `bg-transparent`.** The group inherits the surface it sits on.
3. **The propagation OR** (above) -- the one behavioral correction.
4. **Bind-once.** Like input/field/radio-group, the client wires server/author
   markup a single time. Re-toggling `disabled` or `data-invalid` at runtime is
   React's declarative affordance, not a lifecycle this client re-observes.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `aria-invalid` is projected onto the CONTROL, where assistive
  tech expects validity, never onto the decorative wrapper. Asserted against
  real DOM in all three conformance suites.
- 2.4.7 (focus visible): the ring is `focus-within` on the root, so focus is
  visible wherever it lands inside the box -- including on an affix button,
  which a control-only ring would leave unringed.
- 2.1.1 (keyboard): the group claims no key, so the control and any affix
  button keep their full native keyboard behavior. A disabled group removes its
  descendants from the tab order natively, leaving no reachable dead tab stop.
- 1.4.3 (contrast): validity uses the destructive token pair on the border and
  ring, not a subtle background.
- 4.1.2 (name): the affixes are decoration, NOT an accessible name. An icon
  affix must be `aria-hidden`, and the control still needs a real label (Field,
  `<Label>`, or `aria-label`) -- exercised in the conformance tests.
