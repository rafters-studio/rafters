# Motion matrix

What motion applies to what behaviour. One row per `(component, part, transition)` --
the shape `BehaviorSpec.motion?: MotionMap<Part>` declares ("motion declarations per
(transition, part)", `01-behavior-contract.md:125`).

FIRST SWING. Hand-authored, not generated. A row is filled only where a component spec
already states it, or where exactly one shipped token's property set matches. Everything
else is left blank on purpose -- a blank is a decision still to make, not an omission.

**The grid may only name a token from the vocabulary below.** No archetype names
(`slide-advance`, `indicator-move`, `thumb-travel`, `state-swap`, `value-change`) --
those are holes, listed at the bottom, and inventing a token to fill one is how a class
that compiles to nothing gets shipped.

## Vocabulary -- the 13 shipped semantic tokens

Values are the AGREED baseline (`legion 019f956f`, efficient as neutral default), not the
current emitted output. Two rows disagree with what ships; see Drift below.

| token | tier | curve | properties |
|---|---|---|---|
| `motion-hover` | fast | standard | colors |
| `motion-focus` | micro | linear | ring, shadow |
| `motion-press` | micro | spring-snappy | transform, colors |
| `motion-toggle` | moderate | standard | colors, transform |
| `motion-dropdown-in` | moderate | enter | opacity, transform |
| `motion-dropdown-out` | fast | exit | opacity, transform |
| `motion-modal-in` | normal | enter | opacity, transform |
| `motion-modal-out` | moderate | exit | opacity, transform |
| `motion-sheet-in` | normal | spring-smooth | transform |
| `motion-sheet-out` | moderate | exit | transform |
| `motion-expand` | normal | enter | grid-rows, opacity |
| `motion-collapse` | moderate | exit | grid-rows, opacity |
| `motion-page` | normal | spring-smooth | opacity, transform |

Every `-in`/`-out` pair keeps the shorter exit: greet warmly, leave quietly.

Looping animations -- `spin`, `pulse`, `ping`, `caret-blink` -- are intent-invariant by
ruling and sit OUTSIDE this vocabulary. A spinner is a spinner at every intent. Rows using
them are marked `feedback-loop` and take no token.

### Drift: shipped output disagrees with the agreed baseline

| token | agreed | ships | note |
|---|---|---|---|
| `motion-toggle` | standard | spring-snappy | Contradicts an accepted call: "toggle at standard NOT spring-snappy -- efficient toggle is crisp; friendly is the intent that springs a switch." |
| `motion-sheet-out` | moderate | normal | Undocumented; no ruling records the change. |

Duration tier defaults also shipped at `moderate 200 / normal 300 / slow 400` against an
agreed `250 / 350 / 500`. Unresolved -- do not treat emitted CSS as the source.

## The grid

`travel` is deliberately empty everywhere. Duration is a function of size and distance
(Audi; confirmed by the 30-site study, 8x spread within one intent), and the derivation is
an OPEN SPIKE -- `motion-modal-in` is `normal` because someone decided, not because
anything computed it. The column exists so that when travel lands, the tier follows from it
rather than from this table.

| component | part | transition | token | travel |
|---|---|---|---|---|
| accordion | content | closed -> open | `motion-expand` | |
| accordion | content | open -> closed | `motion-collapse` | |
| accordion | chevron | open <-> closed | `motion-toggle` | |
| collapsible | content | closed -> open | `motion-expand` | |
| collapsible | content | open -> closed | `motion-collapse` | |
| dialog | content | closed -> open | `motion-modal-in` | |
| dialog | content | open -> closed | `motion-modal-out` | |
| dialog | overlay | closed <-> open | | scrim is a separate part; token undecided |
| alert-dialog | content | closed -> open | `motion-modal-in` | |
| alert-dialog | content | open -> closed | `motion-modal-out` | |
| alert-dialog | overlay | closed <-> open | | |
| sheet | content | closed -> open | `motion-sheet-in` | per side |
| sheet | content | open -> closed | `motion-sheet-out` | per side |
| sheet | overlay | closed <-> open | | |
| drawer | content | closed -> open | `motion-sheet-in` | axis y |
| drawer | content | open -> closed | `motion-sheet-out` | axis y |
| popover | content | closed -> open | `motion-dropdown-in` | |
| popover | content | open -> closed | `motion-dropdown-out` | |
| tooltip | content | closed -> open | `motion-dropdown-in` | fade only |
| tooltip | content | open -> closed | `motion-dropdown-out` | fade only |
| hover-card | content | closed -> open | `motion-dropdown-in` | |
| hover-card | content | open -> closed | | no Presence adapter -- unmounts, no exit frame |
| dropdown-menu | content | closed -> open | `motion-dropdown-in` | |
| dropdown-menu | content | open -> closed | `motion-dropdown-out` | |
| context-menu | content | closed -> open | `motion-dropdown-in` | |
| context-menu | content | open -> closed | `motion-dropdown-out` | |
| menubar | content | closed -> open | `motion-dropdown-in` | |
| menubar | content | open -> closed | `motion-dropdown-out` | |
| navigation-menu | panel | closed -> open | `motion-dropdown-in` | |
| navigation-menu | panel | open -> closed | `motion-dropdown-out` | |
| select | content | closed -> open | `motion-dropdown-in` | |
| select | content | open -> closed | `motion-dropdown-out` | |
| select | chevron | open <-> closed | `motion-toggle` | |
| combobox | content | closed -> open | `motion-dropdown-in` | |
| combobox | content | open -> closed | `motion-dropdown-out` | |
| command | content | closed -> open | `motion-dropdown-in` | |
| command | content | open -> closed | `motion-dropdown-out` | |
| date-picker | content | closed -> open | `motion-dropdown-in` | |
| date-picker | content | open -> closed | `motion-dropdown-out` | |
| input | root | focus | `motion-focus` | |
| textarea | root | focus | `motion-focus` | |
| input-group | root | focus | `motion-focus` | |
| input-otp | slot | focus | `motion-focus` | |
| input-otp | caret | idle | feedback-loop | caret-blink |
| button | root | hover | `motion-hover` | |
| button | root | press | `motion-press` | |
| checkbox | indicator | unchecked <-> checked | | swap, not a transition -- token undecided |
| radio-group | indicator | unchecked <-> checked | | |
| toggle | root | off <-> on | `motion-toggle` | |
| toggle-group | item | off <-> on | `motion-toggle` | |
| badge | root | -- | | colour change on a non-interactive surface |
| breadcrumb | link | hover | `motion-hover` | |
| item | root | hover | `motion-hover` | |
| pagination | link | hover | `motion-hover` | |
| scroll-area | scrollbar | hover | `motion-hover` | |
| table | row | hover / selected | | row state is not hover |
| alert | root | -- | | non-interactive |
| skeleton | root | idle | feedback-loop | pulse |
| spinner | root | idle | feedback-loop | spin |

Not listed: components whose matrix motion is `none` -- aspect-ratio, avatar, container,
embed, empty, grid, image, kbd, label, separator, typography, button-group, calendar,
field. They declare no motion and need no rows.

## Holes -- archetypes with no token

Each needs a decision before its rows can be written. Filling one by borrowing the nearest
token is the failure this file exists to prevent.

| hole | components | axis | note |
|---|---|---|---|
| thumb-travel | slider, switch | x | Slider must have NO transition while `dragging` -- the thumb has to track the pointer exactly. A keyboard step on the same part must animate. Same part, opposite motion, decided by state. |
| indicator-move | tabs | x | Active-tab indicator slides between triggers; travel is the distance between them. |
| slide-advance | carousel | x | Index-driven and continuous rather than state-driven. Travel is literally the item width -- the clearest case in the system for duration deriving from distance. |
| value-change | progress | x | Determinate fill. Indeterminate is a `feedback-loop` and separate. |
| expand/collapse on slide/x | sidebar | x | Shares the label with accordion and no mechanism: accordion is grid-rows on y, sidebar is slide on x, and sidebar's mobile overlay mode is a third motion again. |
| shadow-only | card, resizable | -- | `motion-focus` is the only box-shadow token and is focus-named. |
| colour on non-interactive | alert, badge, table | -- | `motion-hover` is the only colour token and is hover-named. |
| state swap | checkbox, radio-group | -- | An instant indicator swap, not a travel. May want no motion at all. |

`motion-page` has no consumer in this table. Thirteen tokens, one unused.

## Open

- **Travel derivation (SPIKE, Sean).** A component declares its travel; duration follows. Travel comes from layout, layout from spacing, spacing from intent. Until that lands every tier above is an assertion.
- **Combination constraints.** `MOTION_COMBINATION_CONSTRAINTS` in `motion-constraints.ts` holds the five parameter rules as queryable data. This grid does not yet reference them; a row combining rotation with translation would be illegal and nothing here would catch it. `validateMotionComposition` is a tool used on ourselves, not an authoring gate.
