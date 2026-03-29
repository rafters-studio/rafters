# Motion in Rafters

Motion communicates. It tells the user what happened, where they are, and what to expect next. Every animation in the system exists because it answers one of these questions. If it doesn't answer any of them, it doesn't move.

## Principles

**Respond, don't perform.** The interface reacts to the user. It never performs for an audience. A button press gets instant acknowledgment. A modal entrance gets smooth deceleration. A loading spinner gets linear rotation. Nothing bounces, slides, or fades without a reason the user would understand if asked.

**Precision over expression.** Durations are short. Curves are tuned. The fastest interactions (hover, focus) are nearly instant. The slowest (full-screen transitions) stay under 500ms. Nothing in the system exceeds 700ms. If an animation feels long, it is wrong.

**Exits are faster than entrances.** When something appears, the user needs a moment to comprehend it. When something disappears, the user already decided it should go. Entrance duration minus 50-100ms is the exit duration. This asymmetry respects where the user's attention is.

**Feedback survives reduce-motion.** When a user enables reduced motion, we remove spectacle but preserve feedback. Spatial transitions become cross-fades. Bounces become critically damped. But hover states, focus rings, and press acknowledgments remain -- because removing them creates uncertainty about whether input was received.

**Nothing blocks interaction.** No animation prevents the user from acting. If a modal is still opening and the user taps elsewhere, the modal closes immediately. Animations are interruptible by design.

## Duration Scale

Our duration scale derives from the same mathematical progression as our spacing and typography. Each tier serves a specific interaction category.

| Token | Value | Purpose |
|-------|-------|---------|
| `duration-instant` | 0ms | Cursor changes, text selection, badge counts. No perceptible transition. |
| `duration-micro` | 100ms | Focus rings, press feedback. Must feel immediate but visible. |
| `duration-fast` | 150ms | Hover states. The user's finger or cursor is already there -- the response must match their speed. |
| `duration-moderate` | 250ms | Dropdowns, tab switches, small reveals. Enough time to track the change without waiting for it. |
| `duration-normal` | 350ms | Modal entrances, toggle animations, standard state transitions. The workhorse of the system. |
| `duration-slow` | 500ms | Sheet presentations, page transitions, large spatial movements. Reserved for transitions where the user needs orientation. |

The ceiling is 500ms for standard UI. Full-screen transitions may reach 700ms but this is the absolute maximum. Our research found that users perceive anything over 400ms as "waiting." We allow up to 500ms only when the spatial movement is large enough to justify it.

## Easing Curves

We define six curves. Each has a specific physical intention.

### Standard
`cubic-bezier(0.25, 0.1, 0.25, 1.0)`

The default. Elements decelerate into their final position. This curve communicates precision -- things arrive exactly where they should, with the confidence of something engineered rather than thrown.

Used for: most state transitions, hover effects, general-purpose motion.

### Enter
`cubic-bezier(0.0, 0.0, 0.2, 1.0)`

Aggressive deceleration. Elements appear to materialize with purpose -- fast start, gradual settle. The initial velocity is high, which makes the entrance feel responsive even at longer durations.

Used for: modal appearances, dropdown opens, content reveals. Anything entering the viewport.

### Exit
`cubic-bezier(0.4, 0.0, 1.0, 1.0)`

Accelerating departure. Elements leave quickly without lingering. The curve front-loads the deceleration and ends with acceleration, which makes exits feel decisive.

Used for: modal closes, dropdown closes, content dismissals. Anything leaving the viewport.

### Linear
`linear`

No easing. Constant velocity from start to finish. This is the only curve that feels mechanical, which is exactly right for progress indicators and loading states -- the system is working, not interacting.

Used for: progress bars, loading spinners, determinate uploads. Never for interactive transitions.

### Spring Smooth
`cubic-bezier(0.2, 0.9, 0.3, 1.0)`

A CSS approximation of a critically-damped spring. The initial movement is fast (the spring is released), then the element settles smoothly into position. This curve feels natural -- like something physical coming to rest.

Used for: page transitions, sheet presentations, large spatial movements where the user needs to track the element's journey.

### Spring Snappy
`cubic-bezier(0.2, 0.8, 0.2, 1.0)`

