# Component Spec — ButtonGroup

Status: DRAFT. A static score with a constant, non-empty aria projection
(`role="group"`) -- the alert shape, not container's empty projection. No
state, no actions, no keymap, no effects. The score survives as the structure
contract the harness audits (role + the single `root` part); the classes file
carries the connected-border layout; the performances are pure decoration
application (no useBehavior, no memory, no bind).

Files (`src/components/button-group/`):

```
button-group.classes.ts   button-group.behavior.ts   button-group.tsx
button-group.element.ts    button-group.astro
```

## Purpose

Adjoins a set of related buttons into one cohesive action set -- shared,
collapsed borders and a single focus ring that stacks above its neighbors so
it is never clipped. A layout composition: it arranges whatever buttons the
consumer projects but renders no button itself, holds no state, and is not
form-associated.

## Composition

```tsx
// Horizontal group with a size published to child buttons
<ButtonGroup size="sm" aria-label="Document actions">
  <Button variant="outline">Cancel</Button>
  <Button variant="default">Save</Button>
</ButtonGroup>

// Vertical group for stacked choices
<ButtonGroup orientation="vertical" aria-label="View options">
  <Button variant="ghost">Grid</Button>
  <Button variant="ghost">List</Button>
</ButtonGroup>
```

## Config / state / actions

- **Config:** `orientation` (`horizontal` | `vertical`, default `horizontal`)
  is the only field the score reads -- it drives the connected-border classes
  and the reflected `data-orientation`. Unknown values silently fall back to
  `horizontal` (oracle rule, `parseOrientation`).
- **State / actions:** none. A static score has nothing to remember and nothing
  to dispatch; `canDispatch` is always true because there is no gate to apply.
- **`size` (React only):** published to child buttons through
  `ButtonGroupContext`; see the disposition table. Not part of the score config
  -- it never touches the group's own projection or classes.
- **`aria-label` (all frameworks):** a consumer passthrough the performance
  applies to the root. The score never projects it -- it cannot know the label.

## Parts + ARIA

| Part | Element | ARIA | Notes |
| --- | --- | --- | --- |
| `root` | `div` (React/Astro) or the WC host | `role="group"` | Projected unconditionally by the score -- `role="group"` is the WAI-ARIA APG pattern for a related control set and is NOT native to `div`, so the score must state it (the alert idiom). `aria-label` rides as a consumer passthrough, never the projection. |

Child buttons keep their own native semantics and full keyboard accessibility;
the group adds no roving focus and claims no keys.

## Keyboard + effects

None. The keymap returns `null` for every key and the effects list is empty.
Focus moves between child buttons by their own native tab order; the
`[&>*:focus-visible]:z-10` rule raises the focused child so the single ring
clears the overlapping collapsed borders.

## Connected borders across the shadow boundary

React and Astro collapse the shared borders with Tailwind arbitrary descendant
selectors in `button-group.classes.ts` (`[&>*:first-child]:rounded-r-none`,
`[&>*:not(:first-child)]:-ml-px`, ...), because the buttons are light-DOM
descendants of the root. The Web Component projects its buttons through a
`<slot>`; slotted children stay in the light tree, so those descendant
selectors cannot cross the shadow boundary. The WC therefore encodes the SAME
behaviour natively as irreducible `::slotted(*)` shadow CSS, keyed by the
reflected `data-orientation` host attribute -- ported verbatim from the oracle
element. These rules carry no design tokens, so they live in `static styles`.

## Oracle dispositions (src/old/ui/button-group.{tsx,classes.ts,element.ts})

| Oracle feature | Disposition |
| --- | --- |
| `role="group"` + `aria-label` grouping | contract |
| `orientation` (horizontal/vertical) + connected-border / focus-stacking classes | contract |
| WC `::slotted` shadow CSS for connected borders (light-DOM slots) | contract -- ported verbatim as irreducible shadow styles |
| `size` prop + `ButtonGroupContext` + `useButtonGroupContext` | framework-affordance (React only) -- context does not cross to the WC/Astro slotted light DOM, and the oracle element observed orientation only |
| `ButtonGroupSize` (`default`/`sm`/`lg`/`icon`) narrow enum | widened -- the context now carries the ported Button's full `ButtonSize` (imported from `button.behavior`), so a published size is always a legal Button size |
| Button consuming `useButtonGroupContext` | oracle gap, not ported here -- the ORACLE's Button never consumed the hook either, so nothing regresses; the hook is the seam, and wiring Button to read it is a separate, out-of-scope change to a different component |
| `@semantic-meaning` / `@usage-patterns` prose JSDoc | dropped from the intelligence tags -- the registry parses the four canonical tags (`@cognitive-load` in the new five-dimension format, `@attention-economics`, `@trust-building`, `@accessibility`); usage guidance stays in this doc |

## WCAG obligations

- **1.3.1 Info and Relationships:** the grouping is programmatic
  (`role="group"`), not visual-only, and the group is named with `aria-label`.
- **2.1.1 Keyboard:** the group adds no key handling; each child button keeps
  native Enter/Space activation and tab order.
- **2.4.7 Focus Visible:** the focus-visible child stacks above its neighbors so
  the ring is never clipped by an overlapping collapsed border.
- **Authoring:** always pass `aria-label` so the group is named; keep groups
  small (2-5 buttons) and never nest one group inside another.

## Open

- Wiring the ported `Button` to consume `useButtonGroupContext` (oracle gap
  above) so a group `size` actually flows to its children -- a Button-side
  change, tracked separately.
- Static-score conformance is thinner than interactive components: the contract
  (role + part), the layout classes, the context affordance, and axe. No
  interaction tier exists to run.
