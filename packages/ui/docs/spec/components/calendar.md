# Component Spec — Calendar

Status: PORTED (wave-3). Archetype: simple-interactive (imitates button; adds a
grid-navigated day surface). Ships React + Web Component + Astro.

Files (`src/components/calendar/`):

```
calendar.classes.ts   calendar.behavior.ts   calendar.tsx   calendar.element.ts   calendar.astro
```

Tests mirror into `test/components/calendar/`: behavior (pure), classes parity,
and conformance across React + WC + Astro via the shared harness.

## Composition

```
memory (createBehavior)   the single reactive cell: currentMonth, focusedDate, selected
keyboard-handler          grid navigation keys -> dispatched actions (createKeyboardHandler)
pure helpers              date math, month-grid layout, key->date, selection transitions
```

- `keyboard-handler` is composed directly for the movement and activation keys.
  The `keymap` projection is the pure claim record (Spec 01); the bind computes
  the payload (the target date via `dateForKey`, the selection via
  `nextSelection`), the shape slider proves.
- `roving-focus` is deliberately **NOT** composed, and this is the primitive that
  could not express the behavior. `createRovingFocus` owns a roving tabindex over
  a **fixed** DOM item list and clamps at the edges (grid mode does not wrap). A
  calendar's arrow keys must instead **cross the month boundary** — ArrowRight on
  the last day of a month moves focus to the first day of the *next* month and
  re-renders the whole grid (the WAI-ARIA date-grid pattern; oracle lines
  271-282). So `focusedDate` is genuine **score state** (it survives the
  re-render and decides which cell is tabbable), not the ephemeral roving state
  it is in radio-group/tabs — the relationship inverts. The bind owns the single
  tabstop from `tabbableDate(state, config)`. Re-expressing this over
  roving-focus would require intercepting the clamp and duplicating month math,
  the exact local half-solution Spec 05 forbids.
- Selection is score state with a **controlled shadow** (slider's
  ownership-of-truth boundary): `config.selected` shadows `state.selected`,
  effective via `effectiveSelected`. WC and Astro have no reactive prop, so their
  intrinsic state is seeded from the server markup (`data-selected`) and drives
  selection with no consumer.

Unlike radio-group (a fixed item set the bind only re-projects), the calendar's
day cells **change** when the month changes, so `bindCalendar` OWNS grid
construction: `renderDays` rebuilds the `[data-part="grid"] tbody` from
`buildMonthGrid` on every render. The server markup is the pre-JS first paint;
after bind, the bind is the single source of the visible cells. The day cell's
class string is authored in `calendar.classes.ts` and handed to the bind via
`data-day-class` on the grid, so `behavior.ts` never imports the view yet the
bind-built cells paint identically to React's.

## Config, state, actions

```ts
type CalendarMode = 'single' | 'multiple' | 'range';
type ISODate = string; // local yyyy-mm-dd, timezone-free by construction

type CalendarSelection =
  | { mode: 'single'; date: ISODate | null }
  | { mode: 'multiple'; dates: ISODate[] }
  | { mode: 'range'; from: ISODate | null; to: ISODate | null };

interface CalendarConfig {
  mode: CalendarMode;
  selected?: CalendarSelection;        // controlled
  defaultSelected?: CalendarSelection; // uncontrolled seed
  defaultMonth?: ISODate;
  fromDate?: ISODate; toDate?: ISODate; // serializable disabled bounds
  showOutsideDays: boolean;             // default true
  fixedWeeks: boolean;                  // default false
  weekStartsOn: 0|1|2|3|4|5|6;          // default 0 (Sunday)
  today: ISODate;                       // injected for a deterministic projection
}

interface CalendarState {
  currentMonth: ISODate;        // first of the visible month
  focusedDate: ISODate | null;  // the keyboard tabstop; null before entry
  selected: CalendarSelection;  // intrinsic (shadowed by config.selected)
}

type CalendarActions = {
  focusDate: ISODate;             // move focus; syncs currentMonth to its month
  shiftMonth: number;             // page the visible month (prev/next controls)
  setSelected: CalendarSelection; // commit an already-computed selection
};
```

`today` is config, not `new Date()` read inside a projection: it keeps `aria()`
and `dayAria()` **total functions** the conformance harness can compare against
the DOM. The React decorator computes a stable default once via `useState`;
tests pin `today` and `defaultMonth`. The date math lives in exported pure
helpers (`buildMonthGrid`, `dateForKey`, `nextSelection`, ...), never in a
reducer — a reducer gets no config, and the math needs `weekStartsOn`/bounds.

## Parts and ARIA

| Part | Role | ARIA / attributes |
| --- | --- | --- |
| root | — | container; carries the config `data-*` the bind reads |
| prev | — | `<button type=button>`, `aria-label="Go to previous month"` |
| next | — | `<button type=button>`, `aria-label="Go to next month"` |
| heading | — | month label; `aria-live="polite"`, `aria-atomic="true"` |
| grid | `grid` | `aria-labelledby` -> heading id; `aria-multiselectable="true"` (multiple mode only) |
| day (many) | `gridcell` | `aria-selected`, `aria-disabled` (bounds), `aria-current="date"` (today), `data-today`/`data-selected`/`data-in-range`/`data-outside`/`data-disabled` |

