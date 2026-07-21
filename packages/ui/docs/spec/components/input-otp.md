# Component Spec — InputOTP

Status: DRAFT. Archetype `text-input-family`, imitates `input` for the
value-primary score shape and `slider` for the many-part instance projection.

Files (`src/components/input-otp/`):

```
input-otp.classes.ts    input-otp.behavior.ts    input-otp.tsx
input-otp.element.ts    input-otp.astro
```

Tests mirror into `test/components/input-otp/` (behavior, classes, and React /
WC / Astro conformance on the shared harness).

## Composition

One real `<input>` holds the code; the slots are a painted MIRROR of its value.
This is the oracle's shape and it is load-bearing: an array of per-slot inputs
would break paste, break `autocomplete="one-time-code"` autofill, and turn one
field into N tab stops. The native input keeps caret, IME and selection — the
score does not re-implement text editing (Spec 05, text-input archetype).

The impure surface is COMPOSED from two primitives directly (no effects layer):

```
keyboard-handler   ArrowLeft / ArrowRight on the field -> move the lit slot
input-events       IME composition tracking (the composition guard only)
```

`composeInputOtpInteractions({ root, input, getConfig, getState, requestValue,
requestActive })` folds them plus the paste interception and the focus-on-click
into one teardown, shared verbatim by `bindInputOtp` (WC + Astro) and the React
controller's effect.

The value math — the per-character pattern filter, truncation to `maxLength`,
and active-slot resolution — is COMPONENT-INTERNAL pure state: the exported
`filterAndTruncate` / `activeSlot` / `isSlotActive` / `slotState` /
`activeForKey` helpers, never a reducer (a reducer receives no config, and the
math needs `maxLength`/`pattern`).

Controlled/uncontrolled per the ownership-of-truth boundary: `config.value`
shadows `state.value`; projections and the callbacks read `effectiveOtpValue`.

### Why `input-events` is composed for its guard only

`createInputHandler` classifies `beforeinput`/`input` by `inputType` against an
editor-oriented whitelist and drops anything outside it. The value path must
never depend on that classification, so it stays on the plain `input` event and
the primitive is composed for the one thing it uniquely owns: knowing whether an
IME composition is in flight. Filtering a half-composed string would delete the
characters the IME is still assembling.

### Why `form-value` is NOT composed

