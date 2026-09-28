# Component Spec — Date Picker

Status: PORTED (#2398). A calendar in an anchored popup: a trigger opens it,
grid navigation selects a date, and the selected date submits with its form.
Ships React + Web Component + Astro.

Files (`src/components/date-picker/`):

```
date-picker.behavior.ts   date-picker.classes.ts
date-picker.tsx           date-picker.element.ts   date-picker.astro
```

Tests mirror into `test/components/date-picker/`: a pure behavior test, a
classes parity test, and `.spec` + `.a11y` files for each of React, WC and
Astro.

## Composition

Date-picker is existing behavior put together (Spec 02). The score folds
popover's score whole, adds the committed value, and puts the coordination in
the glue:

```
popover (score)        disclosable open/close axis, trigger/content/anchor/close parts,
                       aria-haspopup="dialog", role="dialog", Escape on content
date-picker-value      state {value}: the committed CalendarSelection; part `value`
                       (the trigger's label span); data-empty projection
date-picker glue       commit action (sets value, closes a complete selection),
                       disabled gate, dialog named by the trigger, data-disabled
```

The grid is calendar's performance, nested inside the content. It is NOT folded
into the score:

- React renders `<Calendar>` controlled by the picker's effective value
  (`selected={fromSelection(value)}`); `onSelect` feeds the glue's `commit`.
  One source of truth.
- WC and Astro nest calendar's own performance (`<rafters-calendar>`,
  `calendar.astro`), and `bindCalendar` drives the grid. Each activation
  reaches the picker as the `calendarselect` event; the picker computes the
  next selection with calendar's `nextSelection` and commits it. The calendar's
  cell and the picker's cell are seeded from the same serialized string and
  advance by the same transition, so they agree by construction.

Folding `calendarBehavior` into this score would move the grid onto the
picker's cell, which means a second calendar binding. That is the calendar
reimplemented; the issue rules it out.

`bindPopover` is not reused either. Its cell is private (nothing outside can
close it), and its keydown resolves the part with `closest('[data-part]')`,
which from a focused day cell yields `day`, so Escape inside the grid would
never close. The popup's impure work is instead one colocated composition
function, `startDatePickerPopup({ trigger, content, onDismiss })`, called by
`bindDatePicker` and by the React `useEffect`:

```
collision-detector   positionPopover(trigger, content, DATE_PICKER_POSITION) --
                     fixed placement below the trigger, start-aligned; follows
                     scroll/resize while open
outside-click        onPointerDownOutside(content, dismiss) -- light dismiss,
                     sparing the trigger
focus                focusGrid(content) on open; trigger refocus on close
```

Escape rides the score's keymap. `datePickerKeyAction` resolves the part by
containment (anything inside the popup is `content`), then asks the keymap.

### Primitives named for this component and why

| Primitive | Used | Why |
| --- | --- | --- |
| collision-detector | yes | through popover's `positionPopover` |
| outside-click | yes | the light dismiss, composed directly (Spec 05 canonical dismissal path) |
| aria-manager | yes | applies the resolved projection in the bind (`validate: false`) |
| form-value | yes | the hidden mirror input (`formValueAttrs`): the trigger is a button, not a form field |
| keyboard-handler | via calendar | calendar composes it for grid navigation; the picker adds no key handling of its own beyond Escape |
| escape-keydown | no | Escape rides the score keymap on the content, as dialog and popover do |
| portal | no | the popup lives in light DOM, present but hidden (select and combobox precedent), so all three performances share one bind |
| createDisclosure / createSelectionGroup | no | cell-owning primitives do not compose; the open axis is the `disclosable` slice inside popover's score |

## Config, state, actions

```ts
type DatePickerMode = 'single' | 'range';

interface DatePickerConfig {
  mode: DatePickerMode;
  value?: CalendarSelection;        // controlled committed value
  defaultValue?: CalendarSelection; // uncontrolled seed
  open?: boolean;                   // controlled (popover's axis)
  defaultOpen?: boolean;            // uncontrolled seed
  disabled?: boolean;
}
interface DatePickerState {
  open: boolean;                    // intrinsic (popover)
  value: CalendarSelection;         // intrinsic committed value
}
type DatePickerActions = {
  open: undefined;
  close: undefined;
  commit: { selection: CalendarSelection };
};
```

`open` and `value` follow the controlled-versus-intrinsic boundary: config
shadows state, and projections read `isOpen` and `effectiveValue`. In React,
`value` is controlled by the prop's presence, not its definedness
(`controlledSelection`): `value={date}` with `date` undefined is a controlled
empty picker, so a reset clears it. The nested `<Calendar>` stays controlled
too: an empty range is passed as `{ from: undefined, to: undefined }`, and an
emptied single picker remounts the grid (`calendarKey`), because calendar reads
`selected={undefined}` as uncontrolled. `commit`
takes an already-computed selection (calendar's `nextSelection` owns the
transition) and closes the popup when the selection is complete: a single date,
or a range with both ends. A partial range keeps the popup open for the second
click. The disabled gate refuses `open` and `commit`, never `close`.

Pure helpers shared by all three performances: `formatValue` (the trigger
label), `serializeValue` (the form value), `isComplete`, `isEmpty`, and
`toSelection` / `fromSelection` / `selectionProp` (the React `Date` shapes).
The form value uses calendar's own serialization, `yyyy-mm-dd` or
`from..to`, so one string seeds the picker, the nested calendar and the hidden
input, and `parseSelection` reads it back.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (open + real id), `data-state`, `data-disabled`; native `disabled` from config |
| value | always (inside trigger) | `data-empty` when nothing is selected; text is the formatted value or the placeholder |
| content | present, `hidden` when closed | `role="dialog"`, `aria-labelledby` (the trigger), `data-state`, `tabindex="-1"` |
| anchor | not rendered | popover's part; the trigger is the positioning reference (empty-id sentinel) |
| close | not rendered | popover's part; no in-panel close (empty-id sentinel) |
| hidden-input | when `name` is set | `type="hidden"`, `name`, `value` (form-value); not a score part |

