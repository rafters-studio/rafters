# Radius

Corners tell you who made this. Apple rounds everything. Audi sharpens everything. Your brand's corners are your brand's personality at the pixel level.

## One Base

Every radius in the system derives from `radius-base`, which itself derives from `spacing-base` (1.5 times it by default). Change it and every `rounded-*` utility moves, because each one reads its token through `var(--rafters-radius-*)`. Bare `rounded` is the registry's `radius` token. No component files are touched.

The registry also holds per-corner tokens (`radius-tl`, `radius-lg-br` and the rest), written to `:root` as `--rafters-radius-*`. No Tailwind utility reads them: `rounded-tl-lg` sets one corner from `radius-lg`, like every other corner utility. Overriding `radius-br` alone changes nothing a component renders today.

<!-- VENEER: Four interactive corner controls on a card. Drag any corner from 0 to full. The card updates in real time. Below the card, show a button, input, and badge all responding to the same corner values. One change, system-wide effect. -->

## The Scale

Radius uses the same mathematical progression as spacing. `radius-base` is the anchor. The scale multiplies from there.

| Token | Role |
|-------|------|
| `radius-none` | Sharp. Tables, inline elements, intentionally angular. |
| `radius-sm` | Subtle. Checkboxes, keyboard indicators, small controls. |
| `radius-md` | Default. Buttons, inputs, toggles. The workhorse. |
| `radius-lg` | Prominent. Cards, dialogs, sheets. |
| `radius-xl` | Emphasized. Hero cards, featured panels. |
| `radius-full` | Circular. Avatars, badges, pills. |

Change `radius-base` from 6px to 2px and the entire scale compresses. Every component sharpens. The progression ratio maintains the relationship between sm, md, and lg -- they don't collapse to the same value, they all shift proportionally.

<!-- VENEER: A slider for radius-base. Below it, a row of components (button, card, input, badge, avatar) all responding to the slider. The user sees the brand personality shift as they drag. Sharp = technical. Soft = friendly. Full round = playful. -->

## Brand Identity in Corners

Our research across design systems found that radius is the strongest single signal of brand personality. Users can't articulate why one interface feels "professional" and another feels "approachable" -- but the difference is often 2px vs 8px on the corners.

This is why radius is not a detail to pick per-component. It's a system-level decision that cascades everywhere. The designer makes it once. The system enforces it everywhere.

<!-- VENEER: Three versions of the same card layout. Left: radius 0 (sharp, industrial). Center: radius 6px (balanced, professional). Right: radius 16px (soft, friendly). Same content, same colors, same spacing. Only the corners change. The personality shift should be striking. -->
