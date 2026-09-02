# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Line chart component (#2226).** The second chart-type mark on the same
  cartesian machinery Bar (#2225) proved out: one path per series
  (`computeLinePoints`/`buildSeriesPath`), shadcn-API parity -- a composed
  `<Line dataKey="desktop"/>` child per series (its own behavior + three
  decorators, absence by omission like Bar's `<Bar>`) derives the series
  list in declaration order and takes precedence outright over the `series:
  string[]` config prop, which still works fully on its own; categoryKey
  lives on the composed `<XAxis dataKey>` child, same as Bar. `smooth`
  toggles `linePath` (straight segments, default) vs `smoothPath`; `dots`
  (default true) renders one point marker per datum. A LineChart with no
  XAxis/YAxis/CartesianGrid children composed renders axis-less BY
  OMISSION -- the #2230 StatTile sparkline shape -- with no `minimal`/
  `axisless` prop anywhere; an unresolvable category key spreads points by
  row index rather than collapsing them onto one position, so a sparkline
  with no `<XAxis>` still plots real geometry. `smoothPath` (`graph.ts`) is
  now a direct port of d3-shape's `curveMonotoneX` (Fritsch-Carlson/Steffen
  monotone cubic) rather than a Catmull-Rom conversion -- what rafters
  `smooth` means by shadcn/Recharts `type="monotone"` (ruling 2026-09-01):
  it never overshoots the data between two points, unlike the interpolation
  it replaces. Line/dot color is `stroke-chart-N`/`fill-chart-N`, resolved
  from `ChartConfig` exactly like Bar's `fill-chart-N`. Line-enter motion is
  declared as one matrix cell (`docs/spec/matrix/motion.jsonl`) -- a fade
  (opacity) rather than a stroke-dashoffset reveal, since a dashoffset
  keyframe would need a per-instance path-length value nothing in the
  system names. Reuses the SAME pinned accessible structure Bar
  established: `<figure role="figure">`, `aria-hidden` SVG, keyboard active-
  datum cursor (arrows/Home/End, `sr-announcer`), always-present data-table
  fallback.
- **Bar chart component (#2225).** The first real chart-type mark on top of
  ChartContainer/XAxis/YAxis/CartesianGrid (#2224): grouped and stacked bar
  geometry computed via `bandScale`/`linearScale` (`computeBars`), shadcn-API
  parity -- a composed `<Bar dataKey="desktop"/>` child per series (its own
  behavior + three decorators, absence by omission like XAxis/YAxis/
  CartesianGrid) derives the series list in declaration order and takes
  precedence outright over the `series: string[]` config prop, which still
  works fully on its own with no `<Bar>` children composed; categoryKey lives
  on the composed `<XAxis dataKey>` child, never a chart-level prop. Pins
  the accessible chart structure the family copies: a `<figure role="figure">`
  groups an `aria-hidden` SVG (never `role="img"`, which would make its
  descendants presentational) with a keyboard-driven active-datum cursor
  (arrows/Home/End, announced via `sr-announcer`) and an always-present
  visually-hidden data-table fallback. Bar-enter motion is declared as two
  layout-specific matrix cells (`docs/spec/matrix/motion.jsonl`) rather than
  hand-written classes -- `scaleY` from the value-axis baseline in the
  default vertical layout, `scaleX` from the same baseline once
  `layout: 'horizontal'` swaps the value axis, selected by
  `bar-chart.classes.ts`'s `resolveBarEnterClass`, never a numeric or a
  runtime CSS variable computed outside the matrix. `BehaviorSpec.motion`
  itself stays spec-reserved but unimplemented pending #1990.
- **Card meets the shadcn replacement requirement (#2019).** `data-slot` now
  lands on every node in all three performances (`card`, `card-header`,
  `card-title`, `card-description`, `card-action`, `card-content`,
  `card-footer`), so a consumer's `has-data-[slot=…]` selectors keep matching
  after the import swap; `data-part` stays the internal binding contract and
  remains root-only. `CardHeader` becomes a grid
  (`auto-rows-min grid-rows-[auto_auto]` with
  `has-data-[slot=card-action]:grid-cols-[1fr_auto]`), which is what makes
  `CardAction`'s placement utilities do anything -- they were carried forward
  from the oracle and had been inert against a `flex flex-col` parent in every
  framework. The Astro sub-components return as importable files
  (`card-header.astro`, `card-title.astro`, `card-action.astro`,
  `card-content.astro`, `card-footer.astro`), so an Astro tree composes exactly
  like the React tree; `card.astro`'s named slots stay as a convenience, and a
  slot region is now rendered only when that slot has content, so the two ways
  of filling a Card cannot collide. Note the accessibility scope: `CardTitle`
  renders a real heading and `CardDescription` a real `p` where the component
  owns the element (React, and the new `card-title.astro`); `card.astro`'s named
  slots and the web component wrap slotted content in class-only `div`s, so
  there the consumer supplies the tag and should pass a real heading.

### Changed

- **Card adopts shadcn v4 spacing, which changes existing rendering (#2019).**
  The root carries the vertical rhythm (`flex flex-col gap-6 py-6`) and each
  part only its horizontal inset (`px-6`), replacing the per-part `p-6 pt-0`;
  the panel is `rounded-xl`, not `rounded-lg`. Arbitrary children dropped
  straight into a Card now get the same rhythm as the declared parts, which is
  the point. Card's semantic typography role tokens (`text-title-medium`,
  `text-body-small`) are kept over shadcn's raw `font-semibold`/`text-sm`.

### Removed

- **The snapshot-history track is retired from `primitives/editor/` and the
  registry (#2240, folding #2239, closing #2220).** `history.ts`
  (`createHistory`) and `block-handler.ts` (`createBlockHandler`, zero
  importers, no test) are deleted outright, along with `hooks/use-history.ts`
  and its barrel export -- measured before deletion, `use-history` had no
  consumer outside its own test and the `hooks/index.ts` barrel, and that
  barrel itself had no in-repo importer. `document-editor.ts`
  (`createDocumentEditor`) is retired from the registry the same way but not
  deleted from disk: `src/old/ui/editor.tsx` (the quarantined pre-rewrite
  surface) still imports it, and that file's public types are re-exported
  from the package root as a type-only import, which pulls it -- and
  therefore `document-editor.ts` -- into every `tsc` run regardless of
  tsconfig's `src/old` exclude. It moves to `src/old/ui/document-editor.ts`,
  next to its one remaining caller, stripped of its `@registry-*` tags so it
  is no longer a registry item. The editor's op-based history
  (`components/editor/editor-history.ts`, RULING-EDITOR-HISTORY) was already
  the only history the live editor component used; all three primitives were
  dead weight the registry still served, and `document-editor` was the #2220
  case specifically: installing it stood up a primitive whose own import
  reached into `components/editor/editor-history`, a component-layer path the
  primitive-install flattening never rewrote, so the install always shipped a
  dangling import. `rafters add document-editor` (or `block-handler`,
  `history`) now reports not-found instead. `rafters add editor` is
  unaffected -- the live editor component never depended on any of the
  three.

- **BREAKING: Card no longer accepts `className` (or `class` in Astro), on the
  root or on any of the seven sub-components (#2019).** The one deliberate API
  break in the drop-in contract, and the thesis rather than an oversight:
  design travels through token props (`fill`, `as`), which are checkable and
  cascade with the token layer; a class escape hatch is how design gets
  re-decided at every call site, and agents do not do design. Enforced twice --
  the props types `Omit` it so a TypeScript caller is refused at compile time,
  and every performance strips it at runtime so a `{...props}` spread cannot
  smuggle it onto the element. A migrating shadcn card tree that passes
  `className` will fail to compile, and there is no longer a compact-card
  padding override; a card that needs different spacing needs a token prop.

- **`input-group` ported to the behavior layer (#1778).** The oracle's
  shadow-DOM element pair (`<rafters-input-group>` +
  `<rafters-input-group-addon>`) collapses into one light-DOM enhancer over a
  single score (`input-group.behavior.ts`). The group is a WRAPPER, not a value
  owner: the contained native control keeps its value, caret, IME, and form
  participation, so the score has no state axis, no actions, and no keymap --
  the `field` shape, applied to the text-input family. It projects validity onto
  the control (`aria-invalid`, omitted when valid so a contained `Input` stays
  the single authority) plus `data-state` on the root, which is what draws the
  border. Affix position becomes two declared parts (`addonStart`/`addonEnd`),
  so the harness asserts `data-position` identically in React, the Web
  Component, and Astro. One behavioral correction: the oracle propagated
  `disabled` unconditionally and silently re-enabled an individually disabled
  control, so propagation is now an OR (`isControlDisabled`) and reaches every
  disableable descendant, affix buttons included. `form-value` and
  `input-events` are dispositioned not-ported (see
  `docs/spec/components/input-group.md`).

- **`tabs` ported to the behavior layer (#1799).** The imperative
  `old/ui/tabs.controller.ts` and its four-file Astro surface are replaced by a
  single score (`tabs.behavior.ts`): the active tab is reducer state
  (`{ value }`), focus movement is the composed `roving-focus` primitive bound
  to the tablist, and the `trigger`/`panel` many-parts cross-reference each
  other through the score's `instanceAria` member. `bindTabs` is the DOM-native
  client the WC and Astro performances share; React reads the projections
  declaratively. Automatic activation (an arrow key moves focus AND activates)
  and the roving cursor seeded to the active tab both carry over from the
  oracle. `orientation` is new: the rail projects `aria-orientation` and roving
  moves on the matching axis, defaulting to horizontal (see
  `docs/spec/components/tabs.md` dispositions).

- **`radio-group` ported to the behavior layer (#1787).** The imperative
  `old/ui/radio-group.controller.ts` + form-associated WC pair are replaced by a
  single score (`radio-group.behavior.ts`): selection is reducer state
  (`{ value }`), focus movement is the `roving-focus` effect, and the `item`
  many-part projects `aria-checked`/`data-state` per instance via
  `radioItemAria`. `bindRadioGroup` is the DOM-native client the WC and Astro
  performances share; React reads the projections declaratively. Selection now
  follows focus (WAI-ARIA APG: an arrow key moves focus AND selects), improving
  on the old move-only controller. Form association via ElementInternals is
  deferred to the not-yet-built `form-value` primitive; `name`/`required`
  survive as an inert surface (see `docs/spec/components/radio-group.md`
  dispositions).

### Changed

- **`alert` migrated to the static pattern; `useBehavior` deleted (#1827).**
  Alert was the last component still calling the `useBehavior` React adapter.
  Its score is a pure static -- constant `role="alert"`, no state or effects,
  and its aria projection ignores ids -- so the controller now computes the
  projection directly, the same config-in/classes-and-aria-out shape as
  container and card. With alert migrated, `hooks/use-behavior.ts` is removed;
  its one surviving utility, `keyInputOf` (React `KeyboardEvent` -> contract
  `KeyInput`), moves to `hooks/key-input.ts`. Every framework file now composes
  the substrate directly -- no shared per-framework adapter remains.

### Added

- **Switch ported to the behavior layer (#1797).** One score
  (`switch.behavior.ts`: the toggle-family checked axis -- its own slice, not a
  fold of `pressable`, projecting `role="switch"` + `aria-checked` +
  `data-state:checked|unchecked` over a `thumb`, with the disabled gate on
  `toggle` and a pure `switchFormValue` projection for the name/value/required
  form axis -- plus `bindSwitch` the DOM-native client) decorated by three thin
  performances (React `.tsx`, WC `.element.ts`, Astro `.astro`), all driving the
  same `bindSwitch`. The root is a native `<button role="switch">`, so
  Enter/Space activation is fulfilled by the browser as a click and the bind
  wires click -> toggle only -- no keydown branch to double-fire against the
  native click. Controlled/uncontrolled follows the same ownership-of-truth
  boundary as input: `config.checked` shadows the intrinsic `state.checked`
  seeded from `defaultChecked`, and projections read the effective value. The
  shadcn drop-in surface (`checked`/`defaultChecked`/`onCheckedChange`) and the
  rafters extensions (`variant`, `size`, `value`, `name`, `required`) are both
  preserved. React + WC + Astro conformance green.

- **Popover ported to the behavior layer (#1785).** One score
  (`popover.behavior.ts`: the disclosable open axis plus surface and popover glue
  -- `role="dialog"`, aria wiring, Escape and outside-dismiss that spare the
  trigger and anchor -- plus `bindPopover` the DOM-native client) decorated by
  three thin performances (React `.tsx`, WC `.element.ts`, Astro `.astro`), all
  driving the same `bindPopover`. A non-modal overlay: focus moves to the panel
  on open with no focus-trap and no scroll-lock. Anchored positioning is composed
  by the clients from the `collision-detector` primitive (a DOM concern the effect
  vocabulary deliberately does not carry), so the placement decision lives once in
  `positionPopover` and resolved side/align stay ephemeral DOM state the score
  never projects. The full shadcn surface is preserved --
  Root/Trigger/Anchor/Portal/Content/Close, the `PopoverRoot` alias, auto-portal
  versus explicit `Portal`, and the
  `onEscapeKeyDown`/`onPointerDownOutside`/`onInteractOutside` veto protocol.
  React + WC + Astro conformance green.

- **Progress ported to the behavior layer (#1786).** One score
  (`progress.behavior.ts`: `resolveProgress` as the single computation plus the
  progressbar aria projection, and `bindProgress` the DOM-native client the WC
  and Astro performances share) decorated by three thin performances (React
  `.tsx`, WC `.element.ts`, Astro `.astro`), all driving the same `bindProgress`.
  Progress is a static score -- no state, no actions, no keymap, no effects --
  but unlike Container/Card its ARIA is LIVE: the `root` part projects
  `role="progressbar"` with `aria-valuemin`/`max`/`now`/`text`, so the harness
  audits the projection here. `value` is CONFIG, not state (the consumer's datum,
  immutable from the score's view; the WC re-reads it on attribute change, React
  re-renders on prop change). Indeterminate (value absent or non-finite) omits
  `aria-valuenow`/`aria-valuetext` and carries `aria-busy="true"`. The three
  oracle a11y approaches (old React/Astro sr-only native `<progress>` + visual
  div; old WC `role="progressbar"`) unify on one projected progressbar -- the WC
  oracle's approach, equivalent screen-reader semantic without a duplicate node.
  shadcn-compat base (`value`/`max`) and rafters extensions (`variant`, `size`,
  `getValueLabel`) both preserved. React + WC + Astro conformance green.
- **ScrollArea ported to the behavior layer (#1789).** The pure-static finding
  Card and Container record, reached again: the oracle
  (`src/old/ui/scroll-area.tsx`) was CSS-only -- no handlers, no state, no
  scroll-position tracking -- so the score (`scroll-area.behavior.ts`) holds no
  state, no actions, no keymap, no effects, and projects an empty ARIA contract.
  Native scroll owns every semantic (momentum, keyboard scrolling, focus order),
  which means there is no `bindScrollArea`: the React performance uses no
  `useBehavior`/`useMemory`, the Astro performance ships no `<script>`, and the
  Web Component performs no binding. The three decorators are the thinnest
  possible -- markup + `scroll-area.classes.ts` (base surface, WebKit scrollbar,
  orientation overflow switch) + slots. The shadcn-compatible base (vertical /
  horizontal orientation, decorative `ScrollBar` companion) is preserved, with
  the rafters `both`-axis orientation extension layered on top. React + WC +
  Astro conformance green, each asserting the one static contract (root renders,
  projects no ARIA).

- **Tooltip ported to the behavior layer (#1803).** One score
  (`tooltip.behavior.ts`: reducers, aria/keymap projections, empty effects, plus
  `bindTooltip` the DOM-native client) decorated by three thin performances
  (React `.tsx`, WC `.element.ts`, Astro `.astro`), all driving the same
  `bindTooltip`. The disclosable trigger projection
  (`aria-expanded`/`aria-controls`) is suppressed and replaced with
  `aria-describedby` -- a tooltip describes, it does not expand. Hover-intent
  timing and collision-detected positioning are composed by the clients from the
  `hover-delay` and `collision-detector` primitives (DOM concerns the effect
  vocabulary deliberately does not carry); the placement decision lives once in
  `tooltipPlacement` / `positionTooltipContent`. Escape dismiss added to satisfy
  the WAI-ARIA tooltip pattern -- and dismissal dispatches `close` to the score
  directly, so a `defaultOpen` tip with no prior hover still closes. React + WC +
  Astro conformance green.

- **Select, ported to the behavior layer (#1790).** The `menu-collection-popup`
  archetype: navigation-menu's compound combobox/listbox/option ARIA over
  dialog's overlay effects. One score slice carries `{open, value, highlighted}`
  (open/value controlled-shadowed; `highlighted` mirrors DOM focus so exactly
  one option is ever active), with `bindSelect` -- the DOM-native client the WC
  (`select.element.ts`) and Astro (`select.astro`) performances share -- and the
  React decorator preserving the full shadcn drop-in surface plus the `Select.*`
  namespace. `typeahead` joins the closed effect vocabulary (its executor wraps
  the existing typeahead primitive; roving-focus is the precedent), so all three
  performances get type-to-search for free. The oracle's `labelVersion` label
  registry is dropped -- the listbox lives in light DOM present-but-hidden, so
  the value text reads the selected option directly. A new `form-value` primitive
  (a pure mirrored-hidden-input attrs builder) adds the form association the old
  select lacked. React + WC + Astro conformance green (aria + keymap against
  rendered DOM); behavior and classes-parity suites join.

- **Button, re-done on the settled behavior-layer pattern (#1823).** The score
  gains `bindButton` -- the DOM-native client the WC and Astro performances
  share -- proving the pattern reaches the simple-interactive archetype. The
  React controller drops `useBehavior` (createBehavior + useMemory +
  useBehaviorEffects). The native `<button>` fulfills Enter/Space as a click,
  so the bind wires click -> press only (no keydown branch); a suppressed press
  (disabled/loading/soft-disabled) cancels the default. The `announce`
  (loading) effect is edge-triggered: a button rendered already-loading
  projects `aria-busy` but does NOT announce -- the DOM-native bind proves that
  baseline suppression, the runtime loading transition is proven in the
  retained-mode (React) suite. `button.element.ts` (WC) and `button.astro`
  join. React + WC conformance green; Astro built (toolchain lands with the
  astro wave).

- **Dialog, three-framework performances on the settled pattern (#1821).** The
  score gains `bindDialog` -- the DOM-native client the WC and Astro performances
  share -- proving the pattern extends to the two overlay concerns: presence
  (content/overlay present-but-hidden so effects read light DOM) and the ongoing
  effects runner (focus-trap, scroll-lock, dismiss). The React controller drops
  `useBehavior` (createBehavior + useMemory + useBehaviorEffects; getPart by id
  since content portals; presence only for the unguarded cross-ref sources).
  `dialog.element.ts` (WC) and `dialog.astro` join. React + WC conformance green;
  Astro built (toolchain lands with the astro wave).

- **Card ported to the behavior layer -- the composition archetype, three
  frameworks.** `Card`/`CardHeader`/`CardTitle`/`CardDescription`/
  `CardContent`/`CardFooter`/`CardAction` land across React, the
  `<rafters-card>` web component, and Astro. Card is a pure static: its score
  (`card.behavior.ts`) projects no ARIA, holds no state, runs no effects --
  so there is nothing to bind. There is no `bindCard`, the React controller
  uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
  and the web component performs no binding. The finding: a pure static's
  framework files are the thinnest possible -- markup + classes + slots. The
  `fill` signature replaces the default `bg-card` surface (colour vocabulary,
  #1637); the deprecated `background` prop and all editor/block/interactive
  props from the oracle are dropped. shadcn's Card family is a drop-in match.
  Conformance runs across React + WC via the shared harness; the Astro file
  SSRs the same `cardClasses` projection.
- **Input ported to the behavior layer -- the text-input archetype across
  three frameworks.** `input.behavior.ts` carries the score (a VALUE-primary
  control: `config.value` controlled/shadows, `state.value` intrinsic seed
  from `defaultValue`, effective read via `effectiveValue`) plus `bindInput`,
  the DOM-native client the `<rafters-input>` web component and the Astro
  `<script>` both perform. React (`input.tsx`) is a thin, drop-in shadcn
  `<input>` surface: it spreads props, composes the consumer's `onChange`, and
  reads the projection declaratively -- no `useBehavior`. `setValue` is gated
  by `disabled`/`readonly`; `onValueChange` fires on a real change comparing
  effective-before against intrinsic-after (so a controlled field still reports
  every edit). The score projects `aria-invalid` (always `true`/`false`),
  `aria-required`, `aria-describedby` to an error id, and `data-state`; it has
  NO effects and NO keymap -- the native `<input>` owns caret, IME, and
  selection -- making this the simplest bind in the family (value-sync + aria).
  React and WC are conformance-verified against the shared harness; `input.astro`
  ships but is unverified (no Astro test harness yet). See
  `docs/spec/components/input.md`.
- **Grid re-done on the settled behavior-layer pattern (React + WC + Astro).**
  `Grid` now carries the full three-framework surface: the score plus its
  DOM-native client `bindGrid(root)` live in `grid.behavior.ts`, the
  `<rafters-grid>` web component (`grid.element.ts`) and the Astro performance
  (`grid.astro`) both import that one client, and the React controller
  (`grid.tsx`) drops `useBehavior` for `createBehavior` + `useMemory` +
  `useBehaviorEffects`. Behavior is unchanged: presentation grids stay silent
  furniture (no role), and an honest `role="grid"` still engages the 2D
  grid-roving keyboard contract (Left/Right by 1, Up/Down by columns,
  Home/End). The `role="grid"` opt-in attribute is `grid-role` on the WC/Astro
  host (a bare `role` collides with the platform attribute and trips axe
  before the row/gridcell children exist); the binding projects the real
  `role="grid"` once the structure is present. The shared `grid-roving`
  executor now resolves the focused cell via `getRootNode()` rather than
  `document.activeElement`, so it pierces a shadow tree correctly (identical
  in light DOM).
- **Badge ported to the behavior layer.** `Badge` (React) is now a static
  score (`badge.behavior.ts` + `badge.classes.ts` + `badge.tsx`), imitating
  Container: no state, no actions, no keymap, no motion block. Full oracle
  variant vocabulary preserved (`default | primary | secondary | destructive
  | success | warning | info | muted | accent | outline | ghost | link`),
  plus the `sm | default | lg` size scale. `asChild` is not carried forward
  yet -- deferred, see `docs/spec/components/badge.md`. WC/Astro bindings
  not yet written.
- **Alert, ported to the behavior layer.** `Alert`/`AlertTitle`/`AlertDescription`/
  `AlertAction` join the new behavior-layer tree as the second sweep static
  (imitating Container). `role="alert"` is projected unconditionally by the
  score; the nine-variant severity vocabulary carries forward from the
  oracle with one fix -- each subtle background now pairs with its OWN
  subtle-foreground token instead of the solid variant's foreground, which
  was contrast-tuned for the solid fill. shadcn's `Alert`/`AlertTitle`/
  `AlertDescription` surface is a drop-in match; `AlertAction` is an
  oracle-only addition carried forward unchanged.
- **Container grid placement.** Container now accepts `colSpan` (1-12) and
  `rowSpan` (1-3), the same span vocabulary as `Grid.Item`. A Container placed
  directly inside a `Grid` can carry its own placement, so content no longer
  needs a `Grid.Item` wrapper. Available across all three render targets
  (React, Astro, and the `<rafters-container>` web component via `col-span` /
  `row-span` attributes).
