# Component Spec — Button

Status: DRAFT. First test article for Spec 01. Ruled by Sean 2026-07-01:
use classy; 100% shadcn compatible; all rafters states beyond shadcn;
WCAG 2.1 AA at bare minimum; semantic token classes only.

Files (new grain, `src/components/button/`):

```
button.classes.ts    button.behavior.ts
button.tsx           button.element.ts       button.astro
```

Tests mirror into `test/components/button/`.

## Compatibility contract (shadcn superset)

The React binding is a drop-in for shadcn/ui Button AND for the oracle
(`src/old/ui/button.tsx`). Rule: shadcn exactly, plus everything the oracle
added, plus the new states.

- `variant`: shadcn's 6 (`default | secondary | destructive | outline |
  ghost | link`) plus oracle's additions (`primary | success | warning |
  info | muted | accent`) -- 12 total.
- `size`: shadcn's 4 (`default | sm | lg | icon`) plus oracle's additions
  (`xs | icon-xs | icon-sm | icon-lg`) -- 8 total.
- `asChild`: supported (React affordance; slot.ts mergeProps). WC/Astro
  equivalents are slots, not asChild.
- `buttonVariants({ variant, size })` is exported from the component with a
  cva-compatible call signature, returning the class string. It is a thin
  view over `buttonClasses` (the Spec 01 classes projection) at default
  state -- one source of truth, two exports.
- All `React.ButtonHTMLAttributes` pass through.

Documented divergence (ratified, constitution "Styling rules"): consumer
`className` merges via classy, which does NOT resolve utility conflicts the
way shadcn's tailwind-merge does. Conflicting overrides keep both classes.

## Config, state, actions

```ts
interface ButtonConfig {
  variant: Variant;            // 12
  size: Size;                  // 8
  toggle?: boolean;            // aria-pressed mode
  loadingAnnouncement?: string;    // default: "Loading"
  loadedAnnouncement?: string;     // default: "" (no announcement)
}

interface ButtonState {
  disabled: boolean;       // hard: native disabled attribute
  softDisabled: boolean;   // aria-disabled, still focusable, actions no-op
  loading: boolean;
  pressed?: boolean;       // only meaningful when config.toggle
}

type ButtonActions = {
  press: void;                       // the user activation
  setLoading: boolean;
  setDisabled: boolean;
  setSoftDisabled: boolean;
  setPressed: boolean;               // controlled-sync path
};
```

- `canDispatch(state, 'press')` is false when `disabled || softDisabled ||
  loading`. This is the double-submission guard and the soft-disabled no-op,
  in one pure function. Framework bindings fire `onClick` only on accepted
  dispatches (Spec 01 rule 4).
- `press` with `config.toggle` flips `pressed`; without it, `press` is a
  state-identity action whose acceptance drives the consumer callback.

## Parts

```
root     (role: none -- native button semantics; role="button" only when
          asChild renders a non-button host)
label    (always present; NEVER removed or replaced while loading)
spinner  (optional; present iff state.loading)
```

## ARIA projection

| State                  | root attributes |
| ---------------------- | --------------- |
| base                   | `data-state="idle"` |
| loading                | `aria-busy="true"`, `data-state="loading"`; label part remains the accessible name; spinner part is `aria-hidden` |
| disabled (hard)        | native `disabled` (binding-level); no `aria-disabled` duplication |
| softDisabled           | `aria-disabled="true"`, focusable, `data-state="soft-disabled"` |
| toggle mode            | `aria-pressed={state.pressed}` |

Corrections over the oracle (defects, not features -- do not port):

1. Oracle replaces children with "Loading..." while loading, destroying the
   accessible name mid-interaction. New behavior keeps the label and adds an
   aria-hidden spinner.
2. Oracle sets `disabled` AND `aria-disabled` together (redundant) and uses
   `pointer-events-none`, hiding the control from discovery. Hard-disabled
   uses native `disabled` only; discoverable disabling is the explicit
   `softDisabled` state.
3. Oracle loading also hard-disables (focus loss at the moment of
   activation). New behavior keeps the button focusable while loading;
   `canDispatch` suppresses re-activation.

## Keyboard

`keymap(event, state, 'root')`: `Enter` and `Space` map to `press`. Native
`<button>` hosts fulfill this natively; asChild non-button hosts and the WC
inner button are bound by the framework file. The harness asserts the
behavior on every binding either way.

## Effects

One EffectSpec: `announce` (executor: primitives/sr-announcer.ts).
Emitted on `loading` transitions with `config.loadingAnnouncement` /
`config.loadedAnnouncement`. `aria-busy` alone has weak screen-reader
support; the live-region announcement is the reliable channel.

## Icon-only label guard (compile-time 4.1.2)

In `button.tsx`, icon sizes require an accessible name at the type level:

```ts
type IconSize = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
// size: IconSize => props must include aria-label OR aria-labelledby
```

via a discriminated union on `size`. WC/Astro cannot enforce at compile time:
the WC warns in dev mode and the conformance harness fails the case in CI.

## classes.ts

- Shape per Spec 01: `buttonClasses(config, state) => { root, spinner? }`.
- Content starts from the oracle's `button.classes.ts` maps -- already fully
  semantic-token mapped, including the state tokens Sean cited
  (`hover:bg-{family}-hover`, `active:bg-{family}-active`,
  `focus-visible:ring-{family}-ring`). Keep them.
- Every string literal; selection only; classy concatenates.
- Drop `disabled:pointer-events-none` from base (see ARIA corrections).
  Keep `disabled:opacity-50 disabled:cursor-not-allowed`; add
  `aria-disabled:opacity-50 aria-disabled:cursor-not-allowed` for the
  soft-disabled state.
- Motion: `transition-colors motion-reduce:transition-none`. The raw
  `duration-150` literal is superseded by Spec 04 — durations become
  token-backed when the motion plumbing lands (wave 0-B).

## WCAG 2.1 AA obligations (minimum bar)

- 1.3.1 / 4.1.2 Name-Role-Value: icon guard, toggle aria-pressed, stable
  accessible name under loading.
- 2.1.1 Keyboard: Enter/Space on every binding including asChild non-button.
- 2.4.7 Focus Visible: token ring on every variant (present in class maps).
- 1.4.3 Contrast: token-registry responsibility; harness runs axe contrast
  checks per variant as regression insurance.
- 4.1.3-adjacent (2.1 has no status-message SC at A/AA -- 4.1.3 is 2.1 AA):
  loading announcements via the announce effect satisfy it.

## Behavior-layer composition note

Button is a single slice (`pressable`) plus config. It intentionally does not
exercise `compose` beyond the degenerate one-slice case; composer validation
is the second test article's job. Write `pressable` AS a slice anyway so the
degenerate fold is exercised end to end.

## Conformance matrix

Bindings: React (button.tsx), WC (button.element.ts), Astro (button.astro --
server-rendered; interaction tiers apply only where a client runtime exists,
static tiers apply always). The old WC lacked loading/aria-busy entirely --
the exact drift class this architecture eliminates; the harness makes it
structurally impossible to reintroduce.
