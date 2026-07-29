# Component Matrix

One line per component: what it is, what it does, what it uses (current primitive imports -> planned re-composition), states, motion, framework support.
Generated 2026-07-09 from live index evidence (sym tree, import scan) + authored semantics. Excluded: editor, color-picker, color-inspector.
Behavior-layer support: only the five articles have react (verified). Old tree availability listed for interim use.

## static (21)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **alert** | Inline status banner with severity variants | Displays feedback content in flow; role=alert announces on appearance | - | - | - | motion-hover (HOLE: non-interactive; only colour token is hover-named) | astro/react/wc | none |
| **aspect-ratio** | Ratio-locked box | Constrains children to a fixed width/height ratio | - | - | - | none | react/wc | none |
| **avatar** | User image with fallback | Shows image; falls back to initials on load failure | loaded, error->fallback | - | - | none | astro/react/wc | none |
| **badge** | Small label chip | Displays a short status/count label inline | - | - | - | motion-hover (HOLE: non-interactive) | astro/react/wc | none |
| **breadcrumb** | Hierarchical location trail | Renders nav landmark of ancestor links with current page marked | - | - | - | motion-hover | astro/react/wc | none |
| **card** | Content surface with fill signature | Groups related content on an elevated surface | - | fill-resolver | - | HOLE: shadow-only; nearest is motion-focus (box-shadow) but focus-named | astro/react/wc | none |
| **container** A | Layout keystone (ARTICLE) | Owns negative space: stack/grid/block modes, landmarks, CQ provider | - | fill-resolver | - | none | astro/react/wc | react OK |
| **embed** | External media frame | Wraps third-party iframes with title and aspect control | loading, loaded | - | - | none | react/wc | none |
| **empty** | Empty-state placeholder | Communicates absence of content with icon/title/action slots | - | - | - | none | astro/react/wc | none |
| **grid** A | 12-column grid (ARTICLE) | Linear/preset columns; spans; conditional grid-roving when role=grid | - | - | - | none | astro/react/wc | react OK |
| **image** | Token-aware img wrapper | Renders responsive image with radius/fill tokens | loading, error | - | - | none | astro/react/wc | none |
| **item** | Generic list row | Lays out leading/content/trailing in a row | - | - | - | motion-hover | astro/react/wc | none |
| **kbd** | Keyboard key cap | Displays a key or shortcut visually | - | - | - | none | astro/react/wc | none |
| **label** | Form control label | Associates text with a control (htmlFor) | - | - | - | none | astro/react/wc | none |
| **progress** | Progress bar | Shows determinate value or indeterminate activity | value, indeterminate | - | - | HOLE: value-change -- no token | astro/react/wc | none |
| **scroll-area** | Styled scroll container | Custom scrollbar rendering over native scroll | scrolling | - | - | motion-hover | react | none |
| **separator** | Visual divider | Horizontal/vertical rule; decorative by default (role=none), semantic on request | - | - | - | none | astro/react/wc | none |
| **skeleton** | Loading shimmer | Occupies layout while content loads | - | - | - | feedback-loop (outside intent system, by ruling) | astro/react/wc | none |
| **spinner** | Busy indicator | Signals in-flight work | - | - | - | feedback-loop (outside intent system, by ruling) | astro/react/wc | none |
| **table** | Semantic data table | Renders table landmarks; rows can carry selected state | row: selected | - | - | motion-hover (HOLE: row state, not hover) | astro/react | none |
| **typography** | Semantic text set (H1-H6, P, Code, Small, Blockquote, List) | Renders native text elements with token props; no raw class surface | - | - | - | none | astro/react/wc | none |

## simple-interactive (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **button** A | Action trigger (ARTICLE) | Dispatches press; Enter/Space; loading announces busy | pressed, busy, disabled | - | - | motion-hover + motion-press | astro/react/wc | react OK |
| **button-group** | Adjoined button set | Groups buttons with shared borders and single focus ring | - | - | - | none | react/wc | none |
| **calendar** | Month grid | Grid-navigates dates (arrows/page); selects single/range | focused date, selected, month | memory | keyboard-handler, roving-focus | none | react | none |
| **pagination** | Page navigation | Links/buttons for page selection with current marked | current page | - | - | motion-hover | astro/react | none |
| **slider** | Continuous/stepped value control | Drag or arrow keys set value(s) in range | value, dragging, disabled | - | form-value, interactive, keyboard-handler | HOLE: thumb-travel, axis x -- no token | react/wc | none |

## toggle-family (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **checkbox** | Tri-state checkbox | Checks/unchecks/indeterminate; form-associated | checked, unchecked, indeterminate, disabled | - | form-value, press | motion-toggle | react/wc | none |
| **radio-group** | Exclusive radio set | Selects exactly one option; arrow keys move+select | value, item: checked | - | form-value, roving-focus, selection-group | motion-toggle | react/wc | none |
| **switch** | Binary switch | Flips checked/unchecked with thumb travel (role=switch) | checked, unchecked, disabled | - | form-value, press | HOLE: thumb-travel, axis x -- no token | react/wc | none |
| **toggle** | Two-state press button | Toggles pressed on/off (aria-pressed) | on, off | - | press | motion-toggle | react/wc | none |
| **toggle-group** | Exclusive/multiple toggle set | Coordinates toggles as single- or multi-select group | value(s), item: on/off | - | press, roving-focus, selection-group | motion-toggle | react/wc | none |