The dialog's accessible name is its trigger, which reads the committed date or
the placeholder. No label copy is invented, and the dialog is never unnamed.

## Keyboard

- Trigger: Enter and Space activate the native button, which toggles the popup.
- Opening moves focus to the grid's single tabstop: the selected date, else
  today, else the first of the month (calendar's `tabbableDate`).
- In the grid: calendar's contract (arrows, Home/End, PageUp/PageDown with
  Shift for a year, Enter/Space select).
- Escape anywhere inside the popup closes it and returns focus to the trigger.
- Tab is not trapped (non-modal, popover's stance). An outside pointerdown
  dismisses.
- Selecting a complete value closes the popup and returns focus to the
  trigger.
- Selecting the start of a range keeps the popup open with focus on the grid.
  Under WC and Astro, `bindCalendar` rebuilds the day cells on its own
  selection, so `bindDatePicker` returns focus to the grid's tabstop after a
  commit that leaves the popup open.

## Motion

None. Motion is #2282, built after this port lands, and
`date-picker.classes.ts` names no motion. The popup appears and disappears
through the `hidden` toggle.

## shadcn parity

shadcn ships date-picker as a composition, not a component: `Popover` +
`PopoverTrigger asChild` + `Button` + `PopoverContent` + `Calendar
mode="single"`. That exact tree drops in over rafters' Popover and Calendar
and selects a date (`date-picker.spec.tsx`, shadcn composition parity). The
consumer supplies the popup's accessible name (`aria-label` on
`PopoverContent`), as popover requires. `DatePicker` is the packaged form of
the same composition, with the form value and the close-on-select glue built
in.

Per target:

- React: `<DatePicker mode value defaultValue onValueChange open defaultOpen
  onOpenChange name placeholder disabled formatDate calendarProps />`.
- WC: `<rafters-date-picker mode value name placeholder disabled default-open
  today default-month from-date to-date week-starts-on show-outside-days
  fixed-weeks>`. Calendar attributes forward to the nested `<rafters-calendar>`.
- Astro: `<DatePicker id mode value name placeholder disabled defaultMonth
  fromDate toDate showOutsideDays fixedWeeks weekStartsOn today />`, with
  `value` serialized as above.

## Oracle dispositions (src/old/ui/date-picker.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `mode` single / range | contract |
| `value` + `onValueChange` | contract (controlled shadow; `defaultValue` added for the uncontrolled case the WC and Astro targets need) |
| `placeholder` (default "Pick a date") | contract |
| `disabled` | contract (native `disabled` + score gate) |
| trigger shows the formatted date; range shows `from - to`, start alone while partial | contract (`formatValue`) |
| en-US short date format | contract (`formatDate`) |
| `formatDate` prop | framework-affordance (React; a function is not serializable) |
| `formatRange` prop | dropped: `formatDate` formats each end and the ` - ` join is the contract |
| `calendarProps` passthrough | contract in React; WC and Astro forward the serializable calendar options as attributes/props |
| single closes on select; range closes when complete | contract (glue `commit`) |
| trigger `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `data-state` | contract (from popover's score; `aria-controls` open-guarded) |
| content `role="dialog"` | contract |
| content `aria-modal="true"` on a non-modal popup | defect-do-not-port: nothing is trapped or inert behind it |
| unnamed dialog | defect-do-not-port: now named by the trigger |
| Escape closes and refocuses the trigger | contract (score keymap; refocus in the composition function's teardown) |
| outside pointerdown closes, sparing the trigger | contract (`outside-click`) |
| collision positioning below the trigger, start-aligned, 4px offset | contract (`positionPopover` with `DATE_PICKER_POSITION`) |
| portal to `document.body` | dropped: the popup lives in light DOM present-but-hidden (select/combobox precedent) |
| calendar glyph in the trigger | contract (the oracle's SVG, `size-4 shrink-0 opacity-50`) |
| `defaultMonth` falls back to the value, else today | contract (calendar seeds its month from the selection, else today) |
| content unmounts on close | dropped: present-but-hidden keeps the calendar's visible month between openings, identically in all three targets |
| tailwindcss-animate enter/exit classes | dropped: motion is #2282 |

## Deltas from the oracle

1. Focus returns to the trigger after a selection closes the popup, not only
   on Escape. Without it, focus falls from a hidden day cell to the body
   (WCAG 2.4.3).
2. Opening focuses the grid's tabstop (APG date-picker dialog pattern); the
   oracle left focus on the trigger.
3. The form value submits through a hidden input (`name`); the oracle was not
   form-associated.
4. The trigger borrows select's form-control classes (touch floor `h-11`,
   `@md:h-9` through the container query) instead of the oracle's `h-9`.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: `aria-haspopup`, `aria-expanded`, `aria-controls` on the
  trigger; `role="dialog"` named by `aria-labelledby`; the grid's own roles.
  Axe-clean closed and open in all three targets.
- 2.1.1: fully operable from the keyboard: the trigger, calendar's grid keys,
  Escape.
- 2.1.2: no keyboard trap; Tab leaves the popup.
- 2.4.3: focus moves into the grid on open and back to the trigger on close.
- 2.4.7: token focus ring on the trigger (`focus-visible:ring-ring`) and on
  the day cells (calendar).
- 3.3.2: the placeholder labels the empty state; the committed value is always
  visible on the trigger.
