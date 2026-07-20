# Component Spec — Tabs

Status: DRAFT. Disclosure article. Ports the imperative
`old/ui/tabs.controller.ts` onto the behavior layer: active-tab selection as
reducer state, focus movement as the composed `roving-focus` primitive.

Files (`src/components/tabs/`):

```
tabs.classes.ts   tabs.behavior.ts   tabs.tsx
tabs.element.ts   tabs.astro
```

Tests mirror into `test/components/tabs/`: `.behavior.test.ts` (pure),
`.classes.test.ts` (parity), `.conformance.test.tsx` (React),
`.element.conformance.test.ts` (WC), `.astro.conformance.test.ts` (Astro).

## Composition

```
tabs slice    state {value}, action activate, root + list + trigger + panel
              parts, tablist/tab/tabpanel roles, orientation aria,
              Enter/Space keymap, instanceAria for the two many parts
```

A single slice — no glue. The score's only state axis is which tab is active;
focus movement across triggers is NOT state, it is ephemeral DOM state owned by
the `roving-focus` primitive (mirroring radio-group and navigation-menu).

Tabs use **automatic activation**: `startTabsRoving` passes roving-focus an
`onNavigate` callback that activates whatever tab focus just landed on, so an
arrow key moves and activates in one gesture. This is the oracle controller's
behavior and the WAI-ARIA APG default for tab sets whose panels already live in
the DOM. It is safe to fire on every move because `activate` is idempotent:
re-activating the active tab returns the SAME state ref, so memory does not
notify and a controlled consumer's callback does not re-fire.

Controlled/uncontrolled per the ownership-of-truth boundary applied to a string
(the same shape as radio-group/navigation-menu): `config.value` is the
consumer's controlled value (passed fresh, never stored); `state.value` is
intrinsic, seeded from `defaultValue`. Projections and the `onValueChange`
callback read the EFFECTIVE value via `activeTab(state, config)`.

## Config, state, actions

```ts
interface TabsConfig {
  value?: string;        // controlled ('' = none active)
  defaultValue?: string; // uncontrolled seed
  orientation?: 'horizontal' | 'vertical'; // default 'horizontal'
}
interface TabsState { value: string | null }  // intrinsic only
type TabsActions = { activate: string }       // tabs never deactivate
```

