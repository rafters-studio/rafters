# Component Spec -- Textarea

Status: DRAFT. The multi-line member of the text-input archetype. The same
score / projection / bind shape Input proved for a value-primary control,
applied to a `<textarea>`: primary state is a string, the native element owns
editing, and the score reflects value plus validity. The one real divergence
from Input is where the initial value lives (child text, not a `value`
attribute).

Files (`src/components/textarea/`):

```
textarea.classes.ts    textarea.behavior.ts    textarea.tsx
textarea.element.ts     textarea.astro
```

Tests mirror into `test/components/textarea/`. React, WC, and Astro are
conformance-verified against the shared harness.

## The archetype question

Textarea asks nothing new of the archetype: like Input, its primary state is a
string, controlled/uncontrolled by the same boundary. It only changes the
native element and the seeding mechanism.

- `config.value` is the consumer's controlled value (passed fresh, never
  stored); `state.value` is the intrinsic value, seeded from
  `config.defaultValue`. Projections and the change callback read the EFFECTIVE
  value via `effectiveValue(state, config) = config.value ?? state.value`.
- The score does NOT re-implement text editing. Caret, IME composition,
  selection, and line wrapping are the native `<textarea>`'s job (a framework
  affordance, not behavior to port). The score only reflects the value, gates
  writes, and projects validity aria.

## Config, state, actions

```ts
interface TextareaConfig {
  value?: string;        // controlled, shadows
  defaultValue?: string; // uncontrolled seed
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
}
interface TextareaState { value: string } // intrinsic only
type TextareaActions = { setValue: string };
```

`canDispatch` gates `setValue` on `!disabled && !readonly`. A rejected write
never moves intrinsic state, so a controlled consumer's callback never fires
for an edit the field would not have accepted.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| textarea | always | `aria-invalid` (always `true`/`false`), `aria-required` (when required), `aria-describedby` (only when invalid AND the error id is real), `data-state` (`invalid`/`default`) |
| error | consumer renders | referenced by `aria-describedby`; carries no aria of its own (like dialog's title/description -- an id target only) |

The `error` id is sourced deterministically, NOT from a mounted child: React
takes it from the `errorId` prop, the WC/Astro bind reads
`getPart('error')?.id`. Because the id never comes from a rendered child,
React needs no presence tracking -- the thin-React justification carries over
from Input unchanged.

Empty-id convention: an absent error resolves to `''`, and the projection
drops `aria-describedby` rather than dangle it (an axe violation).

## The textarea value quirk (the one divergence from Input)

A `<textarea>` holds its initial value as CHILD TEXT, not a `value` attribute.
Input's Astro renders `<input value={seeded}>`; Textarea's Astro renders
`<textarea>{seeded}</textarea>`. The bind seeds `defaultValue: el.value`, and
because the browser reflects the child text onto the `.value` property, the
seed is read correctly on both paths. React keeps `value={effective}` (React
special-cases the controlled textarea, same as the controlled input).

## Keyboard, effects, and value-sync

- `keymap`: returns `null` for every key. The native `<textarea>` owns editing,
  including Enter (which inserts a newline, not a submit) -- there is no key for
  the score to claim.
- `effects(state, config)`: `[]` in every state. No focus-trap, no roving, no
  dismissal. The React controller needs no `useBehaviorEffects` and no effect
  host, and the DOM bind needs no effect runner -- the same value-sync + aria
  bind shape Input has.
- Value-sync (bind only): on each render the bind writes `el.value = eff` ONLY
  when the two diverge, so the caret is preserved in the common typing case.
  React performs the equivalent via `value={effectiveValue}`.

## Oracle dispositions (`src/old/ui/textarea.*`, boundary 15)

The oracle shipped a React target (`textarea.tsx`) and a form-associated Web
Component (`textarea.element.ts`) far richer than Input's. Each feature is
dispositioned:

| Item | Disposition |
| --- | --- |
| shadcn `Textarea` surface (lone `<textarea>`, prop passthrough, composed `onChange`) | contract -- React is a drop-in |
| controlled/uncontrolled value + `onValueChange` | contract (the value-primary boundary, shared with Input) |
| `disabled` / `readOnly` | contract -- native attributes, mirrored by the `canDispatch` gate for the programmatic path |
| `required` | contract -- advertised via the score's `aria-required` projection; the native attribute is intentionally NOT set, so the score owns the AT signal |
| `invalid` + error wiring | contract -- `aria-invalid` + guarded `aria-describedby` (oracle keyed this off `variant === 'destructive'`; the port keys it off an explicit `invalid`) |
| `placeholder`, `name`, `rows` | contract -- native passthrough props |
| 9-way `variant` class map (`default`/`primary`/`secondary`/`destructive`/`success`/`warning`/`info`/`muted`/`accent`) | dropped -- replaced by a single `bg-transparent` control on `border-input`, validity styled off `aria-invalid:` (the fill-never-background rule; matches Input's oracle delta) |
| 3-way `size` class map (`sm`/`default`/`lg`, `bg-background`) | dropped -- one control on token spacing; size is the consumer's class override, not a variant axis |
| `resize` CSS property (`none`/`vertical`/`horizontal`/`both`) | dropped -- a presentational editor prop; the native `resize` is the consumer's `className` concern, not score behavior |
| `wrap` (`soft`/`hard`/`off`) | dropped -- native attribute the consumer sets directly via passthrough when needed; no sanitization layer ported |
| `cols` / `maxlength` sanitization (positive-int parse, silent drop) | dropped -- native passthrough props; the WC's bespoke sanitizer is not behavior the score owns |
| form-association via `ElementInternals` (`formAssociated`, `syncFormValue`, reset/restore) | framework-affordance -- the native `<textarea>` is form-associated already inside a `<form>`; no `ElementInternals` shim needed, mirroring Input's `form-value` disposition |
| `input-events` primitive (`beforeinput`/IME tracking) | not ported -- the native `input` event is sufficient; the score does not re-implement composition tracking |
| autosize / auto-grow height | dropped -- "optional" per the matrix `does`; shadcn Textarea has none, and adding it would force an effect and break the effect-free symmetry with Input. Deferred as a future decoration, not score behavior |

## Deltas from the oracle

1. Fill is `bg-transparent`, never `bg-background`: the control inherits the
   surface it sits on (the fill-never-background rule).
2. `min-h-20` rather than a per-size min-height map: the multi-line control
   starts with room and the native element grows from there.
3. Validity styling keys off the projected `aria-invalid`
   (`aria-invalid:border-destructive`), so light-DOM markup, the WC, and React
   all pick up the destructive border with no extra class.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `aria-invalid`, `aria-required`, and `aria-describedby` wiring
  asserted against real DOM ids by the harness; `aria-describedby` never
  dangles (empty-id convention).
- 3.3.1/3.3.3 (error identification): the error message is a real element the
  invalid field references; an accessible name (label / `aria-label`) is the
  consumer's obligation and is exercised in the conformance tests.
- 2.4.7: token focus ring (`focus-visible:ring-ring`).
- 1.4.3: destructive border/ring on the validity state uses the destructive
  token pair, not a subtle background.
