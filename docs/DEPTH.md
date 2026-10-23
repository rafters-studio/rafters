# Depth

Interfaces have layers. A dropdown sits above the page. A modal sits above the page and its backdrop, and the menus and popovers opened inside a modal sit above the modal. If these layers collide, the user loses trust in the interface.

## The Stack

Every layer has a fixed position. No z-index wars. No `z-[9999]`.

| Layer | Utility | Default | What lives here |
|-------|---------|---------|----------------|
| Below | `z-depth-below` | -1 | Backgrounds and decorative elements behind the page |
| Base | `z-depth-base` | 0 | Page content, cards, form controls |
| Sticky | `z-depth-sticky` | 20 | Sticky headers and toolbars |
| Navigation | `z-depth-navigation` | 25 | Sidebars, slide-out navigation |
| Fixed | `z-depth-fixed` | 30 | Fixed elements that stay visible |
| Overlay | `z-depth-overlay` | 35 | The backdrop that dims the page behind a modal |
| Modal | `z-depth-modal` | 40 | Dialogs, sheets |
| Dropdown | `z-depth-dropdown` | 50 | Select menus, dropdown menus, autocomplete |
| Popover | `z-depth-popover` | 50 | Popovers, which open above modals |
| Tooltip | `z-depth-tooltip` | 60 | Tooltips, the highest common layer |
| Max | `z-depth-max` | 9999 | Emergency overlays such as dev tools |

These are not suggestions. A menu opened inside a modal shows because `z-depth-dropdown` is above `z-depth-modal`; give a component another component's layer and that ordering breaks.

Each `z-depth-*` class is Tailwind's own `z` utility. `rafters.css` sets `--rafters-depth-<level>` on `:root` and the theme key `--z-index-depth-<level>` to `var(--rafters-depth-<level>)`, so the class compiles to one `z-index` declaration and follows the token.

<!-- VENEER: Exploded view. Show the depth stack as separated horizontal planes, like an architectural section drawing. Each plane labeled with what lives on it. The user sees the spatial model. -->

## Depth Comes With Shadow

Higher layers cast larger shadows. This is how the real world works -- a sheet of paper held close to a desk casts a tight shadow. Held high, the shadow spreads.

| Depth | Shadow |
|-------|--------|
| Base (cards, inputs) | `shadow-sm` -- tight, subtle |
| Dropdown, popover | `shadow-md` -- visible but grounded |
| Modal, sheet | `shadow-lg` -- clearly elevated |

The shadow tokens are in `@theme`. Tailwind's `shadow-sm`, `shadow-md`, `shadow-lg` read from the system. Change the shadow definition, every component at that depth updates.

<!-- VENEER: Three cards stacked at different depths. Each casts the corresponding shadow. The user sees depth through shadow, not through z-index numbers. -->

## Focus Trap

When a modal opens, keyboard focus is trapped inside it. Tab cycles through the modal's focusable elements. Escape closes it. Focus returns to the element that opened it.

This is not optional. Without focus trap, a keyboard user tabs behind the modal into invisible content. The overlay dims the page visually, but screen readers and keyboards don't see visual dimming.

<!-- VENEER: Animated sequence. Modal opens, focus ring moves through its elements, reaches the end, wraps to the beginning. Escape closes, focus returns to the trigger button. Show the focus ring path. -->
