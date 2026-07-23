# Motion in Rafters

Motion communicates. It tells the user what happened, where they are, and what to expect next. Every animation in the system exists because it answers one of these questions. If it doesn't answer any of them, it doesn't move.

That last rule is not taste. Decorative animation measurably impairs recall -- it is extraneous cognitive load wearing a costume.[^stokes-2020] An animation without a purpose does not fail to help; it hurts.

## Why motion exists

**Object permanence.** Objects continue to exist when they are no longer visible -- a understanding humans develop in infancy and take for granted in the physical world.[^piaget-1954] Digital interfaces routinely violate it. A panel vanishes: did it close, minimize, or get destroyed? Without transition, every state change is a discontinuity the brain must resolve consciously rather than intuitively. Disrupting a spatial mental model raises cognitive load.[^tversky-1993]

This is measured, not asserted. Bederson and Boltman had twenty subjects navigate a family tree with and without animated transitions: animation improved spatial recall with no penalty on task time.[^bederson-1999] Heer and Robertson found the same for statistical graphics -- animated transitions preserved which data element was which across chart-type changes.[^heer-2007] Chang and Ungar made the argument as early as 1993: interface elements should behave as though they have mass and inertia.[^chang-1993]

**Emotional safety.** A button that teleports to its pressed state tells you nothing. A button that compresses under your touch and rebounds tells you: I received your input, I am responding, the response is proportional to what you did. That is body language. Remove it and you get an interface that works and feels hostile.

## The perceptual bands

The duration bands are derived from how the visual system actually works. Perception sets the bounds; **the designer's choice fits inside them.** A system that derives a harmonic progression first and checks perception afterwards produces a scale that is mathematically elegant and perceptually useless.

- **Under ~100ms** -- perceived as instantaneous. Nothing is communicated; there is no benefit over an instant change.
- **~200-300ms** -- the communicative window. Fast enough to feel responsive, slow enough for the visual system to track a trajectory and build a spatial model.
- **Over ~500ms** -- sluggish. The brain has already predicted the outcome and is waiting for the screen to catch up.

Honesty about the middle band: it is a practice-validated heuristic, not a measured law, and it is widely misattributed to Thorpe et al., which measured rapid categorization of static images (~150ms) rather than motion tracking.[^thorpe-1996] The real support is indirect and worth stating plainly: Card, Moran and Newell put the perceptual processor cycle at roughly 100ms, so a 200-300ms animation spans two to three frames -- enough to perceive direction and trajectory, not enough to consume attention.[^card-1983] Nielsen's 0.1s instantaneous threshold anchors the lower bound.[^nielsen-1993] Do not cite Thorpe for this.

These bands are the constraint every duration in the system answers to. They are not the values.

## Motion never ships a fixed value

A component that writes `duration-150` has hardcoded a number the way `p-[32px]` hardcodes a number. It is a value wearing a token's name. The whole point of a token layer is that a designer moves the value and every consumer follows -- a literal in a component breaks that in one stroke, silently, because both spellings compile.

So: **no duration, easing, or keyframe in this system is a constant.** Every one of them resolves from the project's aesthetic intent, bounded by what perception permits.

## How motion consumes intent

Intent is the project's aesthetic starting position -- the first question Studio asks, before any token exists. It drives spacing, type, radius and depth as well as motion; a system whose spacing says *elegant* and whose motion says *efficient* is incoherent, and the only way to prevent that is one source every namespace reads.

That source is foundational and **not yet written** -- intent gets its own document, upstream of this one and of `SPACING.md`, `TYPOGRAPHY.md`, `RADIUS.md` and `DEPTH.md`. Until it exists, the vocabulary below is described here only as far as motion consumes it, and the canonical definition is owed.

This document covers only motion's slice.

### Magnitude interpolates, character quantizes

The single rule that governs how intent resolves into motion, and it is perceptual rather than arbitrary.

**Spacing is a magnitude.** Any point on the line is a real value -- 17px is a legitimate spacing. So a designer can settle *between* intent snap points and get custom numbers, and the result is meaningful.

**Curves are characters.** A cubic-bezier interpolated halfway between `enter` and `spring-snappy` is not a hybrid personality. It is an arbitrary curve that reads as neither. So **curves snap to the nearest anchor** rather than blending.

Durations sit with magnitude; curves sit with character. This is why the duration tiers below are ranges and the curves below are roles.

### Naming a position

