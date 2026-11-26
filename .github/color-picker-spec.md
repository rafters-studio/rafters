# Color Picker Primitives -- Interface Specification

Four headless, vanilla-TS primitives that compose into a full OKLCH color picker.
Each primitive follows the Rafters pattern established by `color-swatch`, `hover-delay`,
`outside-click`, and `drag-drop`.

A small `oklch-gamut.ts` helper provides inline gamut math (~30 lines) so that
`color-area` and `hue-bar` can classify pixels without any external dependency.

---

## Conventions

All primitives follow the same contract:

```typescript
createX(element, options) => CleanupFunction   // attach behavior, return teardown
updateX(element, options) => void              // hot-update without teardown
```

- SSR-safe: every `createX` starts with `if (typeof window === 'undefined') return () => {};`
- Zero framework deps, zero npm deps
- Copyable via `rafters add` -- only imports from `./types` and sibling primitives within `packages/ui/src/primitives/`
- `CleanupFunction` restores all DOM mutations (attributes, listeners, styles)
- No Zod -- plain TS types in `types.ts`
- No workspace package imports (`@rafters/color-utils`, `@rafters/shared`, etc.)

---

## 1. Shared Types (additions to `types.ts`)

```typescript
// -- already exists --
export type CleanupFunction = () => void;
export type GamutTier = "gold" | "silver" | "fail";

// -- new additions --

/** Normalized 2D coordinate within a surface, both axes 0-1 */
export interface NormalizedPoint {
  /** Horizontal position, 0 = left edge, 1 = right edge */
  left: number;
  /** Vertical position, 0 = top edge, 1 = bottom edge */
  top: number;
}

/** Keyboard movement delta (additive offset) */
export interface MoveDelta {
  /** Horizontal delta (-1 to 1 range, typically 0.01 or 0.05) */
  dLeft: number;
  /** Vertical delta (-1 to 1 range, typically 0.01 or 0.05) */
  dTop: number;
}

/** Dimension mode for the interactive primitive */
export type InteractiveMode = "1d-horizontal" | "1d-vertical" | "2d";

/** OKLCH color triplet without alpha */
export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

/** OKLCH color triplet with optional alpha */
export interface OklchColorAlpha extends OklchColor {
  alpha?: number;
}
```

Note: `GamutBoundaryPoint` is **not** added. Gamut classification is done inline per-pixel
via `oklch-gamut.ts` functions (`inSrgb` / `inP3`), not from pre-computed boundary arrays.

---

## 2. `oklch-gamut.ts` -- Inline Gamut Math Helper

### Responsibility

Provides two pure functions -- `inSrgb(l, c, h)` and `inP3(l, c, h)` -- that return
whether an OKLCH color is representable in each gamut. ~30 lines total, no dependencies.

### What it does NOT do

- Does not convert colors to CSS strings (color-swatch handles that)
- Does not provide gamut mapping / clamping
- Does not pre-compute boundaries or cache results

### Interface

```typescript
/**
 * Check whether an OKLCH color is within the sRGB gamut.
 * Uses direct matrix math: oklch -> oklab -> linear-sRGB.
 */
export function inSrgb(l: number, c: number, h: number): boolean;

/**
 * Check whether an OKLCH color is within the Display P3 gamut.
 * Uses direct matrix math: oklch -> oklab -> linear-P3.
 */
export function inP3(l: number, c: number, h: number): boolean;
```

### Math pipeline

Each function performs two transforms:

**Step 1: OKLCH to Oklab**

```
a = c * cos(h * PI / 180)
b = c * sin(h * PI / 180)
```

**Step 2: Oklab to linear RGB (via LMS intermediary)**

Oklab to LMS (cube roots):

```
l_ = L + 0.3963377774 * a + 0.2158037573 * b
m_ = L - 0.1055613458 * a - 0.0638541728 * b
s_ = L - 0.0894841775 * a - 1.2914855480 * b

l3 = l_ * l_ * l_
m3 = m_ * m_ * m_
s3 = s_ * s_ * s_
```

LMS to linear-sRGB (3x3 matrix):

```
r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
```

LMS to linear-P3 (different 3x3 matrix):

