# Component Spec -- Input

Status: DRAFT. The text-input archetype. Answers whether the score /
projection / bind shape holds for a control whose primary state is a VALUE,
not an open/pressed flag. It does -- and it produces the simplest bind in the
family.

Files (`src/components/input/`):

```
input.classes.ts    input.behavior.ts    input.tsx
input.element.ts     input.astro
```

Tests mirror into `test/components/input/`. React and WC are
conformance-verified against the shared harness; Astro ships (`input.astro`)
but has no test harness yet (mirrors dialog/navigation-menu).

## The archetype question

Every prior component's primary state was a flag (open, pressed, active
item). Input's primary state is a string. The answer: the same
controlled/uncontrolled boundary applies unchanged, only the type moves from
`boolean`/`string | null` to `string`.

- `config.value` is the consumer's controlled value (passed fresh, never
  stored); `state.value` is the intrinsic value, seeded from
  `config.defaultValue`. Projections and the change callback read the
  EFFECTIVE value via `effectiveValue(state, config) = config.value ??
  state.value` -- the nav-menu `activeItem` pattern, applied to a string.
- The score does NOT re-implement text editing. Caret, IME composition, and
  selection are the native `<input>`'s job (a framework affordance, not
  behavior to port). The score only reflects the value, gates writes, and
  projects validity aria.

## Config, state, actions

```ts
interface InputConfig {
  value?: string;        // controlled, shadows
  defaultValue?: string; // uncontrolled seed
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
}
interface InputState { value: string } // intrinsic only
type InputActions = { setValue: string };
```

`canDispatch` gates `setValue` on `!disabled && !readonly`. A rejected write
never moves intrinsic state, so a controlled consumer's callback never fires
for an edit the field would not have accepted.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| input | always | `aria-invalid` (always `true`/`false`), `aria-required` (when required), `aria-describedby` (only when invalid AND the error id is real), `data-state` (`invalid`/`default`) |
| error | consumer renders | referenced by `aria-describedby`; carries no aria of its own (like dialog's title/description -- an id target only) |

The `error` id is sourced deterministically, NOT from a mounted child: React
takes it from the `errorId` prop, the WC/Astro bind reads
`getPart('error')?.id`. Because the id never comes from a rendered child,
React needs no presence tracking (no `useState`/`setPart`) -- the "track
presence for unguarded cross-ref parts" note (dialog) does not apply here.
That is the thin-React justification.

Empty-id convention (ratified 2026-07-08): an absent error resolves to `''`,
and the projection drops `aria-describedby` rather than dangle it (an axe
violation).

## The three gotchas

1. **Controlled callback compares effective-before vs INTRINSIC-after.**
   `request` reads `effectiveValue(before)` then, after dispatch, the raw
   `state.value` (intrinsic-after). A controlled field's effective value is
   pinned by `config.value`, but the intrinsic reducer still moves, so the
   callback fires with the value the consumer should adopt. Comparing
   effective-vs-effective would make the callback silent under control -- a
   defect the nav-menu port already ruled on.
2. **aria-manager coerces the string `'false'` truthy.** The score projects
   `aria-invalid` as the literal `'false'` when valid (a deliberate divergence
   from shadcn's omit-by-default -- the field REFLECTS validity, per the
   matrix `does`). The DOM bind therefore applies every projected attribute
   with `updateAriaAttribute(el, name, value, { validate: false })`; without
   it, `'false'` would be re-read as truthy and rendered `aria-invalid="true"`.
   `aria-invalid` is the only `'false'` string in the projection, which is
   what makes this gotcha load-bearing here. (React writes the resolved
   strings directly as JSX attributes, so it is unaffected -- the coercion
   only exists on the DOM-native path.)
3. **WC bind deferred one microtask.** `connectedCallback` can fire before the
   light-DOM `<input>` is parsed, so `input.element.ts` binds in
   `queueMicrotask`.

## Keyboard, effects, and value-sync

- `keymap`: returns `null` for every key. The native `<input>` owns editing;
  there is no key for the score to claim.
- `effects(state, config)`: `[]` in every state. No focus-trap, no roving, no
  dismissal. Consequently the React controller needs no `useBehaviorEffects`
  and no effect host, and the DOM bind needs no effect runner -- the simplest
  bind shape in the family: **value-sync + aria projection only.**
- Value-sync (bind only): on each render the bind writes `inputEl.value = eff`
  ONLY when the two diverge, so the caret is preserved in the common typing
  case (after a `setValue` the element already holds the value). A controlled
  field whose consumer pins `config.value` reverts a rejected edit here.
  React performs the equivalent via `value={effectiveValue}`.

## Oracle dispositions (src/old/ui/input.classes.ts, boundary 9)

Only `input.classes.ts` survived into `old/ui` -- there is no oracle
controller to port. The primitives the matrix once planned are dispositioned:

| Item | Disposition |
| --- | --- |
| shadcn `Input` surface (lone `<input>`, prop passthrough, composed `onChange`) | contract -- React is a drop-in |
| controlled/uncontrolled value + `onValueChange` | contract (the value-primary boundary) |
| `disabled` / `readOnly` | contract -- native attributes (they own interaction), mirrored by the `canDispatch` gate for the programmatic path |
| `required` | contract -- advertised via the score's `aria-required` projection; the native `required` attribute is intentionally NOT set, so the score owns the AT signal |
| `invalid` + error wiring | contract -- `aria-invalid` + guarded `aria-describedby` |
| `form-value` primitive | not ported -- the native `<input>` is form-associated already; no primitive needed |
| `input-events` primitive | not ported -- the native `input` event is sufficient; the score does not re-implement `beforeinput`/IME tracking |
| old variant/size class maps (`bg-background`, per-variant border rings) | replaced -- a single `bg-transparent` control on `border-input`, validity styled off `aria-invalid:` |

## Deltas from the oracle

1. Fill is `bg-transparent`, never `bg-background`: the control inherits the
   surface it sits on (the fill-never-background rule).
2. Validity styling keys off the projected `aria-invalid`
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