There is no `canDispatch` gate: unlike radio-group there is no group-level
`disabled`, because a tab set with no reachable panel is not a meaningful
state. Per-trigger `disabled` is handled in the bind/decorator (native
`disabled` on the button, and roving-focus skips disabled items).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `data-orientation` |
| list | always | `role="tablist"`, `aria-orientation` |
| trigger | many | `role="tab"`, `aria-selected` (`'true'`/`'false'`), `aria-controls` (its panel's id), `data-state` (`active`/`inactive`) |
| panel | many | `role="tabpanel"`, `aria-labelledby` (its trigger's id), `data-state`, `hidden` (absent while active) |

`trigger` and `panel` are `many` parts that cross-reference each other by id, so
they project through the score's `instanceAria(part, value, state, config, ids)`
member (Spec 01) rather than bespoke sibling functions — the generic harness
driver `assertInstanceAriaFulfillment` resolves each instance's sibling ids from
the DOM and asserts the projection with no per-component wiring.

`tabindex` is deliberately ABSENT from the trigger projection: roving-focus owns
it as ephemeral DOM state, so it must not appear in a projection the conformance
harness asserts against. The panel's `hidden` IS projected, as a boolean the
harness asserts by presence — React writes `hidden=""` where the DOM-native
binding writes `hidden="true"`.

The trigger projection carries the resolved string `aria-selected: 'false'` in
the common inactive case; the DOM binds apply it with `{ validate: false }` so
aria-manager does not coerce the string `'false'` truthy (Gotcha #2).

Ids are shared across the three performances through `tabsIds(baseId, value)`
(`<base>-tab-<value>` / `<base>-panel-<value>`). React seeds `baseId` from
`useId`, Astro from the author's `id` prop, and the DOM-native bind reads the
resulting ids back off the markup rather than minting its own.

## Keyboard

- `keymap`: Enter/Space on a `trigger` -> `activate`. Declared for the pure
  keymap contract; no performance wires a keydown for it, because the native
  `<button data-part="trigger">` converts Enter/Space to a click (Spec 01
  rule 5) and a second listener would race roving-focus and double-fire.
- Arrow keys (per orientation) and Home/End are NOT claimed by the keymap —
  roving-focus owns them for movement, and automatic activation rides its
  `onNavigate`.
- Roving binds to the `[role="tablist"]` element, never the root. Panels live
  inside the root, so a root-level keydown listener would move tabs while focus
  sits in panel content (asserted in the WC conformance suite).
- Roving's `currentIndex` is seeded to the active tab's position, so Tab enters
  the set at the tab whose panel is showing rather than always at the first.
  Astro additionally renders that roving tabindex server-side, so keyboard order
  is correct before any JS.
- Panels carry `tabIndex={0}`: after choosing a tab, Tab moves from the trigger
  into the panel, which is how a keyboard user reaches panel content.

## Oracle dispositions (`src/old/ui/tabs.*`)

| Oracle feature | Disposition |
| --- | --- |
| single-select, NOT collapsible (re-click keeps the tab active) | contract |
| automatic activation: arrows move focus AND activate | contract |
| roving bound to the tablist, not the root | contract |
| roving `currentIndex` seeded to the active tab (`startIndex`) | contract — preserved here, unlike radio-group which dropped it |
| click activates and focuses the clicked trigger | contract |
| `aria-selected` / `data-state` reflection on triggers | contract |
| panel `hidden` + `data-state` reflection; panels stay in the DOM | contract |
| `aria-controls` / `aria-labelledby` trigger-panel cross-reference | contract |
| focusable panels (`tabIndex=0`) | contract |
| disabled triggers excluded from activation and skipped by roving | contract |
| controlled/uncontrolled + `onValueChange` (React) | contract |
| shadcn namespaced surface (`Tabs.List`/`Trigger`/`Content`) plus the named exports | contract |
| Astro SSR roving tabindex (`tabindex={defaultChecked ? 0 : -1}`) | contract |
| `createSelectionGroup` primitive for single-select state | framework-affordance — expressed instead as reducer state (`{ value }`), the behavior-layer equivalent, exactly as radio-group and navigation-menu express their selection. The score's projections are asserted against `createBehavior`'s memory, and `createSelectionGroup` owns a separate `createMemory` cell with no seam to inject as the score's store; composing it would create a second, invisible source of truth |
| React context carrying only `baseId`, with the controller mounted through a callback ref | framework-affordance — replaced by the retained-mode controller (`createBehavior` + `useMemory`), so React reads the projections declaratively instead of letting an imperative controller write attributes React does not know about |
| Astro multi-file surface (`tabs-list.astro` / `tabs-trigger.astro` / `tabs-content.astro`) with `<slot />` panel bodies | framework-affordance — collapsed into one props-driven `tabs.astro`, matching every merged Astro performance (radio-group, navigation-menu). Astro requires static slot names, so a per-value panel slot is not expressible; rich panel bodies belong to the React and WC performances |
| Astro config attributes `data-rafters-tabs` / `data-tabs-id` / `data-default-value` | dropped — the bind reads its config from the part markup itself (`[data-part="list"]`'s `aria-orientation`, and the server-rendered `[data-state="active"]` trigger), so there is no parallel config channel to drift |
| `TabsController.setValue(value)` and the exposed `controller.group` cell | dropped — the imperative escape hatch is replaced by the controlled `value` prop in React; the WC and Astro performances are uncontrolled by design, as with radio-group and toggle-group |
| horizontal-only navigation | improved — `orientation` is a rafters extension over the oracle, projecting `aria-orientation` on the rail and switching roving to the vertical axis. The oracle hardcoded `'horizontal'` |
| root classes applied in Astro only (`tabsRootClasses`), React root left unstyled | defect-do-not-port — `tabsClasses().root` is now painted by all three performances, so the layout does not depend on which framework rendered it |

## Deltas from the oracle

1. `orientation` is new: the rail projects `aria-orientation` and roving moves on
   the matching axis. Default `'horizontal'` preserves oracle behavior exactly.
2. The React root now paints the root classes the oracle applied only in Astro.
3. Selection is reducer state read through `instanceAria`, not an imperative
   `createTabs` controller writing attributes behind React's back.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="tablist"` with `aria-orientation`, per-trigger
  `role="tab"` + `aria-selected` + `aria-controls`, and per-panel
  `role="tabpanel"` + `aria-labelledby`, asserted against real DOM by the
  harness in all three performances.
- 2.1.1 Keyboard: arrows (per orientation) and Home/End move and activate;
  Enter/Space activate the focused tab; disabled triggers are skipped.
- 2.4.3 Focus Order: roving tabindex keeps exactly one trigger in the tab order,
  seeded to the active tab; Tab then moves into the focusable panel.
- 2.4.7 Focus Visible: token focus ring on both the trigger and the panel
  (`focus-visible:ring-ring`).
- 2.3.3 Animation from Interactions: the indicator-move transition is opted out
  by `motion-reduce:transition-none`.
- Inactive panels are `hidden`, so AT never reaches the content of a tab the
  user did not choose.

## Motion

`indicator-move: transition, axis x` — the active pill travels along the rail's
main axis as `data-state` swaps. Declared as intent only; duration and easing
come from tokens (`transition-all duration-200`), and `motion-reduce` removes
the transition entirely.