```
r = +3.1277147370 * l3 - 2.2571303530 * m3 + 0.1294156160 * s3
g = -1.0910898340 * l3 + 2.4133174100 * m3 - 0.3222275760 * s3
b = -0.0260731810 * l3 - 0.7034860280 * m3 + 1.7295592090 * s3
```

**In-gamut check**: `r, g, b` all in `[0, 1]` (with a small epsilon tolerance, e.g. `-0.001`
to `1.001`, to account for floating point).

### Import rules

- Imported by `color-area.ts` and `hue-bar.ts`
- No external imports

---

## 3. `interactive` -- Pointer Tracking Surface

### Responsibility

Captures mouse, touch, and keyboard input on a container element and emits
normalized `{left, top}` coordinates (both 0-1). Color-agnostic -- knows nothing
about hue, chroma, or lightness.

Composes `createNavigationHandler` from `./keyboard-handler` for keyboard support.
Uses inline pointer capture pattern (from `drag-drop.ts` pattern) for mouse/touch.

### What it does NOT do

- Does not render anything (no canvas, no gradient)
- Does not know what color space the surface represents
- Does not position any thumb/pointer element
- Does not compute gamut boundaries

### Interface

```typescript
export interface InteractiveOptions {
  /** 1D (slider) or 2D (area) mode */
  mode: InteractiveMode;

  /**
   * Called continuously during pointer drag / keyboard movement.
   * Receives absolute normalized position (clamped 0-1).
   */
  onMove: (point: NormalizedPoint) => void;

  /**
   * Called on keyboard arrow/page/home/end key press.
   * Receives additive delta so caller can apply it to current value.
   * Only fires for keyboard input; pointer input fires onMove directly.
   */
  onKeyMove?: (delta: MoveDelta) => void;

  /** Whether interaction is disabled */
  disabled?: boolean;

  /**
   * Text direction for RTL support.
   * When 'rtl', ArrowLeft increases and ArrowRight decreases the horizontal axis.
   * @default 'ltr'
   */
  dir?: "ltr" | "rtl";
}

/**
 * Attach pointer tracking to a container element.
 *
 * Mousedown on element -> document-level mousemove -> mouseup.
 * Touch: touchstart -> touchmove -> touchend (with touch/mouse conflict prevention).
 * Keyboard: composed via createNavigationHandler from ./keyboard-handler.
 *
 * The element MUST have position: relative (or absolute/fixed) and
 * defined dimensions for coordinate normalization to work.
 *
 * Sets: tabindex="0", role="slider" (1D) or role="application" (2D),
 *       aria-disabled if disabled.
 */
export function createInteractive(
  element: HTMLElement,
  options: InteractiveOptions,
): CleanupFunction;

/**
 * Hot-update options without teardown. Useful for toggling disabled state.
 */
export function updateInteractive(element: HTMLElement, options: InteractiveOptions): void;
```

### Keyboard mapping

Uses `createNavigationHandler` from `./keyboard-handler` with appropriate orientation.
Additional bindings via `createKeyboardHandler` for Shift multiplier, PageUp/Down, Home/End.

| Key         | 1D-horizontal    | 1D-vertical     | 2D               |
| ----------- | ---------------- | --------------- | ---------------- |
| ArrowRight  | dLeft: +0.01     | (ignored)       | dLeft: +0.01     |
| ArrowLeft   | dLeft: -0.01     | (ignored)       | dLeft: -0.01     |
| ArrowDown   | (ignored)        | dTop: +0.01     | dTop: +0.01      |
| ArrowUp     | (ignored)        | dTop: -0.01     | dTop: -0.01      |
| Shift+Arrow | 5x multiplier    | 5x multiplier   | 5x multiplier    |
| PageDown    | dLeft: +0.05     | dTop: +0.05     | dTop: +0.05      |
| PageUp      | dLeft: -0.05     | dTop: -0.05     | dTop: -0.05      |
| Home        | dLeft: jump to 0 | dTop: jump to 0 | dLeft: jump to 0 |
| End         | dLeft: jump to 1 | dTop: jump to 1 | dLeft: jump to 1 |

In RTL mode, ArrowLeft/Right semantics are swapped (ArrowLeft = +dLeft, ArrowRight = -dLeft).

### Pointer tracking implementation notes

Follows the inline pointer capture pattern from `drag-drop.ts`:

