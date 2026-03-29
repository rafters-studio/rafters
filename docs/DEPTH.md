# Depth in Rafters

Depth is how the interface communicates layers. When a modal opens, it sits above the page. When a tooltip appears, it floats above the modal. The depth system ensures this layering is consistent, predictable, and never the result of z-index guessing.

## The Depth Stack

Every layer in the interface has a designated z-index. The values use 10-unit gaps to leave room for intermediate positioning if needed, but the named tokens are the only values components should use.

| Token | Z-Index | Purpose |
|-------|---------|---------|
| `depth-below` | -1 | Background decorations, pseudo-element layers |
| `depth-base` | 0 | Document flow. Regular content. No stacking context. |
| `depth-dropdown` | 10 | Dropdown menus, select options, autocomplete |
| `depth-sticky` | 20 | Sticky headers, toolbars, floating action buttons |
| `depth-navigation` | 25 | Sidebars, slide-out navigation panels |
| `depth-fixed` | 30 | Fixed elements -- always-visible headers and footers |
| `depth-modal` | 40 | Modal dialogs, sheets, blocking overlays |
| `depth-popover` | 50 | Popovers, nested menus, command palettes |
| `depth-tooltip` | 60 | Tooltips, toast notifications |
| `depth-overlay` | 70 | Overlay backdrops -- the dimming layer behind modals |
| `depth-max` | 9999 | Emergency only. Dev tools, debug overlays. |

Each level above `base` creates a new stacking context. This is by design -- stacking contexts isolate layers so that z-index values inside a modal don't compete with z-index values on the page.

## Why Fixed Values, Not Arbitrary Numbers

The z-index wars happen because developers pick numbers out of thin air. One person writes `z-index: 100`, another writes `z-index: 999`, a third writes `z-index: 99999` to "win." The result is an incomprehensible mess where nobody knows which element will appear on top.

Rafters eliminates this by making the depth scale the only valid source of z-index values:

```css
/* Wrong */
z-index: 100;
z-index: 999;
z-index: 99999;

/* Right */
z-index: var(--depth-modal);
z-index: var(--depth-tooltip);
```

The named tokens make the intent clear. A `depth-modal` value tells you this element is a modal-level overlay. A raw `100` tells you nothing.

The `depth-max` token (9999) exists for genuine emergencies -- development tools, debug overlays, critical system alerts. Its usage patterns explicitly state: never use in production UI, never use to "win" z-index conflicts. If you need `depth-max`, the architecture is probably wrong.

## How Depth Relates to Shadow

Depth and shadow are independent systems that work together. Depth controls stacking order (which element is on top). Shadow communicates perceived elevation (how far the element appears from the surface beneath it).

The elevation system pairs them:

| Elevation Level | Depth Token | Shadow Token |
|----------------|-------------|--------------|
| `surface` | `depth-base` | `shadow-none` |
| `raised` | `depth-base` | `shadow-sm` |
| `overlay` | `depth-dropdown` | `shadow-md` |
| `sticky` | `depth-sticky` | `shadow-md` |
| `modal` | `depth-modal` | `shadow-lg` |
| `popover` | `depth-popover` | `shadow-lg` |
| `tooltip` | `depth-tooltip` | `shadow-md` |

Notice: `surface` and `raised` share `depth-base` (z-index 0) but differ in shadow. A card sits on the page surface -- it doesn't need a z-index -- but its shadow communicates that it is a distinct surface. A modal needs both: z-index to appear above the page, and shadow to communicate its floating position.

Base elements have shadow but no z-depth. They are on the page surface. Overlays have both z-depth and shadow. They float above it.

## Focus Trap and the Modal Stack

When a modal opens, the focus trap captures keyboard navigation inside it. The depth system supports this by guaranteeing that modal-level elements (z-index 40) are above all page content (z-index 0-30).

The overlay backdrop (`depth-overlay` at 70) sits above everything including the modal. This seems counterintuitive -- shouldn't the modal be on top of its own backdrop? The backdrop is rendered as a sibling, not a parent, and its z-index positions it to catch clicks outside the modal. The modal content itself renders above the backdrop through DOM order within the same stacking context.

When multiple modals stack (a confirmation dialog inside a settings modal), each creates its own stacking context. The later modal's `depth-modal` applies within its parent context, naturally appearing above the earlier one without z-index escalation.

## Usage Patterns

**Do:**
- Use semantic depth tokens for all z-index values
- Let elevation tokens pair depth with shadow automatically
- Trust the stacking context isolation -- elements inside a modal don't need high z-index

**Never:**
- Use arbitrary z-index values
- Create z-index battles between components
- Skip levels without documenting why
- Use `depth-max` in production UI
- Use `depth-below` for interactive elements