`form-value` mirrors a control's value into a hidden `<input>` for controls
built out of divs (slider's thumbs), which a `<form>` submit would otherwise
skip. InputOTP already HAS a real native input, so `name` on it submits
`name=value` natively; rendering the mirror as well would submit the field
twice. The conformance suites assert no hidden input exists.

## Config, state, actions

```ts
interface InputOtpConfig {
  maxLength: number;        // slot count AND the hard cap on the value
  pattern?: string;         // per-CHARACTER accept test, as a regex source
  value?: string;           // controlled
  defaultValue?: string;    // uncontrolled seed
  disabled?: boolean;
  required?: boolean;
  label?: string;           // accessible name override
}
interface InputOtpState { value: string; activeIndex: number }
type InputOtpActions = { setValue: string; setActive: number };
```

`setValue` receives an ALREADY filtered and truncated value (the pure helpers
own the math) and re-seats `activeIndex` at the value's end — that re-seating IS
auto-advance. `activeIndex` is stored UNCLAMPED and clamped on read by
`activeSlot`, so shrinking `maxLength` cannot strand the caret past the last
rendered slot. `canDispatch` gates BOTH actions on `!disabled`, so a disabled
field refuses edits and caret movement alike.

`pattern` is a regex SOURCE string rather than a `RegExp` so one config crosses
a DOM attribute and an Astro prop unchanged; a malformed source falls back to
digits-only rather than throwing at paint time. The React surface still accepts
a `RegExp` (the oracle's type) and reads its `.source`.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-disabled` / `data-complete` (only when true); no role (not the widget); the click surface that focuses the field |
| input | always | `aria-label` (`Enter N character code` unless overridden), `aria-required` / `aria-disabled` (only when true); `inputmode=numeric`, `autocomplete=one-time-code` |
| group | optional | layout only; groups slots for the 3-3 / 2-2-2 shapes |
| slot | one per character | `data-index`, `data-active` / `data-filled` (only when true). NO ARIA — see below |
| separator | optional | `aria-hidden="true"` (decorative) |

The slot is a `many` part, so its projection lives in `otpSlotAttrs(index,
state, config)`, first-classed onto `inputOtpBehavior.instanceAria` so the
harness's generic `assertInstanceAriaFulfillment` drives it (each instance keyed
by `data-value`).

Slots carry no ARIA deliberately: the accessible name, the value and the focus
all live on the single input, so exposing the slots would announce the code
twice. They are also not tab stops — the field is one tab stop, not N.

Every slot state is projected as a `data-` attribute and styled from it
(`data-[active=true]:ring-1`, `data-[filled=true]:text-foreground`, and
`group-data-[disabled=true]:*` reading the root). No framework recomposes a
class string, so the three performances cannot drift in presentation.

## Keyboard

`keymap` is the pure claim record (Spec 01): the two arrow keys on the `input`
part claim `setActive`. The bind computes the target index via `activeForKey`.

| Key | Effect |
| --- | --- |
| ArrowLeft | lit slot back one, stops at the first |
| ArrowRight | lit slot to the first EMPTY slot, never past the last |
| Backspace | NOT claimed — the native field deletes, and the resulting `input` event carries the change back through `setValue` |
| character keys | NOT claimed — the native field types, then the filter accepts or reverts |

Arrows `preventDefault` so the native caret does not move inside the flat string
and desync from the lit slot. Focus never leaves the input.

## Events (WC / Astro)

| Event | When |
| --- | --- |
| `input` | every accepted value change (bubbles, composed) |
| `change` | the completion EDGE only |
| `rafters-otp-complete` | the completion EDGE, `detail.value` = the code |

The completion edge is latched: re-typing inside an already-full code does not
re-fire. React reports the same edge through `onComplete`.

## Motion

`caret-blink`: the fake caret in the active empty slot. Intent only —
`animate-pulse motion-reduce:animate-none`; durations and easing come from
tokens. Reduced motion STILLS the caret rather than hiding it, so it still marks
the slot. Slot state transitions honour `motion-reduce:transition-none`.

## Oracle dispositions (src/old/ui/input-otp.{tsx,element.ts,classes.ts})

| Oracle feature | Disposition |
| --- | --- |
| compound React API: `InputOTP` + `.Group` / `.Slot index` / `.Separator` | contract (preserved verbatim for shadcn drop-in parity) |
| controlled/uncontrolled `value`/`defaultValue` + `onChange(value)` | contract |
| `maxLength`, `pattern`, `disabled`, `autoFocus`, `onComplete` | contract |
| per-character filter + truncation on typing AND paste | contract (one gate, `filterAndTruncate`) |
| paste intercepted with `preventDefault`, split across slots | contract |
| auto-advance: active slot follows the value length | contract (the `setValue` reducer re-seats it) |
| ArrowLeft/ArrowRight move the active slot; Backspace left to the native field | contract |
| click anywhere in the container focuses the hidden input | contract |
| fake caret in the active empty slot | contract |
| `sr-only` input carrying `aria-label`, `inputmode=numeric`, `autocomplete=one-time-code` | contract |
| the complete-code OR: last slot stays lit while the code is full, so a full field can show TWO active slots | contract — preserved verbatim (`isSlotActive`). Deliberately NOT re-derived into a single-active rule |
| `rafters-otp-complete` CustomEvent + `change` at max length | contract (now latched to the EDGE; the oracle re-fired on every input while full) |
| WC `ElementInternals` form association, `setValidity({tooShort})`, `formResetCallback`, `formStateRestoreCallback`, `checkValidity` etc. | framework-affordance — a WC-only surface the React oracle never had. The behavior-layer control is a real native `<input>`, so `name`, submission, reset and constraint validation come from the platform |
| WC `<rafters-input-otp>` auto-rendering `maxLength` slots into shadow DOM | framework-affordance — the behavior-layer WC is a light-DOM enhancer (Spec 05); Astro server-renders the slots, and `groups={[3,3]}` is the SSR equivalent of the React compound children |
| WC `composeInputOtpSlotClasses` / `composeInputOtpContainerClasses` recomposing class strings per state | dropped — state now rides projected `data-` attributes the CSS reads, so no framework recomposes classes and the three cannot drift |
| WC text-node surgery inside the slot (remove every child but the caret, insert a text node) | dropped — the slot has a dedicated `[data-otp-char]` element, so painting a character is one `textContent` write |
| React default pattern `/^[0-9]*$/` vs WC default `^[0-9]$` | dropped — the two oracles disagreed; the per-character WC form is canonical (`^[0-9]$`). Both accept exactly the digits, so no behavior changes |
| React `aria-label` "Enter N digit code" vs WC "Enter N character code" | dropped — the two oracles disagreed; "character" is canonical because `pattern` is configurable and the code need not be digits |
| slots exposed to AT (no `aria-hidden`, no roles) | contract — preserved as-is. Marking the mirror `aria-hidden` was considered and rejected: the oracle and shadcn both leave it, and the container holds the focusable input, so hiding it would itself be an axe violation |
| `onComplete` re-firing on every input event while the code is full | defect-do-not-port — the completion edge is now latched in both the bind and React |
| container `opacity-50` applied via a JS-composed class on the disabled edge | dropped — `group-data-[disabled=true]:opacity-50` on the slots reads the root's projection with no JS |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: one real `<input>` carries the name, role and value; the
  segmented slots are presentational and asserted against the score's projection
  by the harness across React / WC / Astro.
- 2.1.1 Keyboard: the whole code is enterable, editable and pasteable from the
  keyboard; the field is ONE tab stop, and arrows move the lit slot without
  moving focus. Disabled gates every entry path.
- 2.4.3 Focus Order: the slots add no tab stops, so a segmented field costs the
  same traversal as a plain text input.
- 2.4.7 Focus Visible: the active slot carries the token focus ring
  (`data-[active=true]:ring-1 ring-ring`), because the real input is `sr-only`
  and cannot show one.
- 3.3.2 Labels: the field is self-naming (`Enter N character code`) so a
  consumer who supplies no label still ships an announced control;
  `aria-label` overrides it.
- 1.3.5 Identify Input Purpose: `autocomplete="one-time-code"` lets the platform
  autofill an SMS code, which is the single largest accessibility win available
  to this control.
- 1.4.13 / motion: the caret blink honours `motion-reduce:animate-none` and slot
  transitions honour `motion-reduce:transition-none`.