- mousedown on element -> `document.addEventListener('mousemove', ...)` and
  `document.addEventListener('mouseup', ...)` (one-time, removed on mouseup)
- Touch: `touchstart` sets a flag to prevent mouse events from the same gesture
  (`event.preventDefault()` on touchstart prevents synthesized mouse events)
- Coordinate normalization: `left = (clientX - rect.left) / rect.width`, clamped to [0, 1]
- `onMove` fires for pointer input (absolute position after clamp)
- `onKeyMove` fires for keyboard input (delta offset; caller is responsible for
  clamping the resulting position and calling `onMove` or updating state)

---

## 4. `color-area` -- 2D Canvas

### Responsibility

Renders a 2D canvas showing Lightness (x-axis, left=0, right=1) vs Chroma
(y-axis, bottom=0, top=~0.4) at a fixed hue. Each pixel is painted with its actual
oklch color if in gamut, fading to black for out-of-gamut regions.

Uses `inSrgb()` / `inP3()` from `./oklch-gamut` for per-pixel gamut classification.

### What it does NOT do

- Does not handle pointer or keyboard input (interactive does that)
- Does not position any thumb/handle
- Does not emit color selection events
- Does not render three-tier zone fills or boundary lines
- Does not receive pre-computed `GamutBoundaryPoint[]` data

### Interface

```typescript
export interface ColorAreaOptions {
  /** Fixed hue angle (0-360) for this area slice */
  hue: number;

  /**
   * Maximum chroma value for the y-axis scale.
   * @default 0.4
   */
  maxChroma?: number;

  /** Device pixel ratio override (default: window.devicePixelRatio) */
  dpr?: number;
}

/**
 * Attach color area rendering to a canvas element.
 * The canvas is sized to its CSS layout dimensions times DPR.
 *
 * Sets: role="img", aria-label="Color area for hue {h} degrees".
 */
export function createColorArea(
  canvas: HTMLCanvasElement,
  options: ColorAreaOptions,
): CleanupFunction;

/**
 * Re-render the canvas with new options (e.g. when hue changes).
 * Avoids teardown/rebuild -- just repaints.
 */
export function updateColorArea(canvas: HTMLCanvasElement, options: ColorAreaOptions): void;
```

### Rendering algorithm

For each column x (0 to width):

1. Map x to lightness: `l = x / width`
2. For each row y (0 to height):
   - Map y to chroma: `c = (1 - y / height) * maxChroma` (top = high chroma)
   - If `inSrgb(l, c, hue)` or `inP3(l, c, hue)`: paint pixel with
     `ctx.fillStyle = 'oklch(l c hue)'` (modern browsers handle the conversion)
   - Else: paint black (`#000`)

The canvas uses `ctx.fillStyle` with native `oklch()` CSS strings for accurate color
reproduction on wide-gamut displays. Out-of-gamut regions fade to black, providing
natural visual feedback without needing explicit zone rendering.

Note: gamut feedback icons (sRGB checkmark, P3 indicator, etc.) are a consumer concern.
The primitive just paints colors and black.

---

## 5. `hue-bar` -- 1D Hue Spectrum Strip

### Responsibility

Renders a 1D gradient strip showing the 0-360 hue spectrum at a given
lightness and chroma. Provides visual context for hue selection.

Uses `inSrgb()` / `inP3()` from `./oklch-gamut` to handle out-of-gamut hue stops.

### What it does NOT do

- Does not handle pointer or keyboard input (interactive does that)
- Does not position any thumb/handle

### Interface

```typescript
export interface HueBarOptions {
  /** Lightness at which to render the hue spectrum (0-1) */
  lightness: number;

  /** Chroma at which to render the hue spectrum (0-~0.4) */
  chroma: number;

  /**
   * Orientation of the strip.
   * @default 'horizontal'
   */
  orientation?: "horizontal" | "vertical";

  /** Device pixel ratio override (default: window.devicePixelRatio) */
  dpr?: number;
}

/**
 * Attach hue bar rendering to a canvas element.
 * Draws a spectrum from hue 0 to 360 at the given lightness and chroma.
 *
 * Sets: role="img", aria-label="Hue spectrum".
 */
export function createHueBar(canvas: HTMLCanvasElement, options: HueBarOptions): CleanupFunction;

/**
 * Re-render with new lightness/chroma (e.g. when area selection changes).
 */
export function updateHueBar(canvas: HTMLCanvasElement, options: HueBarOptions): void;
```

