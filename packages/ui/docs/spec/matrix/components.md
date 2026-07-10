# Component Matrix

One line per component: what it is, what it does, what it uses (current primitive imports -> planned re-composition), states, motion, framework support.
Generated 2026-07-09 from live index evidence (sym tree, import scan) + authored semantics. Excluded: editor, color-picker, color-inspector.
Behavior-layer support: only the five articles have react (verified); container, button, grid, dialog, and navigation-menu additionally have astro (verified). Old tree availability listed for interim use.

## static (21)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **alert** | Inline status banner with severity variants | Displays feedback content in flow; role=alert announces on appearance | - | - | - | transition-colors | astro/react/wc | none |
| **aspect-ratio** | Ratio-locked box | Constrains children to a fixed width/height ratio | - | - | - | none | react/wc | none |
| **avatar** | User image with fallback | Shows image; falls back to initials on load failure | loaded, error->fallback | - | - | none | astro/react/wc | none |
| **badge** | Small label chip | Displays a short status/count label inline | - | - | - | transition-colors | astro/react/wc | none |
| **breadcrumb** | Hierarchical location trail | Renders nav landmark of ancestor links with current page marked | - | - | - | transition-colors | astro/react/wc | none |
| **card** | Content surface with fill signature | Groups related content on an elevated surface | - | fill-resolver | - | transition-shadow | astro/react/wc | none |
| **container** A | Layout keystone (ARTICLE) | Owns negative space: stack/grid/block modes, landmarks, CQ provider | - | fill-resolver | - | none | astro/react/wc | react + astro OK |
| **embed** | External media frame | Wraps third-party iframes with title and aspect control | loading, loaded | - | - | none | react/wc | none |
| **empty** | Empty-state placeholder | Communicates absence of content with icon/title/action slots | - | - | - | none | astro/react/wc | none |
| **grid** A | 12-column grid (ARTICLE) | Linear/preset columns; spans; conditional grid-roving when role=grid | - | - | - | none | astro/react/wc | react + astro OK |
| **image** | Token-aware img wrapper | Renders responsive image with radius/fill tokens | loading, error | - | - | none | astro/react/wc | none |
| **item** | Generic list row | Lays out leading/content/trailing in a row | - | - | - | transition-colors | astro/react/wc | none |
| **kbd** | Keyboard key cap | Displays a key or shortcut visually | - | - | - | none | astro/react/wc | none |
| **label** | Form control label | Associates text with a control (htmlFor) | - | - | - | none | astro/react/wc | none |
| **progress** | Progress bar | Shows determinate value or indeterminate activity | value, indeterminate | - | - | transition-all -> value-change | astro/react/wc | none |
| **scroll-area** | Styled scroll container | Custom scrollbar rendering over native scroll | scrolling | - | - | transition-colors | react | none |
| **separator** | Visual divider | Horizontal/vertical rule; decorative by default (role=none), semantic on request | - | - | - | none | astro/react/wc | none |
| **skeleton** | Loading shimmer | Occupies layout while content loads | - | - | - | animate-pulse -> feedback-loop | astro/react/wc | none |
| **spinner** | Busy indicator | Signals in-flight work | - | - | - | animate-spin -> feedback-loop | astro/react/wc | none |
| **table** | Semantic data table | Renders table landmarks; rows can carry selected state | row: selected | - | - | transition-colors | astro/react | none |
| **typography** | Semantic text set (H1-H6, P, Code, Small, Blockquote, List) | Renders native text elements with token props; no raw class surface | - | - | - | none | astro/react/wc | none |

## simple-interactive (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **button** A | Action trigger (ARTICLE) | Dispatches press; Enter/Space; loading announces busy | pressed, busy, disabled | - | - | transition-colors | astro/react/wc | react + astro OK |
| **button-group** | Adjoined button set | Groups buttons with shared borders and single focus ring | - | - | - | none | react/wc | none |
| **calendar** | Month grid | Grid-navigates dates (arrows/page); selects single/range | focused date, selected, month | memory | keyboard-handler, roving-focus | none | react | none |
| **pagination** | Page navigation | Links/buttons for page selection with current marked | current page | - | - | transition-colors | astro/react | none |
| **slider** | Continuous/stepped value control | Drag or arrow keys set value(s) in range | value, dragging, disabled | - | form-value, interactive, keyboard-handler | transition-all thumb -> thumb-travel: transition, axis x | react/wc | none |

## toggle-family (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **checkbox** | Tri-state checkbox | Checks/unchecks/indeterminate; form-associated | checked, unchecked, indeterminate, disabled | - | form-value, press | data-[state=checked] swap -> state-swap | react/wc | none |
| **radio-group** | Exclusive radio set | Selects exactly one option; arrow keys move+select | value, item: checked | - | form-value, roving-focus, selection-group | data-[state=checked] swap -> state-swap | react/wc | none |
| **switch** | Binary switch | Flips checked/unchecked with thumb travel (role=switch) | checked, unchecked, disabled | - | form-value, press | transition-transform thumb -> thumb-travel: transition, axis x | react/wc | none |
| **toggle** | Two-state press button | Toggles pressed on/off (aria-pressed) | on, off | - | press | data-[state=on] swap -> state-swap | react/wc | none |
| **toggle-group** | Exclusive/multiple toggle set | Coordinates toggles as single- or multi-select group | value(s), item: on/off | - | press, roving-focus, selection-group | data-[state=on] swap -> state-swap | react/wc | none |

