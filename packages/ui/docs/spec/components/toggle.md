# Component Spec — Toggle

Status: PORTED (#1801). Archetype: `toggle-family`. A two-state press button:
one press flips `aria-pressed` on/off, and the pressed fill rides
`data-[state=on]` (the `state-swap` motion intent). Imitates button (the press
slice) on the settled behavior-layer pattern.

Files (`src/components/toggle/`):

```
toggle.classes.ts    toggle.behavior.ts (score + bindToggle)
toggle.tsx           toggle.element.ts       toggle.astro
```

Tests mirror into `test/components/toggle/`.

## Three-framework performances

The score composes the `pressable` slice with a one-attribute glue that
overrides `data-state` to `on`/`off`. `toggle.behavior.ts` also exports
`bindToggle(root)` -- the DOM-native client the Web Component and the Astro
`<script>` both perform; only React (retained-mode) reads the projection
declaratively instead. One binding, three performances, zero drift.

- **React** (`toggle.tsx`): thin controller over `createBehavior` + `useMemory`
  -- no `useBehavior`, no effect runner (toggle has no effects). Reads the aria
  projection declaratively and spreads it onto the `<button>`.
- **WC** (`toggle.element.ts`): `<rafters-toggle>` renders its own real
  `<button data-part="root">` (the view from `toggle.classes.ts`) so native
  Enter/Space survive; `connectedCallback` defers the bind one microtask
  (children may not be parsed yet) and hands that root to `bindToggle`.
- **Astro** (`toggle.astro`): server-renders the `<button>` with the initial
  projection already applied (correct before JS), then a `<script>` hands each
  `button[data-part="root"]` to `bindToggle`.

`bindToggle` reads its config ONCE from the projected markup (`aria-pressed`
seeds `defaultPressed`, the native `disabled` attribute seeds `disabled`), wires
click -> press only (the native button converts Enter/Space to a click; no
keydown branch), and cancels a rejected press's default. The projection is
applied through aria-manager with `{ validate: false }` so the resolved string
`'false'` is not re-coerced to truthy.

## Config, state, actions

Toggle always composes `pressable` in toggle mode: every performance forces
`config.toggle = true`, so `pressed` is always a boolean and `aria-pressed`
always projects. The only state axis is `pressed`; the only action is `press`.

```ts
interface ToggleConfig extends PressableConfig {
  variant: ToggleVariant; // 10: default | primary | secondary | destructive |
                          //     success | warning | info | accent | outline | ghost
  size: ToggleSize;        // default | sm | lg
  // from PressableConfig, surfaced by toggle:
  //   toggle (forced true), defaultPressed, disabled
}

interface ToggleState {
  pressed: boolean; // always boolean -- toggle is never a plain press button
}

type ToggleActions = { press: undefined };
```

- `canDispatch(state, 'press')` is false when `disabled`. Framework bindings
  fire `onClick` only on accepted dispatches (Spec 01 rule 4); a rejected press
  cancels the click default so a disabled activation cannot escape.
- `press` flips `pressed`. There is no `setPressed` action: the controlled
  `pressed` sync is the React binding's concern, not the score's.
- Toggle deliberately does NOT surface `pressable`'s `loading`/`softDisabled`
  knobs. A toggle is an instant state swap with no in-flight state, so there is
  no spinner part, no `announce` effect, and no busy projection.

## Parts

```
root   (native button semantics; carries aria-pressed + data-state)
label  (always present; wraps the toggle's children)
startIcon, endIcon  (optional; decorative wrappers, aria-hidden)
```

`pressable` also declares an optional `spinner` part; toggle never renders it.

## ARIA projection

| State            | root attributes                          |
| ---------------- | ---------------------------------------- |
| off              | `aria-pressed="false"`, `data-state="off"` |
| on               | `aria-pressed="true"`, `data-state="on"`   |
| disabled (hard)  | native `disabled` (binding-level); no `aria-disabled` duplication |

`data-state` is the glue's override: `pressable` alone would project
idle/loading/soft-disabled, but a toggle's meaningful state IS its pressed axis,
so the glue projects `on`/`off` from `state.pressed`. A second non-glue
contributor to `data-state` would trip compose's collision guard; the glue is
the sanctioned override seam.

## Icons beside a label

Two optional props place decorative icons around the label, in reading order, the same as Button: `startIcon` and `endIcon`.

| Target | Start icon | End icon |
| --- | --- | --- |
| React | `startIcon: ReactNode` | `endIcon: ReactNode` |
| Astro | `<slot name="start-icon" />` | `<slot name="end-icon" />` |
| Web Component | child with `slot="start-icon"` | child with `slot="end-icon"` |

```html
<button class="inline-grid grid-flow-col items-center gap-2 ..." aria-pressed="false">
  <span data-part="startIcon" data-icon="inline-start" aria-hidden="true">...</span>
  <span data-part="label">Bold</span>
  <span data-part="endIcon" data-icon="inline-end" aria-hidden="true">...</span>
</button>
```

- `startIcon` and `endIcon` are optional parts, present only when an icon is given. The behavior projects `aria-hidden="true"` on each, so the markup is hidden from assistive technology before any script runs; the label is the accessible name.
- The root is a grid (`inline-grid grid-flow-col items-center`), so the start icon is on the right on a `dir="rtl"` page. No physical direction class.
- Inline padding tightens on the icon's side only, with `has-data-[icon=inline-start]:ps-*` and `has-data-[icon=inline-end]:pe-*`.
- Rafters does not size icons. The wrapper (`inline-grid place-items-center`) only places and hides.
- Icon-only toggles keep their required `aria-label`; the icons here are for a toggle with a text label.

## Keyboard

`keymap(event, state, 'root')`: `Enter` and `Space` map to `press`. Native
`<button>` hosts fulfill this natively; the WC inner button is bound by the
framework file. The harness asserts the behavior on every binding either way.

## Effects

None. Toggle emits no `EffectSpec` -- the fill swap is pure CSS driven by
`data-[state=on]`, and there is no live-region announcement to make.

## classes.ts

- Shape per Spec 01: `toggleClasses(config, state) => { root }`.
- Content starts from the oracle's `toggle.classes.ts` maps -- already fully
  semantic-token mapped (`data-[state=on]:bg-{family}`, `hover:bg-muted`,
  `focus-visible:ring-ring`). Keep them.
- `toggleVariants({ variant, size })` is exported with a cva-compatible call
  signature, returning the class string -- a thin view over `toggleClasses` at
  default state (one source of truth, two exports), mirroring `buttonVariants`.
- Corrections over the oracle base: drop `disabled:pointer-events-none` (hiding
  the control from discovery) and the arbitrary-value `active:scale-[0.98]`
  (the `state-swap` motion covers the on/off transition); add
  `aria-disabled:opacity-50 aria-disabled:cursor-not-allowed`; use
  `transition-colors motion-reduce:transition-none` for the fill swap.

## Compatibility contract (shadcn superset)

The React binding is a drop-in for shadcn/ui Toggle AND for the oracle: shadcn exactly, plus the oracle's additions.

- `variant`: shadcn's 2 (`default | outline`) plus the oracle's additions
  (`primary | secondary | destructive | success | warning | info | accent |
  ghost`) -- 10 total.
- `size`: shadcn's 3 (`default | sm | lg`) -- matched exactly.
- `pressed` / `defaultPressed` / `onPressedChange`: the controlled and
  uncontrolled pressed axis, shadcn-compatible.
- All `React.ButtonHTMLAttributes` pass through (`onChange` is omitted from the
  type surface -- toggle reports via `onPressedChange`).

Documented divergence (ratified, constitution "Styling rules"): consumer
`className` merges via classy, which does NOT resolve utility conflicts the way
shadcn's tailwind-merge does.

## Oracle dispositions

The oracle ships a React target (`toggle.tsx`) and a WC target
(`toggle.element.ts`). Feature dispositions:

| Oracle feature | Disposition | Rationale |
| -------------- | ----------- | --------- |
| `variant` (10), `size` (3) | contract | Preserved verbatim; the semantic-token maps carry forward. |
| `pressed` / `defaultPressed` / `onPressedChange` | contract | The controlled/uncontrolled pressed axis, now driven by the `pressable` score. |
| `aria-pressed` + `data-state` on/off | contract | Preserved; the glue projects on/off, the fill rides `data-[state=on]`. |
| Enter/Space activation | contract | Native `<button>`; the keymap asserts it on every binding. |
| `asChild` (React polymorphism) | framework-affordance | A React-only slot affordance; button dropped it on the behavior-layer pattern, and toggle follows -- WC/Astro use slots, not `asChild`. |
| Form association (WC `ElementInternals`, `setFormValue`, form reset/restore/disabled callbacks) | dropped | The WC is not form-associated: no ported `.element.ts` carries `ElementInternals`, and shadcn Toggle is not form-associated. Where form participation is needed it comes from a native control (see the old checkbox for the abandoned form-value axis). |
| `active:scale-[0.98]` | dropped | Arbitrary value against the semantic-classes-only rule; the `state-swap` fill transition covers the press feedback. |

## WCAG 2.1 AA obligations (minimum bar)

- 1.3.1 / 4.1.2 Name-Role-Value: native button role, `aria-pressed` always
  present, stable accessible name (icon-only toggles carry `aria-label`).
- 2.1.1 Keyboard: Enter/Space on every binding.
- 2.4.7 Focus Visible: token ring on every variant (present in the class maps).
- 1.4.3 Contrast: token-registry responsibility; the harness runs axe contrast
  checks per scenario as regression insurance.

## Conformance matrix

Bindings: React (toggle.tsx), WC (toggle.element.ts), Astro (toggle.astro --
server-rendered; interaction tiers apply where a client runtime exists, static
tiers always). The shared suite asserts parts + aria projection + axe per
scenario, and the Enter/Space press flip and the disabled press gate on every
binding.