### Rendering algorithm

For each pixel along the primary axis (0 to length):

1. Map pixel to hue: `h = (pixel / length) * 360`
2. If `inSrgb(lightness, chroma, h)` or `inP3(lightness, chroma, h)`:
   paint with `ctx.fillStyle = 'oklch(lightness chroma h)'`
3. Else: paint black

The canvas uses native `oklch()` CSS strings via `ctx.fillStyle`. Out-of-gamut hues
are painted black, matching the color-area behavior.

---

## 6. Pointer / Thumb Element -- Use `color-swatch` + Caller CSS

The existing `color-swatch.ts` primitive (`createSwatch` / `updateSwatch`) already
covers the pointer/thumb use case:

- Sets `backgroundColor` via `toOklch()` CSS string
- Stores `data-gamut-tier` as a data attribute
- Sets `role="img"` and `aria-label`
- Has `selected` state via `data-selected`

**The caller positions the element.** A thumb is just a swatch with caller-applied CSS:

```css
.color-picker-thumb {
  position: absolute;
  left: var(--thumb-left);
  top: var(--thumb-top);
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  pointer-events: none;
  /* additional styling via data-gamut-tier, data-active, data-focused */
}
```

The caller updates position by setting CSS custom properties or inline styles, and
calls `updateSwatch(thumbEl, { l, c, h, tier })` to update the color and tier.

A separate `color-pointer.ts` primitive is **not needed**. This avoids code duplication
and keeps the primitive set minimal.

---

## 7. `color-input` -- Filtered Numeric Input Fields

### Responsibility

Manages three (optionally four) numeric input fields for direct OKLCH value
entry. Validates, clamps, and formats values. Fires onChange with the new
color triplet.

### What it does NOT do

- Does not render input elements (caller provides them)
- Does not compute anything about gamut or color
- Does not handle color space conversion
- Does not manage focus between fields (roving-focus primitive can do that)

### Interface

```typescript
export interface ColorInputField {
  /** The input element for this channel */
  element: HTMLInputElement;

  /** Which OKLCH channel this field controls */
  channel: "l" | "c" | "h" | "alpha";
}

export interface ColorInputOptions {
  /** Input fields to manage (3 required, alpha optional) */
  fields: ColorInputField[];

  /** Current color value (used to populate fields on create) */
  value: OklchColorAlpha;

  /**
   * Called when any field value changes (after validation and clamping).
   * Receives the complete new color with the changed channel updated.
   */
  onChange: (color: OklchColorAlpha) => void;

  /**
   * Called when a field is committed (blur or Enter).
   * Useful for triggering gamut checks or boundary recomputation.
   */
  onCommit?: (color: OklchColorAlpha) => void;

  /**
   * Number of decimal places to display per channel.
   * @default { l: 2, c: 3, h: 0, alpha: 2 }
   */
  precision?: Partial<Record<"l" | "c" | "h" | "alpha", number>>;
}

/**
 * Attach input validation and formatting to a set of input elements.
 *
 * Per-channel constraints:
 * - L: min 0, max 1, step 0.01
 * - C: min 0, max 0.4, step 0.001
 * - H: min 0, max 360, step 1
 * - alpha: min 0, max 1, step 0.01
 *
 * Sets per field: inputmode="decimal", min, max, step, aria-label.
 */
export function createColorInput(
  fields: ColorInputField[],
  options: ColorInputOptions,
): CleanupFunction;

/**
 * Update displayed values (e.g. when color changes from pointer interaction).
 * Does NOT fire onChange (prevents feedback loops).
 */
export function updateColorInput(fields: ColorInputField[], options: ColorInputOptions): void;
```

### Channel constraints

| Channel | Min | Max | Step  | Precision | aria-label  |
| ------- | --- | --- | ----- | --------- | ----------- |
| L       | 0   | 1   | 0.01  | 2         | "Lightness" |
| C       | 0   | 0.4 | 0.001 | 3         | "Chroma"    |
| H       | 0   | 360 | 1     | 0         | "Hue"       |
| alpha   | 0   | 1   | 0.01  | 2         | "Alpha"     |

### Input handling