A tighter spring with less settle time. Snappier than smooth, more organic than standard. This is the curve for interactions where responsiveness matters more than smoothness.

Used for: toggle switches, button presses, interactive elements that follow the user's input closely.

## Semantic Motion Tokens

Components don't reference durations and curves directly. They reference semantic motion tokens that encode the complete transition specification.

| Token | Duration | Easing | Property |
|-------|----------|--------|----------|
| `motion-hover` | duration-fast | standard | colors |
| `motion-focus` | duration-micro | linear | ring, shadow |
| `motion-press` | duration-micro | spring-snappy | transform, colors |
| `motion-toggle` | duration-moderate | spring-snappy | colors, transform |
| `motion-dropdown-in` | duration-moderate | enter | opacity, transform |
| `motion-dropdown-out` | duration-fast | exit | opacity, transform |
| `motion-modal-in` | duration-normal | enter | opacity, transform |
| `motion-modal-out` | duration-moderate | exit | opacity, transform |
| `motion-sheet-in` | duration-slow | spring-smooth | transform |
| `motion-sheet-out` | duration-normal | exit | transform |
| `motion-expand` | duration-normal | enter | height, opacity |
| `motion-collapse` | duration-moderate | exit | height, opacity |
| `motion-page` | duration-slow | spring-smooth | opacity, transform |

Notice the asymmetry: every `-in` and `-out` pair has a shorter exit. `modal-in` is 350ms, `modal-out` is 250ms. `dropdown-in` is 250ms, `dropdown-out` is 150ms. The user chose to leave.

## What Gets No Motion

Some changes are instant. Adding motion would slow them down without communicating anything.

- Cursor changes
- Text color on validation (the border and ring animate, the text doesn't)
- Icon swaps (hamburger to X, chevron rotation)
- Badge count updates
- Scroll position changes
- Breadcrumb updates
- Tooltip appearance (opacity only, no spatial motion)

## Reduced Motion

When the user enables `prefers-reduced-motion: reduce`, the system adapts:

**Preserved (with reduced parameters):**
- Hover state changes (color transitions remain, duration unchanged)
- Focus ring appearance (instant or near-instant, always was)
- Press feedback (opacity/color, no transform)
- Toggle state changes (cross-fade, no slide)

**Replaced with cross-fade:**
- Modal entrance/exit becomes 150ms opacity fade
- Sheet presentation becomes 250ms opacity fade
- Page transitions become 200ms cross-fade
- Dropdown open/close becomes 100ms opacity fade

**Removed entirely:**
- All transform animations (scale, translate, rotate)
- All bounce/overshoot
- Loading spinner rotation (replaced with pulsing opacity)
- Parallax effects
- Background ambient motion

The principle: the user opted out of spatial movement, not out of knowing what changed. We preserve the information, remove the spectacle.

## Implementation

In CSS, motion tokens map to Tailwind utilities via the `@theme` layer:

```css
@theme {
  --duration-instant: 0ms;
  --duration-micro: 100ms;
  --duration-fast: 150ms;
  --duration-moderate: 250ms;
  --duration-normal: 350ms;
  --duration-slow: 500ms;

  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-enter: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-exit: cubic-bezier(0.4, 0.0, 1.0, 1.0);
  --ease-spring-smooth: cubic-bezier(0.2, 0.9, 0.3, 1.0);
  --ease-spring-snappy: cubic-bezier(0.2, 0.8, 0.2, 1.0);
}
```

Components reference these via Tailwind utilities:

```
transition-colors duration-fast ease-standard motion-reduce:transition-none
```

The `motion-reduce:transition-none` is on every component with transitions. No exceptions. The reduced motion layer handles what replaces the removed transitions.

## The Ceiling Rule

If you are writing an animation that takes longer than 500ms, stop. Either the element is moving too far (break the transition into smaller steps), the element is too large (cross-fade instead of spatial motion), or the animation is decorative (remove it).

The only exception: full-screen page transitions in applications with spatial navigation models, where 700ms is the absolute ceiling.

If a designer needs to exceed these limits, they use the why-gate. The override is recorded with a reason, the previous value is preserved, and the system remembers that this was a conscious decision, not a default.