## text-input-family (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **field** | Label+control+message wrapper | Wires label, description, and validation message ids to a control | invalid | - | - | none | react/wc | none |
| **input** | Single-line text field | Edits text; reflects validity; form-associated | value, invalid, disabled | - | form-value, input-events | motion-focus | astro/react/wc | none |
| **input-group** | Input with addons | Composes input with leading/trailing addons as one control | value, invalid | - | - | none | react/wc | react/wc/astro OK |
| **input-otp** | Segmented one-time-code input | One char per slot; auto-advance; paste splits | slots filled, active slot | - | form-value, input-events, keyboard-handler | feedback-loop (caret-blink, outside intent system) | react/wc | none |
| **textarea** | Multi-line text field | Edits multiline text; autosize optional | value, invalid, disabled | - | form-value, input-events | motion-focus | react/wc | none |

## disclosure (3)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **accordion** | Stacked expandable sections | Opens one/many sections; header buttons control regions | item: open/closed | roving-focus | - | motion-expand / motion-collapse (grid-rows, axis y) | astro/react | react/wc/astro OK |
| **collapsible** | Single expandable region | Toggles one content region open/closed | open, closed | disclosure | - | motion-expand / motion-collapse (grid-rows, axis y) | react | none |
| **tabs** | Tabbed panels | Shows one panel per selected tab; arrows move (automatic activation) | active tab | - | roving-focus, selection-group | HOLE: indicator-move, axis x -- no token | astro/react | none |

## modal-overlay (4)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **alert-dialog** | Consequence-gated confirm dialog | Interrupts with a decision; focus defaults to Cancel; no outside-dismiss | open | disclosure, escape-keydown, focus-trap, portal | - | motion-modal-in / motion-modal-out | react | none |
| **dialog** A | Modal dialog (ARTICLE) | Opens trapped modal over scrim; severity gate; modal/non-modal | open, modal, severity | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | - | motion-modal-in / motion-modal-out | react | react OK |
| **drawer** | Bottom drawer (touch) | Slides up from bottom; drag-to-dismiss optional | open, snap point | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | drag-drop | motion-sheet-in / motion-sheet-out (axis y) | react | none |
| **sheet** | Edge-anchored modal panel | Slides from a side over a scrim; traps focus | open, side | dialog-aria, disclosure, escape-keydown, focus-trap, outside-click, portal | - | motion-sheet-in / motion-sheet-out (per side) | react | none |

## non-modal-overlay (3)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **hover-card** | Rich hover preview | Shows preview card on hover intent | open | collision-detector, disclosure, escape-keydown, portal | hover-delay | motion-dropdown-in (enter only -- no Presence adapter) | react | none |
| **popover** | Anchored floating panel | Opens positioned panel at trigger; light-dismiss | open, side/align | float, portal | - | motion-dropdown-in / motion-dropdown-out | react | none |
| **tooltip** | Hover/focus hint | Shows label after hover delay; never focusable | open, delayed | collision-detector, disclosure, portal | hover-delay | motion-dropdown-in / motion-dropdown-out (fade only) | astro/react | none |

## menu-collection-popup (6)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **combobox** | Filtering autocomplete | Types to filter options, selects to persist; input+listbox composite | open, query, value, highlighted | collision-detector, escape-keydown, outside-click, portal | form-value, input-events, selection-group, typeahead | motion-dropdown-in / motion-dropdown-out | react | none |
| **command** | Command palette | Fuzzy-filters commands; keyboard-first invoke | query, highlighted | - | command-palette, roving-focus | motion-dropdown-in / motion-dropdown-out | react | none |
| **context-menu** | Right-click menu | Opens at pointer; same menu machinery as dropdown | open, highlighted item, position | disclosure, escape-keydown, memory, outside-click, portal, roving-focus, typeahead | - | motion-dropdown-in / motion-dropdown-out | react | none |
| **date-picker** | Calendar-in-popover picker | Opens calendar; grid navigation selects date; form-associated | open, selected date, focused date | collision-detector, escape-keydown, outside-click, portal | form-value, keyboard-handler | motion-dropdown-in / motion-dropdown-out | react | none |
| **dropdown-menu** | Action menu | Opens anchored menu; roving focus + typeahead; item activates and closes | open, highlighted item | collision-detector, disclosure, escape-keydown, outside-click, portal, roving-focus, typeahead | - | motion-dropdown-in / motion-dropdown-out | react | none |
| **select** | Listbox picker | Opens listbox, persists chosen value; typeahead; form-associated | open, value, highlighted | collision-detector, escape-keydown, memory, outside-click, portal, roving-focus, selection-group, typeahead | form-value | motion-dropdown-in / motion-dropdown-out | react | none |

## compound (5)

| component | is | does | states | uses (current) | uses (planned) | motion | old tree | layer |
|---|---|---|---|---|---|---|---|---|
| **carousel** | Slide sequence | Advances slides prev/next/goto; swipe on touch | index, canPrev/canNext | memory | drag-drop, keyboard-handler | HOLE: slide-advance, axis x -- no token; travel = item width | react | none |
| **menubar** | Horizontal application menu bar | Bar of menus; roving focus across triggers; open follows focus | open menu, highlighted | - | disclosure, escape-keydown, outside-click, roving-focus, typeahead | motion-dropdown-in / motion-dropdown-out | astro/react | none |
| **navigation-menu** A | Site navigation bar (ARTICLE) | Bar of disclosure triggers; one panel open; hover intent | activeItem, open per trigger | - | - | motion-dropdown-in / motion-dropdown-out | astro/react | react OK |
| **resizable** | Draggable split panels | Drag handles resize adjacent panels; keyboard resizes | sizes, dragging | memory | interactive, keyboard-handler | HOLE: shadow-only on handle; see card | react | none |
| **sidebar** | Collapsible navigation rail | Expands/collapses app nav; remembers state; mobile overlay mode | open, collapsed rail, mobile | memory | - | HOLE: expand/collapse on slide/axis x -- label collides with accordion (grid-rows/y) | react | none |