- On `input` event: parse, clamp to [min, max], fire `onChange` with new color
- On `blur` / `Enter` key: format to specified precision, fire `onCommit`
- On `ArrowUp` / `ArrowDown`: increment/decrement by step (Shift = 10x step)
- Rejects non-numeric input (allows digits, single decimal point, minus for negative)

---

## 8. Data Flow Diagram

```
                    Caller (any framework or vanilla)
                    ==================================
                            |
            +---------------+----------------+
            |               |                |
            |               |           getGamutTier()
            |               |           (caller classifies
            |               |            if it wants icons)
            |               |                |
            v               v                v
    +---------------+  +-----------+  +---------------+
    |  color-area   |  |  hue-bar  |  | color-swatch  |
    | (canvas paint)|  | (canvas)  |  | (thumb elem)  |
    +-------+-------+  +-----+-----+  +-------+-------+
            |               |                  |
    uses oklch-gamut.ts     |          caller positions
    for per-pixel classify  |          via CSS
            |               |                  |
            |  +------------+-----------+      |
            |  |                        |      |
            v  v                        v      v
    +------------------+       +------------------+
    |   interactive    |       |   interactive    |
    | (2D, area input) |       | (1D, hue slider) |
    +--------+---------+       +--------+---------+
             |                          |
             | composes                 | composes
             | createNavigationHandler  | createNavigationHandler
             | from keyboard-handler    | from keyboard-handler
             |                          |
             |  NormalizedPoint         |  NormalizedPoint
             v                          v
    +------------------------------------------+
    |         Caller / State Manager           |
    | Maps normalized coords to L/C/H values   |
    | Updates swatch (thumb), color-input       |
    +------------------+-----------------------+
                       |
                       v
              +----------------+
              |  color-input   |
              | (L, C, H, A)  |
              +----------------+
                       |
                       | onChange -> updates state
                       v
              back to Caller / State Manager
```

### Composition example

```typescript
import { createInteractive, updateInteractive } from "./interactive";
import { createColorArea, updateColorArea } from "./color-area";
import { createHueBar, updateHueBar } from "./hue-bar";
import { createColorInput, updateColorInput } from "./color-input";
import { createSwatch, updateSwatch, toOklch } from "./color-swatch";

// State
let l = 0.7,
  c = 0.15,
  hue = 250;
const maxChroma = 0.4;

// 1. Paint the 2D area canvas
const cleanupArea = createColorArea(areaCanvas, { hue });

// 2. Paint the hue bar canvas
const cleanupHueBar = createHueBar(hueCanvas, { lightness: l, chroma: c });

// 3. Set up the area thumb (just a swatch element + caller CSS positioning)
const cleanupAreaThumb = createSwatch(areaThumbEl, { l, c, h: hue });

// 4. Set up the hue thumb
const cleanupHueThumb = createSwatch(hueThumbEl, { l, c, h: hue });

// 5. Attach pointer tracking to the area
const cleanupAreaInteractive = createInteractive(areaContainer, {
  mode: "2d",
  onMove: (point) => {
    // point.left -> lightness (0-1)
    // point.top -> chroma (inverted: 0=maxChroma, 1=0)
    l = point.left;
    c = (1 - point.top) * maxChroma;

    // Position thumb via CSS
    areaThumbEl.style.left = `${point.left * 100}%`;
    areaThumbEl.style.top = `${point.top * 100}%`;

    // Update thumb color
    updateSwatch(areaThumbEl, { l, c, h: hue });

    // Update hue bar to reflect new L/C
    updateHueBar(hueCanvas, { lightness: l, chroma: c });

    // Update numeric inputs
    updateColorInput(inputFields, {
      fields: inputFields,
      value: { l, c, h: hue },
      onChange: handleInputChange,
    });
  },
});

// 6. Attach pointer tracking to the hue bar
const cleanupHueInteractive = createInteractive(hueContainer, {
  mode: "1d-horizontal",
  onMove: (point) => {
    hue = point.left * 360;

    // Repaint area at new hue
    updateColorArea(areaCanvas, { hue });

    // Position hue thumb
    hueThumbEl.style.left = `${point.left * 100}%`;
    updateSwatch(hueThumbEl, { l, c, h: hue });
  },
});

// 7. Wire up numeric inputs
function handleInputChange(color: OklchColorAlpha) {
  l = color.l;
  c = color.c;
  hue = color.h;
  // update everything...
}

const cleanupInputs = createColorInput(inputFields, {
  fields: inputFields,
  value: { l, c, h: hue },
  onChange: handleInputChange,
});

// 8. Teardown
function cleanup() {
  cleanupArea();
  cleanupHueBar();
  cleanupAreaThumb();
  cleanupHueThumb();
  cleanupAreaInteractive();
  cleanupHueInteractive();
  cleanupInputs();
}
```

