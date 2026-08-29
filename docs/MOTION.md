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

## Principles

**Respond, don't perform.** The interface reacts to the user. It never performs for an audience. Nothing bounces, slides, or fades without a reason the user would understand if asked.

**Precision over expression.** The fastest interactions are nearly instant. The slowest stay under 500ms. Nothing exceeds 700ms. If an animation feels long, it is wrong.

**Exits are faster than entrances.** When something appears, the user needs a moment to comprehend it. When something disappears, the user already decided it should go. You greet warmly and leave quietly.

**Duration is a function of size and distance.** Larger elements moving further need longer durations, because that is how physics works and the visual system expects physics. This principle is what assigns each matrix row its tier -- a modal is larger and travels further than a dropdown, which is why a modal's entrance sits at `normal` and a dropdown's at `moderate`. Authors do not re-derive it; the row already encodes it.

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

Six curves. Rafters is not a brand -- it is the system a brand is built on, and the curve is where personality lives. A single-brand system correctly ships one curve; a system that others build brands with ships the vocabulary they choose their personality from.

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

## How a component consumes motion

A component does not reference durations, curves, or delays as values, and there are no per-component motion tokens: a set of semantic transition tokens was tried and aborted because it created single-use tokens. Each animated moment of a component is a row in the motion matrix, `packages/ui/docs/spec/matrix/motion.jsonl`, which assigns it a duration tier, a curve role, delays, and an extent from the five generic namespaces (`duration-*`, `ease-*`, `delay-*`, `extent-*`, `period-*`). The component's CSS applies those generics through the utilities the token exporter emits, and the browser does the rest. Studio writes the values. The matrix preamble carries the mechanics vocabulary, the pointer and anchor rules, and presence.

Expand and collapse animate `grid-template-rows` (`0fr` <-> `1fr`), never `height` -- `height: auto` is not transitionable, and a grid row animates on an element that stays present, which sidesteps the fact that `display: none` blocks transitions entirely.

## Combination constraints

These are rules, not values. A cross-parameter rule has no home in any single token -- so instead of leaving them as prose, they live as structured, queryable metadata an agent composing motion can read before it writes the wrong thing. They exist because the number of possible parameter combinations is larger than intuition can navigate.

| Parameter | Rule | Why |
|---|---|---|
| Direction | Horizontal or vertical. **Never diagonal.** | The eye tracks one axis at a time. Axis-aligned movement creates order. |
| Scaling | May combine with movement. | Scale changes state, movement changes position; together they read as arriving at a new size. |
| Opacity | May combine with movement. | Fade plus slide is the standard enter/exit. Fade alone is for elements that do not move. |
| Rotation | Small elements only. **Never combined with another parameter.** | Rotation is visually dominant; combined with translation it is chaos. Isolated, it reads as processing. |
| Timing | Sequential, not simultaneous. | Staggered sequences create narrative. Simultaneous animation is noise. |

### Where the constraints live

The table above is mirrored by machine-readable data and a validator (`packages/design-tokens/src/generators/motion-constraints.ts`), so tooling can read the rule rather than re-deriving it from prose:

- **`MOTION_COMBINATION_CONSTRAINTS`** -- the five constraints as data, each carrying an `id`, `rule`, `rationale`, and a `kind`.
- **`MOTION_GOVERNING_RULE`** -- the rule below, with its three questions and its enforcement posture.
- **`validateMotionComposition(composition)`** -- takes a proposed animation described by the *parameters it engages* (translate axis, scale, opacity, rotation, element size, timing) and returns the constraint violations. An empty list means legal. `isLegalMotionComposition` is the boolean wrapper.

Two splits are deliberate and are recorded in the data itself:

- **Permission vs prohibition.** Only Direction, Rotation, and Timing have teeth -- the validator rejects diagonal movement, rotation combined with anything (or on a large element), and simultaneous timing. Scaling and Opacity are `kind: 'permission'`: they *bless* combining with movement (`scale + move`, `fade + slide`), so the validator never rejects them. A validator that rejected "any two parameters combined" would contradict this spec.
- **Mechanical vs advisory** for the governing rule (below). Its `enforcement` field is `mechanical-presence-advisory-truth`: the validator mechanically requires that a composition *declares* which question it answers, but whether the declared answer is *true* is a human or agent judgment and stays advisory.

**Governing rule -- motion that answers no question does not move.** If an animation does not tell the user what happened, where they are, or what to expect next, it is decorative. This one has teeth: decorative animation measurably impairs recall.[^stokes-2020] `validateMotionComposition` enforces the presence half -- a composition with no declared `answers` is rejected.

### Scope: this validates us, not you

The validator is a tool rafters holds itself to and exposes, **not a gate on consumer code.** Every component rafters ships composes legal motion, and that is the promise. A project built on rafters that composes diagonal movement with rotation gets no error, because policing another team's design decisions is not this system's job -- shipping components that demonstrate the right ones is.

## What gets no motion

Cursor changes. Text colour on validation (the border and ring animate, the text does not). Icon swaps. Badge counts. Scroll position. Breadcrumbs. Beyond this list, what animates and how is the matrix's call: a moment with no row does not move.

## Reduced motion

Motion causes physical harm, not annoyance -- dizziness, nausea, vertigo. Roughly 35% of US adults over 40 have vestibular dysfunction.[^agrawal-2009] Respecting `prefers-reduced-motion`[^w3c-mq5] is an accessibility requirement, and WCAG 2.2 SC 2.3.3 asks for it directly.[^wcag-2.3.3]

The reduced-motion substitutions are **not ours to derive.** WCAG 2.2 governs them; where the standard is specific we follow it rather than reasoning from the perceptual bands.

**Preserved:** hover colour transitions, focus rings, press feedback (opacity/colour, no transform), toggle state (cross-fade, no slide).

**Replaced with cross-fade:** modal, sheet, page, dropdown -- each at a shortened duration.

**Removed:** all transform animation, bounce and overshoot, spinner rotation (becomes pulsing opacity), parallax, ambient motion.

The user opted out of spatial movement, not out of knowing what changed.

## The ceiling rule

Longer than 500ms means one of three things: the element moves too far (break it into steps), the element is too large (cross-fade instead), or the animation is decorative (remove it). The only exception is full-screen transitions in spatially-navigated applications, where 700ms is absolute.

The tier ranges enforce the 500ms ceiling mechanically -- `slow` tops out there and Studio cannot pick past it. Exceeding it requires the why-gate: the override is recorded with a reason, the previous value preserved, and the system remembers it was a conscious decision rather than a default.

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
[^agrawal-2009]: Agrawal, Y., et al. (2009). Disorders of balance and vestibular function in US adults. *Archives of Internal Medicine*, 169(10), 938-944.
[^w3c-mq5]: W3C (2020). Media Queries Level 5: prefers-reduced-motion.
[^wcag-2.3.3]: W3C (2023). WCAG 2.2 SC 2.3.3: Animation from Interactions (AAA).