The day is a **focusable `<td role="gridcell">`**, not a `<button>`: it is the
WAI-ARIA date-grid pattern and it keeps `aria-selected` on a role that allows it
(a `button` does not, so the oracle's `aria-selected` on a `<button>` was an
`aria-allowed-attr` hazard). `tabindex` is ephemeral DOM state owned by the bind
(one `0`, the rest `-1`), so it is deliberately absent from the projection the
harness asserts. Blanked cells (`showOutsideDays=false`) are inert `gridcell`s
with no `data-value` — the instance-ARIA driver keys off `data-value` and skips
them.

The score's `aria-disabled` projection reflects the serializable
`fromDate`/`toDate` bounds only; the React `disabled` predicate (below) is a
React-only affordance layered on top of that projection in the decorator, so the
score's total function stays serializable and the WC/Astro paths keep the bounds
alone. Known limitation (LOW): shown outside-month days are visually muted
(`data-outside`, `opacity-50`) and functionally inert (click blocked, never a
tabstop) but carry no `aria-disabled`, so a screen-reader user gets no non-visual
equivalent of the muting; `aria-disabled` is not projected for outside status
because the score cannot express it without diverging from the harness's
projection-equality check. Not axe-flagged.

## Keyboard

| Key | Action |
| --- | --- |
| Arrow Left/Right | focus -/+ one day (crosses month) |
| Arrow Up/Down | focus -/+ one week (crosses month) |
| Home / End | first / last day of the focused month |
| PageUp / PageDown | previous / next month (same day) |
| Shift+PageUp / Shift+PageDown | previous / next year |
| Enter / Space | select the focused day |
| click on prev/next | page the visible month |

`keymap` claims `focusDate` for the movement keys and `setSelected` for
Enter/Space on a `day` part; the bind resolves the target from the focused cell
(or `tabbableDate` when the grid is entered fresh) and moves DOM focus after the
re-render.

## Oracle dispositions (src/old/ui/calendar.tsx)

| Oracle feature | Disposition |
| --- | --- |
| single / multiple / range selection | contract |
| controlled selection + onSelect | contract (extended: intrinsic state + controlled shadow, so WC/Astro select without a consumer) |
| currentMonth / focusedDate navigation state | contract |
| Arrow/Home/End/PageUp/PageDown/Shift+Page keyboard map | contract |
| arrow keys cross the month boundary and re-page currentMonth | contract (the reason roving-focus is not composed) |
| prev/next month controls with aria-labels | contract |
| showOutsideDays / fixedWeeks / weekStartsOn / fromDate / toDate | contract |
| Enter/Space activate the focused date | contract |
| `disabled(date)` predicate function | contract, framework-affordance (React): implemented as the `disabled?: (date: Date) => boolean` prop, layered over the serializable `fromDate`/`toDate` bounds -- a predicate-disabled day gets `aria-disabled`/`data-disabled` and refuses selection on click and keyboard-activate. A function is not serializable, so WC/Astro use the bounds alone (that asymmetry is by design) |
| day rendered as `<button>` with `aria-selected` | defect-do-not-port — `aria-selected` is not an allowed attribute on `role=button`; ported to a focusable `role="gridcell"` (APG date-grid) |
| `role="application"` on the root | dropped — the grid table is the widget (`role="grid"`); `application` suppresses AT reading mode with no benefit here |
| grid left with no tabstop when nothing focused/selected | defect-do-not-port — `tabbableDate` always yields one tabbable cell (focus > selection > today > first) so the grid is reachable by Tab |
| `numberOfMonths` multi-month prop | dropped — single visible month; multi-month is a composition of instances, out of scope for this port (not exercised by the oracle's own tests) |
| inline hard-coded SVG chevrons | contract (kept as decorative `aria-hidden` glyphs) |

## Motion

None. The issue declares motion intent only, and **no semantic `motion-*` token
fits a calendar day yet** (the token layer is being rebuilt — #1899/#1902). Per
Spec 05, motion is left **undeclared** rather than hardcoding a numeric duration:
`calendar.classes.ts` carries no `transition-*`/`duration-*` literal, and the
classes test asserts their absence. When a `motion-hover`/`motion-press`-class
token lands, the day cell is the consumer.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `role="grid"` with an accessible name (`aria-labelledby` ->
  the month heading), `role="gridcell"` days carrying `aria-selected` /
  `aria-disabled` / `aria-current`, and column headers (`<th scope="col">`) —
  all asserted against real DOM by the harness, axe-clean.
- 2.1.1 Keyboard: full grid navigation (arrows/Home/End/Page) plus Enter/Space
  activation; the header controls are native buttons.
- 2.4.3 Focus Order: a single roving tabstop from `focusedDate`; entering the
  grid lands on the focused/selected/today/first cell.
- 2.4.7 Focus Visible: token focus ring on the day cells and the nav controls.
- 4.1.3 Status Messages: the month heading is `aria-live="polite"` so a page
  change is announced.
