# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Astro and Web Component performances for `alert` (#1805, #1806).**
  `alert.astro` and `alert.element.ts` join the React performance over the
  existing `alert.behavior.ts` + `alert.classes.ts`, leaving alert with all
  three targets. Both are thin: they read the root decoration from
  `alertClasses` and paint `role="alert"` from `alert.aria(...)` rather than
  restating it, so the contract stays in the score. Composition follows the
  card/empty shape for a multi-region static -- fixed `title`/`description`/
  `action` slot regions plus a default slot, with only the root as a declared
  part -- which replaces the oracle's three-file Astro split
  (`alert.astro` + `alert-title.astro` + `alert-description.astro`) and its
  WC that had no sub-component surface at all. The WC keeps the oracle's
  `variant` attribute and its silent fall-back to `default` on an unknown
  value. Astro and the WC render the title region as a `div` rather than
  React's `h5`: a bind-free static cannot omit an unfilled region, and an
  always-present empty heading is an axe violation -- the same disposition
  card and empty record. `[&>svg]` icon positioning does not reach a slotted
  SVG inside the shadow root, so `<rafters-alert>` does not position the
  consumer's icon; see `docs/spec/components/alert.md` for why that is
  dropped rather than fixed. React's `AlertTitle`/`AlertDescription`/
  `AlertAction` gain the `data-slot` markers card and empty already carry, so
  the three performances name the same regions.

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
