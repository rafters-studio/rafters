# Shadow in Rafters

Shadow communicates elevation -- how far an element is from the surface beneath it. A card with a subtle shadow sits just above the page. A modal with a deep shadow floats well above everything. The shadow system makes this relationship consistent and derived from the same mathematical foundation as the rest of the design system.

## The Shadow Scale

Shadows derive from the spacing base unit. The y-offset, blur, and spread values are multiples of `baseSpacingUnit` (4px), ensuring shadows feel proportional to the rest of the layout.

| Token | Purpose | Y-Offset | Blur | Opacity |
|-------|---------|----------|------|---------|
| `shadow-none` | Flat. Disabled states, inline elements. | 0 | 0 | 0 |
| `shadow-xs` | Subtle depth hint. List items, hover states. | 0.25x | 0.5x | 0.05 |
| `shadow-sm` | Slight elevation. Cards, buttons, inputs. | 0.25x | 1x | 0.06 |
| `shadow` | Standard elevation. Active cards, focused inputs. | 0.5x | 1.5x | 0.08 |
| `shadow-md` | Moderate float. Dropdowns, popovers. | 0.75x | 2x | 0.1 |
| `shadow-lg` | High float. Modals, sheets. | 1x | 3.75x | 0.1 |
| `shadow-xl` | Maximum shadow. Command palettes, critical overlays. | 1.25x | 6.25x | 0.12 |
| `shadow-2xl` | Extreme depth. Special emphasis only. | 1.5x | 12.5x | 0.25 |

Values shown as multiples of the base spacing unit. At the default 4px base: `shadow-sm` has a 1px y-offset and 4px blur. `shadow-lg` has a 4px y-offset and 15px blur.

## Three Practical Tiers

Most interfaces use three shadow levels. The full scale exists for edge cases, but these three cover the common patterns:

**`shadow-sm` -- Surface elements.** Cards at rest, text inputs, buttons. The shadow says "this is a distinct surface" without suggesting the element is floating. Our research found that users perceive elements with small shadows as "part of the page but separate from the background."

**`shadow-md` -- Floating elements.** Dropdowns, popovers, hovercards. The shadow says "this appeared on top of something." The increased blur and opacity create the sense that light is being blocked by an elevated surface.

**`shadow-lg` -- Overlay elements.** Modals, sheets, command palettes. The shadow says "this is detached from the page." The deep blur creates significant light diffusion, reinforcing that the element is far above the surface.

## Shadow Comes from Tokens

Shadows are defined in the token system and delivered via CSS custom properties through `@theme`:

```css
@theme {
  --shadow-sm: 0 0.063rem 0.25rem 0 rgb(0 0 0 / 0.06),
               0 0.063rem 0.125rem 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 0.188rem 0.5rem -0.063rem rgb(0 0 0 / 0.1),
               0 0.125rem 0.25rem -0.125rem rgb(0 0 0 / 0.1);
  --shadow-lg: 0 0.25rem 0.938rem -0.188rem rgb(0 0 0 / 0.1),
               0 0.25rem 0.375rem -0.25rem rgb(0 0 0 / 0.1);
}
```

Components reference these tokens, never raw shadow values:

```css
.card { box-shadow: var(--shadow-sm); }
.dropdown { box-shadow: var(--shadow-md); }
.modal { box-shadow: var(--shadow-lg); }
```

The token system also generates colored shadow variants. `shadow-primary` and `shadow-destructive` use `color-mix()` in OKLCH to tint the shadow with the semantic color, creating branded emphasis without custom CSS.

## Depth and Shadow Together

The depth system (z-index) and shadow system serve different purposes but reinforce each other. The elevation system pairs them:

**Base elements have shadow but no z-depth.** A card at `shadow-sm` sits on the page surface at z-index 0. It doesn't need to be above anything -- it just needs to look like a distinct surface.

**Overlays have both z-depth and shadow.** A modal at `shadow-lg` and `depth-modal` (z-index 40) both floats visually (shadow) and stacks correctly (z-index). The shadow reinforces what the z-index enforces.

**Shadow increases with depth.** This is not automatic but it is the convention the elevation tokens encode. `elevation-surface` pairs `depth-base` with `shadow-none`. `elevation-modal` pairs `depth-modal` with `shadow-lg`. Higher in the stack means deeper shadow.

An element's shadow should never exceed its depth position. A tooltip (`depth-tooltip`, z-index 60) should not have `shadow-2xl` because the shadow would suggest more elevation than the small, transient nature of a tooltip warrants. Tooltips use `shadow-md` -- enough to float, not enough to dominate.

## Inner Shadows

The `shadow-sm` token includes a subtle inner shadow in addition to the outer shadow. This double-layer technique adds perceived depth to small surfaces (cards, inputs) without increasing the outer shadow's opacity.

```
0 1px 4px 0 rgb(0 0 0 / 0.06),     /* outer */
0 1px 2px 0 rgb(0 0 0 / 0.1)        /* inner layer */
```

The inner layer has higher opacity but tighter blur, creating a crisp edge that makes the surface feel solid. Our research found that single-shadow cards can feel "printed on" the background rather than elevated from it.

## Reduced Motion and Shadows

Shadows are not motion. When a user enables `prefers-reduced-motion: reduce`, shadow values are unaffected. Shadows are static visual properties like color or border -- they describe a state, not a transition.

If a shadow changes (e.g., a card gaining `shadow-md` on hover), the transition between shadow values may be affected by reduced motion preferences. But the shadow values themselves remain the same. The system distinguishes between "the shadow" (a visual property) and "the shadow transition" (motion that can be reduced).

## The Progression Foundation

Shadow values derive from the spacing progression, not from their own independent scale. This ensures visual harmony: the blur radius of `shadow-md` relates mathematically to the padding of a card that uses it. Both come from the same base unit and progression ratio.

Change `baseSpacingUnit` from 4 to 6, and shadows scale proportionally with spacing. A card that had 16px padding and 6px blur now has 24px padding and 9px blur. The ratio between space and shadow stays constant.
