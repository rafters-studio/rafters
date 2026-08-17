# Component Spec -- Color Picker

Status: DRAFT. Archetype `simple-interactive` (continuous value), imitates
`slider` for the score/decorator shape and the shared interaction composer.

Files (`src/components/color-picker/`):

```
color-picker.classes.ts    color-picker.behavior.ts    color-picker.tsx
color-picker.element.ts    color-picker.astro
```

Tests mirror into `test/components/color-picker/` (behavior, classes, and
React / WC / Astro conformance on the shared harness).

## Composition

The score is pure and single-value (`OklchColor`); the impure surface is
COMPOSED from the `color-picker` composition primitive, which itself
orchestrates six leaf primitives:

```
color-area         2D canvas: lightness x chroma at current hue
hue-bar            1D canvas: full hue spectrum
color-input        numeric input wiring for L/C/H channels
color-swatch       preview swatch background color
interactive (x2)   pointer/keyboard for area (2D) and hue (1D-horizontal)
memory             nanostores atom for reactive color state
```

`composeColorPickerInteractions({ areaCanvas, areaContainer, areaThumb,
hueCanvas, hueContainer, hueThumb, inputs, preview, getConfig, request,
commit })` wraps `createColorPickerState` into one teardown, shared verbatim
by `bindColorPicker` (WC + Astro) and the React controller's effect.

Dual-state: the composition primitive owns its own nanostores atom. The
BehaviorSpec's memory (via `createBehavior`) maintains a parallel
`{ color: OklchColor }` for ARIA projection. Sync: primitive
`onColorChange` -> score `dispatch('setColor')`; controlled value push ->
primitive `pushColor`. No feedback loop because `pushColor` does not fire
`onColorChange`.

Controlled/uncontrolled per the ownership-of-truth boundary: `config.value`
shadows `state.color`; projections and the callback read `effectiveColor`.

## Config, state, actions

```ts
interface ColorPickerConfig {
  value?: OklchColor;          // controlled
  defaultValue?: OklchColor;   // uncontrolled seed
  maxChroma: number;           // area y-axis ceiling (default 0.4)
  disabled: boolean;
  dir?: Direction;             // RTL support
}
interface ColorPickerState { color: OklchColor }
type ColorPickerActions = { setColor: { color: OklchColor } };
```

One action: `setColor` replaces the whole color. Unlike slider's `setThumb`
(which receives pre-clamped values and re-sorts), the color picker's value
is continuous and unclamped -- gamut clamping is a display concern
(`getGamutTier`), not a state constraint.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="group"`, `aria-label="Color picker"`, `aria-disabled` (only when disabled) |
| area | always | `aria-label="Lightness and chroma"` |
| hue | always | `aria-label="Hue"`, `aria-valuemin="0"`, `aria-valuemax="360"`, `aria-valuenow` (current hue, rounded) |
| preview | always | `data-gamut-tier` (`srgb` / `p3` / `out`) |

No `many` parts. The thumbs (`data-role="thumb"`) are decorative
(`aria-hidden="true"`) and not declared as parts -- the `interactive`
primitive handles their pointer role internally. The numeric inputs are
native `<input>` elements with their own accessibility, not score parts.

## Keyboard

The `interactive` primitive handles keyboard internally for both the area
(2D) and hue (1D) surfaces. The score's `keymap` returns `null` for
everything -- keyboard is delegated to the primitive, not the score.

Area (2D interactive):
| Key | Effect |
| --- | --- |
| ArrowRight | + lightness |
| ArrowLeft | - lightness |
| ArrowUp | + chroma |
| ArrowDown | - chroma |

Hue (1D-horizontal interactive):
| Key | Effect |
| --- | --- |
| ArrowRight | + hue |
| ArrowLeft | - hue |

The numeric inputs accept direct value entry with commit on blur/Enter.

## Motion

`picker-reveal`: enter/exit fade on the root. `motion-dropdown-in` (enter,
slower) + `motion-dropdown-out` (exit, faster). Opens slower than it closes
-- the designer's first color decision deserves the breath; dismissal is
already decided.

- Enter: `opacity-0` rest state, `data-[state=open]:opacity-100` open state,
  `starting:opacity-0` (@starting-style so the transition fires on mount).
- Exit: the motion-dropdown-out token carries a shorter duration than the
  enter (exits are faster than entrances, per docs/MOTION.md).
- Inputs carry `motion-focus` for the focus ring transition.
- Canvas repaints are immediate (no transition on the rendering surfaces).

## Old implementation dispositions (src/old/ui/color-picker.tsx)

| Feature | Disposition |
| --- | --- |
| `role="group" aria-label="Color picker"` on root | contract |
| Hue container `aria-valuemin/max/now` + `aria-label="Hue"` | contract |
| Area container `aria-label="Lightness and chroma"` | contract |
| Controlled/uncontrolled value + `onValueChange`/`onValueCommit` | contract |
| 2D area drag (lightness x chroma) + 1D hue bar drag | contract (via `interactive` x2) |
| Gamut tier display (sRGB/P3/Out of gamut) | contract |
| `maxChroma` prop | contract |
| Disabled gate | contract (score `canDispatch` + primitive disabled option) |
| `INPUT_CLASS` inline class string | framework-affordance (moves to classes.ts) |
| `className` prop threading via `classy()` | framework-affordance (classes projection) |
| `React.forwardRef` | framework-affordance (React 19 ref-as-prop) |
| Canvas/thumb inline positioning (`left`/`top` from color) | contract (geometry stays as inline style) |
| `React.useSyncExternalStore` for atom subscription | framework-affordance (replaced by `useMemory` hook) |

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="group"` on root with `aria-label`; hue surface
  carries `aria-valuemin/max/now`; asserted against real DOM by the harness
  across React / WC / Astro.
- 2.1.1 Keyboard: both interaction surfaces operable by arrow keys; numeric
  inputs provide keyboard-precise entry; disabled removes interaction.
- 2.4.7 Focus Visible: token focus ring on inputs
  (`focus-visible:ring-2 ring-primary-ring`).
- 2.5.3 / naming: the control carries `aria-label="Color picker"` on root;
  individual surfaces carry their own labels.
- Gamut tier announced via `data-gamut-tier` on preview, with visible text
  label (`aria-hidden` since the data attribute carries the semantic).
