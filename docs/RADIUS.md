# Radius in Rafters

Border radius is one of the strongest brand signals in a design system. Apple rounds everything fully. Audi cuts sharp. IBM uses subtle rounding. The radius system in Rafters makes this a single-value decision that cascades across every component.

## The Scale

Radius uses the same minor-third (1.2) progression as spacing and typography. The base radius (6px, derived from `baseSpacingUnit * 1.5`) is step 0. Each position is `base * 1.2^step`:

| Token | Step | Default Value | Purpose |
|-------|------|---------------|---------|
| `radius-none` | -- | 0 | Sharp corners. Tables, inline elements. |
| `radius-sm` | -1 | ~5px | Subtle rounding. Badges, tags, small elements. |
| `radius` | 0 | 6px | Default. Buttons, inputs, cards, dropdowns. |
| `radius-md` | 1 | ~7.2px | Medium. Containers, panels, dialogs. |
| `radius-lg` | 2 | ~8.6px | Large. Modals, feature panels, large cards. |
| `radius-xl` | 3 | ~10.4px | Extra large. Hero cards, featured sections. |
| `radius-2xl` | 4 | ~12.4px | Pills, large avatars, emphasized buttons. |
| `radius-3xl` | 5 | ~14.9px | Stadium shapes, special emphasis. |
| `radius-full` | -- | 9999px | Circles and pills. Avatars, pill buttons. |

## The calc() Cascade

Every radius token except `none` and `full` references `radius-base` through `calc()`:

```css
--rafters-radius-base: 0.375rem;                              /* 6px */
--rafters-radius-sm:   calc(var(--rafters-radius-base) * 0.833); /* base / 1.2 */
--rafters-radius:      var(--rafters-radius-base);               /* 6px */
--rafters-radius-md:   calc(var(--rafters-radius-base) * 1.2);   /* base * 1.2 */
--rafters-radius-lg:   calc(var(--rafters-radius-base) * 1.44);  /* base * 1.2^2 */
--rafters-radius-xl:   calc(var(--rafters-radius-base) * 1.728); /* base * 1.2^3 */
```

Override `--rafters-radius-base` and the entire scale shifts. Set it to 0 and you get a sharp, angular system. Set it to 12px and you get soft, rounded surfaces. The mathematical relationships hold regardless of the base value.

## Component-Specific Radius

Components use radius tokens appropriate to their visual role:

| Component | Radius | Reason |
|-----------|--------|--------|
| Buttons | `radius` (default) | Familiar interactive element, standard rounding |
| Inputs | `radius` (default) | Must match buttons when placed side by side |
| Cards | `radius-lg` | Larger surface needs proportionally larger rounding |
| Badges | `radius-full` | Pill shape signals "label" or "count" |
| Avatars | `radius-full` | Circle shape is universal for person/identity |
| Modals | `radius-lg` | Floating surface with generous rounding |
| Tooltips | `radius-md` | Small floating element, moderate rounding |

The system enforces these associations. A developer using `Card` gets `radius-lg` without specifying it. The radius is part of the component's encoded intelligence.

## Designer Overrides

The why-gate applies to radius the same way it applies to color. When a designer overrides a radius value, they provide the reason.

A practical example: a Star Wars game UI sets `radius-br: 0` (bottom-right corner) to create an angular cutout effect inspired by Imperial design language. The override is recorded:

```
Token: radius-br
Previous: radius-base
New: 0
Reason: "Angular SWTOR-inspired cutout for faction identity panels"
```

This override persists in the token system. The next developer who encounters the angular corner can read why it exists instead of "fixing" it back to the default.

## Four-Corner Control

The radius system supports per-corner overrides:

- `radius-tl` -- top-left
- `radius-tr` -- top-right
- `radius-bl` -- bottom-left
- `radius-br` -- bottom-right

All corners default to `radius-base`. Per-corner overrides allow asymmetric shapes without custom CSS. The card-with-cutout pattern, the tab-with-flat-bottom pattern, and the pill-with-flat-side pattern all use per-corner tokens rather than one-off values.

## Why Radius Matters for Brand Identity

Our research found that border radius is one of the first three visual properties users notice when assessing whether an interface "looks professional." The others are color consistency and spacing rhythm.

A design system with inconsistent radius -- 4px here, 6px there, 8px on that card, 12px on this button -- reads as unfinished. The eye picks up the variation even when the user cannot articulate what feels wrong.

The progression scale prevents this. Every radius in the system is mathematically related to every other radius. The `sm` and `lg` variants don't just feel related -- they are related, by the same 1.2 ratio that connects spacing steps and type sizes.

Brands that want a distinctive radius profile change one value: `radius-base`. The progression does the rest.