A project sitting exactly on a snap point is named for it: `elegant`. A project that has moved off it is named for the nearest point plus a marker: **`elegant (custom)`**.

The marker *is* the drift signal -- nothing separate has to detect it. Because the label tracks the nearest point, drifting past the midpoint re-labels to `efficient (custom)` on its own, so it can never go stale. The label is derived for humans; the underlying position persists, because curve-snapping and regeneration need it.

The absence of the marker is meaningful: plain `elegant` means untouched, which makes *reset to elegant* an obvious affordance and lets Studio show exactly what has been changed.

**Everything is editable.** Intent is a starting position, not a lock.

## Principles

**Respond, don't perform.** The interface reacts to the user. It never performs for an audience. Nothing bounces, slides, or fades without a reason the user would understand if asked.

**Precision over expression.** The fastest interactions are nearly instant. The slowest stay under 500ms. Nothing exceeds 700ms. If an animation feels long, it is wrong.

**Exits are faster than entrances.** When something appears, the user needs a moment to comprehend it. When something disappears, the user already decided it should go. You greet warmly and leave quietly.

**Duration is a function of size and distance.** Larger elements moving further need longer durations, because that is how physics works and the visual system expects physics. This principle is what *assigns* each semantic token its tier -- a modal is larger and travels further than a dropdown, which is why `motion-modal-in` sits at `normal` and `motion-dropdown-in` at `moderate`. Authors do not re-derive it; they use the semantic token that already encodes it.

**One element at a time.** The eye tracks one moving element. Sequential animation creates narrative; simultaneous animation creates noise.

**Feedback survives reduce-motion.** Remove spectacle, preserve feedback. Spatial transitions become cross-fades; hover, focus and press acknowledgments remain, because removing them creates uncertainty about whether input was received.

**Nothing blocks interaction.** If a modal is still opening and the user taps elsewhere, it closes immediately. Animations are interruptible by design.

## Duration tiers

Six tiers, each a **range** rather than a value. The range is the perceptual band the tier must stay inside; the value within it is the designer's, set by intent and adjustable afterward. Studio clamps its picker to the range, so a duration outside its band is not reachable by accident.

The tiers are **not a progression.** `moderate` is not `fast × ratio`. It is *somewhere in the communicative window*, and the window is a fact about perception, not a step on a curve. Harmony is spacing's discipline; perception is motion's.

| Tier | Range | Default | Band | Purpose |
|------|-------|---------|------|---------|
| `instant` | fixed 0 | 0ms | -- | Cursor changes, text selection, badge counts. No perceptible transition. |
| `micro` | 50-120ms | 100ms | at the instantaneous threshold | Focus rings, press feedback. Immediate but visible. |
| `fast` | 120-200ms | 150ms | below the communicative window | Hover states. The cursor is already there; the response must match its speed. |
| `moderate` | 200-300ms | 250ms | communicative | Dropdowns, tab switches, small reveals. |
| `normal` | 300-400ms | 350ms | communicative, larger movement | Modal entrances, toggles, standard state transitions. The workhorse. |
| `slow` | 400-500ms | 500ms | at the sluggish boundary | Sheets, page transitions, large spatial movement where the user needs orientation. |

Defaults are the values the system ships at neutral intent. Nothing moves until a designer moves it.

Below `moderate`, motion is acknowledgment rather than communication -- correct for hover and focus, wrong for anything the user must comprehend. A system whose tiers all sit under 200ms cannot express a communicative transition at all, which is why the ranges do not overlap downward.

## Easing curves

Six curves. Rafters is not a brand -- it is the system a brand is built on, and the curve is where personality lives. A single-brand system correctly ships one curve;[^audi-ci] a system that others build brands with ships the vocabulary they choose their personality from.

Audi's curve is `cubic-bezier(0.75, 0.02, 0.5, 1)`, **derived from the acceleration profile of the car.**[^audi-ci] It was not picked from a menu -- it was computed from a real fact about the product, which is why one curve produces one coherent personality. Rafters needs six because it serves many brands, but they must derive the same way rather than sit as literals.

### Curves are roles, not numbers

A curve is a **role** whose shape resolves from intent, bounded by what that role has to communicate. Three parameters describe any of them:

- **bias** -- where the energy sits. Low is decelerating (arrival), high is accelerating (departure), mid is symmetric. **Fixed by the role** -- it is what makes `enter` *enter*.
- **intensity** -- distance from linear. **Set by intent.** This is the personality dial.
- **settle** -- how tightly a spring comes to rest. **Set by intent**, springs only.