## text-input-family (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **field** | Label+control+message wrapper | Wires label, description, and validation message ids to a control | invalid | - | - | none | react/wc | none |
| **input** | Single-line text field | Edits text; reflects validity; form-associated | value, invalid, disabled | - | form-value, input-events | transition-shadow focus | astro/react/wc | none |
| **input-group** | Input with addons | Composes input with leading/trailing addons as one control | value, invalid | - | form-value, input-events | none | react/wc | none |
| **input-otp** | Segmented one-time-code input | One char per slot; auto-advance; paste splits | slots filled, active slot | - | form-value, input-events, keyboard-handler | animate-pulse caret -> caret-blink: feedback-loop | react/wc | none |
| **textarea** | Multi-line text field | Edits multiline text; autosize optional | value, invalid, disabled | - | form-value, input-events | transition-shadow focus | react/wc | none |

## disclosure (3)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **accordion** | Stacked expandable sections | Opens one/many sections; header buttons control regions | item: open/closed | - | disclosure, roving-focus, selection-group | animate-accordion-up/down -> expand/collapse: height, axis y | astro/react | none |
| **collapsible** | Single expandable region | Toggles one content region open/closed | open, closed | disclosure | - | animate-collapsible-up/down -> expand/collapse: height, axis y | react | none |
| **tabs** | Tabbed panels | Shows one panel per selected tab; arrows move (automatic activation) | active tab | - | roving-focus, selection-group | data-[state=active] swap -> indicator-move: transition, axis x | astro/react | none |

## modal-overlay (4)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **alert-dialog** | Consequence-gated confirm dialog | Interrupts with a decision; focus defaults to Cancel; no outside-dismiss | open | disclosure, escape-keydown, focus-trap, portal | - | transition-colors -> enter/exit: fade+zoom | react | none |
| **dialog** A | Modal dialog (ARTICLE) | Opens trapped modal over scrim; severity gate; modal/non-modal | open, modal, severity | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | - | transition-opacity close -> enter/exit: fade+zoom (pending 0-B) | react | react + astro OK |
| **drawer** | Bottom drawer (touch) | Slides up from bottom; drag-to-dismiss optional | open, snap point | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | drag-drop | none -> enter/exit: slide, axis y | react | none |
| **sheet** | Edge-anchored modal panel | Slides from a side over a scrim; traps focus | open, side | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | - | animate-in/out slide -> enter/exit: slide per side | react | none |

## non-modal-overlay (3)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **hover-card** | Rich hover preview | Shows preview card on hover intent | open | collision-detector, disclosure, escape-keydown, portal | hover-delay | animate-in/out fade+zoom -> enter/exit: fade+zoom | react | none |
| **popover** | Anchored floating panel | Opens positioned panel at trigger; light-dismiss | open, side/align | float, portal | - | animate-in/out fade+zoom -> enter/exit: fade+zoom | react | none |
| **tooltip** | Hover/focus hint | Shows label after hover delay; never focusable | open, delayed | collision-detector, disclosure, portal | hover-delay | transition-opacity -> enter/exit: fade | astro/react | none |

## menu-collection-popup (6)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **combobox** | Filtering autocomplete | Types to filter options, selects to persist; input+listbox composite | open, query, value, highlighted | collision-detector, escape-keydown, outside-click, portal | form-value, input-events, selection-group, typeahead | none -> enter/exit: fade+zoom | react | none |
| **command** | Command palette | Fuzzy-filters commands; keyboard-first invoke | query, highlighted | - | command-palette, roving-focus | none -> enter/exit: fade | react | none |
| **context-menu** | Right-click menu | Opens at pointer; same menu machinery as dropdown | open, highlighted item, position | disclosure, escape-keydown, memory, outside-click, portal, roving-focus, typeahead | - | animate-in/out fade+zoom -> enter/exit: fade+zoom | react | none |
| **date-picker** | Calendar-in-popover picker | Opens calendar; grid navigation selects date; form-associated | open, selected date, focused date | collision-detector, escape-keydown, outside-click, portal | form-value, keyboard-handler | none -> enter/exit: fade+zoom | react | none |
| **dropdown-menu** | Action menu | Opens anchored menu; roving focus + typeahead; item activates and closes | open, highlighted item | collision-detector, disclosure, escape-keydown, outside-click, portal, roving-focus, typeahead | - | animate-in/out fade+zoom -> enter/exit: fade+zoom | react | none |
| **select** | Listbox picker | Opens listbox, persists chosen value; typeahead; form-associated | open, value, highlighted | collision-detector, escape-keydown, memory, outside-click, portal, roving-focus, selection-group, typeahead | form-value | animate-in/out fade+zoom -> enter/exit: fade+zoom | react | none |

## compound (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **carousel** | Slide sequence | Advances slides prev/next/goto; swipe on touch | index, canPrev/canNext | memory | drag-drop, keyboard-handler | none -> slide-advance: slide, axis x | react | none |
| **menubar** | Horizontal application menu bar | Bar of menus; roving focus across triggers; open follows focus | open menu, highlighted | - | disclosure, escape-keydown, outside-click, roving-focus, typeahead | animate-in/out fade+zoom -> enter/exit: fade+zoom | astro/react | none |
| **navigation-menu** A | Site navigation bar (ARTICLE) | Bar of disclosure triggers; one panel open; hover intent | activeItem, open per trigger | - | - | animate-in (dead classes, task 7) -> panel enter/exit: fade+zoom | astro/react | react + astro OK |
| **resizable** | Draggable split panels | Drag handles resize adjacent panels; keyboard resizes | sizes, dragging | memory | interactive, keyboard-handler | transition-shadow handle | react | none |
| **sidebar** | Collapsible navigation rail | Expands/collapses app nav; remembers state; mobile overlay mode | open, collapsed rail, mobile | memory | - | translate-x slide -> expand/collapse: slide, axis x | react | none |