---

## 9. Responsibility Matrix

| Concern                      | interactive | color-area | hue-bar | color-swatch (thumb) | color-input | oklch-gamut |
| ---------------------------- | :---------: | :--------: | :-----: | :------------------: | :---------: | :---------: |
| Pointer/touch/keyboard input |     YES     |     --     |   --    |          --          |     --      |     --      |
| Canvas rendering             |     --      |    YES     |   YES   |          --          |     --      |     --      |
| Element positioning          |     --      |     --     |   --    |      caller CSS      |     --      |     --      |
| Color display                |     --      |    YES     |   YES   |         YES          |     --      |     --      |
| Numeric value entry          |     --      |     --     |   --    |          --          |     YES     |     --      |
| Gamut pixel classification   |     --      |    YES     |   YES   |          --          |     --      |     YES     |
| Gamut tier indication        |     --      |     --     |   --    |   YES (data attr)    |     --      |     --      |
| Gamut tier computation       |     --      |     --     |   --    |          --          |     --      |     --      |
| ARIA attributes              |     YES     |    YES     |   YES   |         YES          |     YES     |     --      |
| Event listener cleanup       |     YES     |     --     |   --    |          --          |     YES     |     --      |
| Style/attribute cleanup      |     YES     |    YES     |   YES   |         YES          |     YES     |     --      |

"--" means the primitive explicitly does NOT handle this concern.
"caller CSS" means the caller is responsible, not the primitive.
Gamut tier computation (deciding 'gold'/'silver'/'fail' for a selected color) is a caller
concern -- the caller may use `inSrgb`/`inP3` from oklch-gamut or its own logic.

---

## 10. File Locations

All new files go in `packages/ui/src/primitives/`:

```
packages/ui/src/primitives/
  types.ts              (existing, add NormalizedPoint, MoveDelta, InteractiveMode, OklchColor, OklchColorAlpha)
  oklch-gamut.ts        (new -- inline gamut math, ~30 lines)
  interactive.ts        (new -- composes keyboard-handler.ts)
  color-area.ts         (new -- imports from oklch-gamut.ts)
  hue-bar.ts            (new -- imports from oklch-gamut.ts)
  color-input.ts        (new)
  color-swatch.ts       (existing, unchanged -- reused for thumb/pointer display)
  keyboard-handler.ts   (existing, unchanged -- composed by interactive.ts)
```

Note: there is **no** `color-pointer.ts`. The existing `color-swatch.ts` covers the
thumb use case. The caller adds positioning CSS.

---

## 11. Import Rules (Copyability)

Each primitive may only import from:

- `./types` (shared types within primitives)
- Sibling primitives within `packages/ui/src/primitives/`

Allowed cross-primitive imports:

| File             | May import from      | What                                               |
| ---------------- | -------------------- | -------------------------------------------------- |
| `interactive.ts` | `./keyboard-handler` | `createNavigationHandler`, `createKeyboardHandler` |
| `interactive.ts` | `./types`            | `CleanupFunction`, `NormalizedPoint`, etc.         |
| `color-area.ts`  | `./oklch-gamut`      | `inSrgb`, `inP3`                                   |
| `color-area.ts`  | `./types`            | `CleanupFunction`                                  |
| `hue-bar.ts`     | `./oklch-gamut`      | `inSrgb`, `inP3`                                   |
| `hue-bar.ts`     | `./types`            | `CleanupFunction`                                  |
| `color-input.ts` | `./types`            | `CleanupFunction`, `OklchColorAlpha`               |
| `oklch-gamut.ts` | (none)               | Pure math, no imports                              |

No primitive imports from `@rafters/color-utils`, `@rafters/shared`, or any
workspace package. The caller imports from those packages if needed and passes
computed data into the primitives via options.