Move intent once and all six shift coherently. That is Audi's one-personality property, without collapsing to one curve.

| Curve | Bias (role-fixed) | Bounded by | Default |
|---|---|---|---|
| `standard` | symmetric | must read as neutral -- no overshoot | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` |
| `enter` | decelerating | must finish slower than it starts | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` |
| `exit` | accelerating | must start slower than it finishes | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` |
| `linear` | none | fixed -- the null case, like `instant` | `linear` |
| `spring-smooth` | decelerating + settle | critically damped, no visible bounce | `cubic-bezier(0.2, 0.9, 0.3, 1.0)` |
| `spring-snappy` | decelerating + tight settle | settles faster than smooth, still no bounce | `cubic-bezier(0.2, 0.8, 0.2, 1.0)` |

The emotional register is not decoration. It is how the shape is read, and it is empirically grounded: Dragicevic et al. tested constant-speed against slow-in/slow-out for object tracking, and slow-in/slow-out won.[^dragicevic-2011]

**Standard** -- elements decelerate into place. Precision: things arrive exactly where they should, engineered rather than thrown.

**Enter** -- aggressive deceleration. **Arrival, welcome, settling into place.** The fast start communicates responsiveness; the slow finish communicates care.

**Exit** -- accelerating departure. **Withdrawal, giving space.** The hesitation acknowledges the user; the fast exit avoids lingering.

**Linear** -- constant velocity. Mechanical, procedural, without personality -- exactly right for progress and loading, where the system is working rather than interacting. Never for interactive transitions.

**Spring smooth** -- a critically-damped spring. Feels like something physical coming to rest. Page transitions, sheets, large spatial movement the user tracks.

**Spring snappy** -- a tighter spring, less settle. Toggles, presses, interactions that follow input closely.

Springs read as alive because of biological motion perception. Johansson showed that point-lights on a moving body are instantly seen as a human figure and are unrecognizable when static;[^johansson-1973] Pratt et al. showed that motion perceived as animate -- self-propelled, variable speed -- captures attention more effectively than mechanical motion.[^pratt-2010] Springs exhibit exactly those hallmarks.

## Semantic motion tokens

Components do not reference durations and curves directly. They reference semantic tokens encoding the complete specification -- which properties animate, which tier, which curve, and the reduced-motion degradation. The tier-to-token assignment is the size-and-distance principle already applied, so an author never re-derives it.

The property column is deliberate. `motion-hover` owning `transition-property: colors` is the design: the token is the complete transition, not a timing fragment the author must assemble.

| Token | Duration | Easing | Property |
|-------|----------|--------|----------|
| `motion-hover` | fast | standard | colors |
| `motion-focus` | micro | linear | ring, shadow |
| `motion-press` | micro | spring-snappy | transform, colors |
| `motion-toggle` | moderate | spring-snappy | colors, transform |
| `motion-dropdown-in` | moderate | enter | opacity, transform |
| `motion-dropdown-out` | fast | exit | opacity, transform |
| `motion-modal-in` | normal | enter | opacity, transform |
| `motion-modal-out` | moderate | exit | opacity, transform |
| `motion-sheet-in` | slow | spring-smooth | transform |
| `motion-sheet-out` | normal | exit | transform |
| `motion-expand` | normal | enter | grid-template-rows, opacity |
| `motion-collapse` | moderate | exit | grid-template-rows, opacity |
| `motion-page` | slow | spring-smooth | opacity, transform |

The Duration and Easing columns name **tiers and roles**, not values -- each resolves to whatever the project's intent set it to. Every `-in`/`-out` pair has a shorter exit. The user chose to leave.

Expand and collapse animate `grid-template-rows` (`0fr` <-> `1fr`), never `height` -- `height: auto` is not transitionable, and a grid row animates on an element that stays present, which sidesteps the fact that `display: none` blocks transitions entirely.

## Combination constraints

These are rules, not values. A cross-parameter rule has no home in any single token -- so instead of leaving them as prose, they live as structured, queryable metadata an agent composing motion can read before it writes the wrong thing. They exist because the number of possible parameter combinations is larger than intuition can navigate.[^audi-ci]

| Parameter | Rule | Why |
|---|---|---|
| Direction | Horizontal or vertical. **Never diagonal.** | The eye tracks one axis at a time. Axis-aligned movement creates order. |
| Scaling | May combine with movement. | Scale changes state, movement changes position; together they read as arriving at a new size. |
| Opacity | May combine with movement. | Fade plus slide is the standard enter/exit. Fade alone is for elements that do not move. |
| Rotation | Small elements only. **Never combined with another parameter.** | Rotation is visually dominant; combined with translation it is chaos. Isolated, it reads as processing. |
| Timing | Sequential, not simultaneous. | Staggered sequences create narrative. Simultaneous animation is noise. |

### Where the constraints live

The table above is mirrored by machine-readable data and a validator in `@rafters/design-tokens` (`packages/design-tokens/src/generators/motion-constraints.ts`), the package the CLI already depends on, so tooling can read the rule rather than re-deriving it from prose:

- **`MOTION_COMBINATION_CONSTRAINTS`** -- the five constraints as data, each carrying an `id`, `rule`, `rationale`, and a `kind`.
- **`MOTION_GOVERNING_RULE`** -- the rule below, with its three questions and its enforcement posture.
- **`validateMotionComposition(composition)`** -- takes a proposed animation described by the *parameters it engages* (translate axis, scale, opacity, rotation, element size, timing) and returns the constraint violations. An empty list means legal. `isLegalMotionComposition` is the boolean wrapper.

Two splits are deliberate and are recorded in the data itself:

- **Permission vs prohibition.** Only Direction, Rotation, and Timing have teeth -- the validator rejects diagonal movement, rotation combined with anything (or on a large element), and simultaneous timing. Scaling and Opacity are `kind: 'permission'`: they *bless* combining with movement (`scale + move`, `fade + slide`), so the validator never rejects them. A validator that rejected "any two parameters combined" would contradict this spec.
- **Mechanical vs advisory** for the governing rule (below). Its `enforcement` field is `mechanical-presence-advisory-truth`: the validator mechanically requires that a composition *declares* which question it answers, but whether the declared answer is *true* is a human or agent judgment and stays advisory.

**Governing rule -- motion that answers no question does not move.** If an animation does not tell the user what happened, where they are, or what to expect next, it is decorative. This one has teeth: decorative animation measurably impairs recall.[^stokes-2020] `validateMotionComposition` enforces the presence half -- a composition with no declared `answers` is rejected.

## What gets no motion

Cursor changes. Text colour on validation (the border and ring animate, the text does not). Icon swaps. Badge counts. Scroll position. Breadcrumbs. Tooltip appearance (opacity only, no spatial motion).

## Reduced motion

Motion causes physical harm, not annoyance -- dizziness, nausea, vertigo. Roughly 35% of US adults over 40 have vestibular dysfunction.[^agrawal-2009] Respecting `prefers-reduced-motion`[^w3c-mq5] is an accessibility requirement, and WCAG 2.1 SC 2.3.3 asks for it directly.[^wcag-2.3.3]

**Preserved:** hover colour transitions, focus rings, press feedback (opacity/colour, no transform), toggle state (cross-fade, no slide).

**Replaced with cross-fade:** modal, sheet, page, dropdown -- each at a shortened duration.

**Removed:** all transform animation, bounce and overshoot, spinner rotation (becomes pulsing opacity), parallax, ambient motion.

The user opted out of spatial movement, not out of knowing what changed.

## The ceiling rule

Longer than 500ms means one of three things: the element moves too far (break it into steps), the element is too large (cross-fade instead), or the animation is decorative (remove it). The only exception is full-screen transitions in spatially-navigated applications, where 700ms is absolute.

The tier ranges enforce the 500ms ceiling mechanically -- `slow` tops out there and Studio cannot pick past it. Exceeding it requires the why-gate: the override is recorded with a reason, the previous value preserved, and the system remembers it was a conscious decision rather than a default.

## The four-voice test

- **Rams** -- is this animation necessary?
- **Ive** -- does the timing respect how the eye tracks movement?
- **Davis** -- does the intent hold together across every namespace?
- **Nielsen** -- does this help the user understand what happened?

All four must say yes.

A note on Davis, because his question changed. It used to ask whether the durations were *harmonically related*, which assumed a progression. Motion has no progression -- the tiers are perceptual bands, and a designer choosing 137ms for `fast` is not disharmonious, they are inside the band. **Harmony is spacing's test**, where a base and a ratio genuinely rule. Davis's question for motion is coherence: does this project read as one intent, or has motion drifted off what spacing and type are saying?

## Implementation status

This document is the specification. Substantial parts of it are **not** what currently ships. Tracked in #1899.

**Ships today (via #1909):**

- Six duration tiers and six easing curves, at the default values in the tables above.
- Thirteen semantic `motion-*` tokens, compiling as `@utility` classes and consumable as bare class names.
- Combination constraints as structured metadata plus a mechanical validator (`motion-constraints.ts`).
- Accordion consumes the semantic tokens, including the `grid-template-rows` expand/collapse pattern.

**Partial:**

- **The component sweep never happened.** Accordion is the only component using semantic motion tokens. Roughly thirty others still hardcode `duration-150`, `duration-200`, `duration-100` and `duration-300` with hand-written `transition-*` properties -- the exact literals this layer exists to prevent. Both spellings compile, so nothing fails and nothing warns.

**Not built -- everything intent-related in this document:**

- Intent itself: the foundational document, the vocabulary, Studio onboarding, the two-skeleton preview.
- Duration **ranges**. The tiers are currently fixed literals (`def.ms` in `generators/motion.ts`), and the generator documents this as deliberate -- the base duration token's own guidance reads *"never assume the perceptual duration tiers derive from this."* A designer's base setting moves the delay tokens and nothing else.
- Easing **derivation**. The six curves are literals (`def.css`), not resolved from bias, intensity and settle.
- `elegant (custom)` naming, drift tracking, and the reset affordance.
- Curve-snapping hysteresis at intent midpoints.

**Also outstanding:** the keyframe table is still copied shadcn vocabulary rather than authored as rafters primitives, and `bounce` hardcodes two cubic-beziers *inside* the keyframe, bypassing the easing vocabulary entirely.

## Sources

The research backing this document lives in `vault-2026/projects/rafters/courses/motion-as-emotional-safety.md` (full citations) and `vault-2026/concepts/motion-as-emotional-safety.md` (the Audi analysis). Note that the concepts document still attributes the 200-300ms window to Thorpe; the course corrects it, and this document follows the course.

[^piaget-1954]: Piaget, J. (1954). *The Construction of Reality in the Child*. Basic Books.
[^tversky-1993]: Tversky, B. (1993). Cognitive maps, cognitive collages, and spatial mental models. *Spatial Information Theory*, 14-24.
[^bederson-1999]: Bederson, B. B., & Boltman, A. (1999). Does Animation Help Users Build Mental Maps of Spatial Information? *IEEE InfoVis '99*, 28-35.
[^heer-2007]: Heer, J., & Robertson, G. G. (2007). Animated Transitions in Statistical Data Graphics. *IEEE TVCG*, 13(6), 1240-1247.
[^chang-1993]: Chang, B.-W., & Ungar, D. (1993). Animation: from cartoons to the user interface. *UIST '93*, 45-55.
[^thorpe-1996]: Thorpe, S., Fize, D., & Marlot, C. (1996). Speed of processing in the human visual system. *Nature*, 381, 520-522. Cited here only to mark it as commonly misapplied to motion duration.
[^card-1983]: Card, S. K., Moran, T. P., & Newell, A. (1983). *The Psychology of Human-Computer Interaction*.
[^nielsen-1993]: Nielsen, J. (1993). Response Times: The 3 Important Limits. Nielsen Norman Group.
[^thomas-1981]: Thomas, F., & Johnston, O. (1981). *The Illusion of Life: Disney Animation*.
[^dragicevic-2011]: Dragicevic, P., et al. (2011). Temporal distortion for animated transitions. *CHI '11*, 2009-2018.
[^johansson-1973]: Johansson, G. (1973). Visual perception of biological motion. *Perception & Psychophysics*, 14, 201-211.
[^pratt-2010]: Pratt, J., et al. (2010). It's alive! Animate motion captures visual attention. *Psychological Science*, 21(11), 1724-1730.
[^stokes-2020]: Stokes, A. (2020). Decorative animations impair recall and are a source of extraneous cognitive load. *Advances in Physiology Education*, 44, 107-111.
[^audi-ci]: Audi AG. Audi CI Portal: Animation Guidelines. styleguide.audi.com.
[^agrawal-2009]: Agrawal, Y., et al. (2009). Disorders of balance and vestibular function in US adults. *Archives of Internal Medicine*, 169(10), 938-944.
[^w3c-mq5]: W3C (2020). Media Queries Level 5: prefers-reduced-motion.
[^wcag-2.3.3]: W3C (2018). WCAG 2.1 SC 2.3.3: Animation from Interactions (AAA).
