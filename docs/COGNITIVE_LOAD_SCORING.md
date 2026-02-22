# Cognitive Load Scoring Model

Rafters assigns every UI component a cognitive load score from 0 to 10. This document explains the theory behind the scores, the five dimensions that produce them, and how screen-level budgets work when components compose together.

No existing design system or academic framework provides a quantitative per-component scoring model. NN/g's CASTLE framework mentions cognitive load as one of six UX dimensions but recommends post-hoc surveys (NASA-TLX), not automated scoring. Rafters is the first system to assign static, intrinsic scores to components and enforce budgets at composition time.

---

## The Five Dimensions

Every component score is the sum of five dimensions, each contributing 0-2 points. The maximum possible score is 10.

### 1. Decision Demand (0-2)

How many decisions does the user need to make?

| Score | Meaning | Examples |
|-------|---------|---------|
| 0 | No decision required | Separator, Container, Skeleton |
| 1 | Single binary or obvious choice | Button (click or don't), Toggle (on/off), Checkbox |
| 2 | Multiple options or consequential choice | AlertDialog (proceed or cancel with stakes), Combobox (search + select from many) |

A Button scores 1 here: the user decides whether to click. An AlertDialog scores 2: the user must weigh consequences and choose between action and cancellation.

### 2. Information Density (0-2)

How much information must the user process simultaneously?

| Score | Meaning | Examples |
|-------|---------|---------|
| 0 | No information to process | Separator, AspectRatio |
| 1 | Single piece of information | Badge (one label), Tooltip (one message), Spinner |
| 2 | Multiple pieces of information competing for attention | DataTable (rows x columns), Calendar (grid of dates), Command palette (filtered list + keyboard hints) |

A Button scores 0 here: the label is the entire information payload, and you already know what it says before you look at it. A Combobox scores 2: the user reads the input value, scans filtered options, and compares matches simultaneously.

### 3. Interaction Complexity (0-2)

How many distinct interaction modes does the component support?

| Score | Meaning | Examples |
|-------|---------|---------|
| 0 | No interaction (display only) | Separator, Badge, Skeleton, Kbd |
| 1 | Single interaction mode (click, toggle, type) | Button (click), Switch (toggle), Input (type) |
| 2 | Multiple interaction modes (type + select, drag + drop, keyboard + mouse) | Combobox (type + scan + select), DatePicker (click button + navigate calendar + select date), ColorPicker (drag area + click bar + type values) |

A Button scores 1: you click it. A Combobox scores 2: you type to filter, arrow-key through results, and press Enter or click to select. These are three distinct interaction modes the user must coordinate.

### 4. Context Disruption (0-2)

How much does the component disrupt the user's current task context?

| Score | Meaning | Examples |
|-------|---------|---------|
| 0 | No disruption, operates within the existing flow | Inline elements (Badge, Label, Typography), layout (Container, Grid) |
| 1 | Partial disruption, adds a layer but preserves context | Popover, Sheet, Drawer (main content visible but dimmed) |
| 2 | Full disruption, blocks everything else | Dialog, AlertDialog (modal overlay, focus trap, no escape except resolution) |

A Button scores 0: clicking it doesn't inherently change context (the action it triggers might, but the button itself doesn't). An AlertDialog scores 2: it blocks the entire application and forces the user into a decision before they can return to anything else.

### 5. Learning Curve (0-2)

How much prior knowledge does the component require to use correctly?

| Score | Meaning | Examples |
|-------|---------|---------|
| 0 | Universally understood, no learning | Button, Checkbox, Text input |
| 1 | Familiar pattern with some convention to learn | Accordion (click to expand isn't universal), Tabs (spatial model), Pagination (page numbers) |
| 2 | Requires learning specific interactions or mental models | Command palette (keyboard shortcuts, search syntax), Menubar (nested submenus, accelerators), Combobox (type-ahead behavior, fuzzy matching) |

A Button scores 0: every person who has used a computer knows what a button does. A Command palette scores 2: the user must learn that it exists, how to invoke it, the search syntax, and keyboard navigation.

---

## Scoring Walkthrough: Why a Button is a 3

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 1 | Click or don't click. One binary decision. |
| Information Density | 0 | The label is the entire payload. "Save", "Delete", "Submit". |
| Interaction Complexity | 1 | Click. That's it. (Loading states add visual feedback but no new interaction mode.) |
| Context Disruption | 0 | The button itself doesn't disrupt. It stays inline, doesn't overlay, doesn't trap focus. |
| Learning Curve | 0 | Universal. Toddlers can use buttons. |
| **Total** | **3** | |

The `@attention-economics` metadata adds nuance: variant hierarchy (primary commands most attention, ghost commands least), size hierarchy (lg for primary CTAs, sm for tertiary actions), and the rule "maximum 1 primary per section." But the cognitive load score measures intrinsic processing cost, not attention weight.

---

## Scoring Walkthrough: Why an AlertDialog is a 7

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 2 | Consequential choice: proceed with destructive action or cancel. Stakes are high. |
| Information Density | 1 | Title + description + action labels. More than a button, but focused on one question. |
| Interaction Complexity | 1 | Click one of two buttons. The interaction is simple even though the decision is hard. |
| Context Disruption | 2 | Full modal overlay. Focus trap. All other interactions blocked. The user's entire workflow is interrupted. |
| Learning Curve | 1 | Most users understand dialogs, but the confirmation pattern (reading the description, understanding consequences, choosing the right button) requires some cognitive effort. |
| **Total** | **7** | |

The high score comes from disruption + decision stakes, not interaction complexity. This is why AlertDialog has `@attention-economics Full attention capture: blocks all other interactions until resolved` and `@trust-building Focus defaults to Cancel (safer choice)`.

---

## More Examples Across the Spectrum

### Separator: 0/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 0 | No decision |
| Information Density | 0 | No information |
| Interaction Complexity | 0 | No interaction |
| Context Disruption | 0 | No disruption |
| Learning Curve | 0 | Nothing to learn |

A horizontal line. The only component that scores zero on every dimension.

### Badge: 2/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 0 | Display only, no decision |
| Information Density | 1 | One label to read |
| Interaction Complexity | 0 | No interaction |
| Context Disruption | 0 | Inline, no disruption |
| Learning Curve | 1 | Color coding (red=destructive, green=success) is a convention to absorb |

### Input: 4/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 1 | What to type |
| Information Density | 1 | Label + placeholder + validation feedback |
| Interaction Complexity | 1 | Type text |
| Context Disruption | 0 | Inline form element |
| Learning Curve | 1 | Validation rules, format expectations |

### Combobox: 6/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 2 | Search + select from filtered options |
| Information Density | 2 | Input value + filtered list + match highlighting |
| Interaction Complexity | 2 | Type to filter + arrow keys + Enter to select |
| Context Disruption | 0 | Dropdown expands inline, doesn't block |
| Learning Curve | 0 | Typeahead is familiar from browser address bars |

### Command Palette: 6/10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| Decision Demand | 1 | Search and pick an action |
| Information Density | 2 | Filtered actions + keyboard shortcuts + categories |
| Interaction Complexity | 1 | Type to filter + select |
| Context Disruption | 0 | Overlay but non-blocking, easy dismiss |
| Learning Curve | 2 | Must learn it exists, keyboard shortcut to invoke, and command vocabulary |

Same total as Combobox, but the load is distributed differently: Command has learning curve cost, Combobox has interaction complexity cost.

---

## Screen-Level Budgets

Individual component scores don't exist in isolation. When components compose into screens, their loads add up. But not linearly -- the user doesn't process every component simultaneously. They focus on one region at a time, with peripheral elements fading into background awareness.

### The Budget Tiers

| Tier | Budget | Context | Examples |
|------|--------|---------|----------|
| **Focused** | 15 | Single-purpose interaction with clear entry/exit | Confirmation dialog, login form, payment modal |
| **Page** | 30 | Standard application view with primary + secondary content | Settings page, data table view, list + detail |
| **App** | 45 | Multi-panel workspace with concurrent activity zones | IDE layout, email client, multi-panel editor |

### Why Tiers, Not One Number

A flat budget of 15 fails every real screen:

| Screen | Components | Raw Sum | Practical Load |
|--------|-----------|---------|----------------|
| Login form | 2x Input(4) + Button(3) + Card(2) + Label(2)x2 | 17 | Over budget at 15, but login is trivially simple |
| Settings page | Sidebar(3) + Tabs(4) + 6x Field(3) + 2x Button(3) + Card(2) | 36 | Comfortable settings page, nowhere near "overloaded" |
| Gmail inbox | Sidebar(3) + Table(3) + Toolbar(4) + Tabs(4) + NavigationMenu(5) + Pagination(4) + multiple Buttons | 37 | Complex but millions of users navigate it daily |

Raw additive scoring overcounts because:

1. **Attentional focusing**: Users process one region at a time. The sidebar's load doesn't add to the table's load -- they're in separate visual zones.
2. **Familiarity discount**: A settings page with 6 fields is daunting on first visit but trivial on return visits. The learning curve dimension already bakes some of this in, but screen familiarity provides an additional reduction.
3. **Progressive disclosure**: Tabs, accordions, and collapsibles gate content. Their load contributes, but the content they hide doesn't (until expanded).

The tiers account for this. A "Focused" interaction (dialog, modal) genuinely has a budget of 15 because every element is competing for the same small visual space and the user must resolve everything before returning to their task. A "Page" budget of 30 reflects that a standard view has 2-3 visual zones that share the load. An "App" budget of 45 reflects multi-panel layouts where 3-4 independent zones operate with their own local cognitive contexts.

### Applying the Budget

When evaluating a screen composition:

1. **Sum the component scores** for everything visible simultaneously
2. **Identify the tier** based on the interaction context
3. **Compare** sum against tier budget
4. **If over budget**: look for components scoring 4+ that could be simplified, hidden behind progressive disclosure, or moved to a separate view

The budget is a lint, not a hard wall. Going 10% over is a design conversation. Going 50% over is a design problem.

---

## What the Score Does NOT Measure

The cognitive load score is an **intrinsic** property of the component. It measures the processing cost of the component itself, independent of:

- **Content**: A Table is always 3/10 whether it has 5 rows or 5,000. Content density is a usage decision, not a component property.
- **Context**: A Button in a toolbar costs the same as a Button in a dialog. The *screen budget* accounts for context, not the component score.
- **Frequency**: How often a user encounters the component doesn't change its intrinsic cost. Familiarity effects are captured by the learning curve dimension, which measures first-exposure cost.
- **Aesthetic quality**: A beautifully styled Combobox costs the same as an ugly one. Visual polish affects perception and trust, not cognitive processing cost.

The companion `@attention-economics` tag captures the contextual, relative aspects: how a component fits in the attention hierarchy, how its variants command different levels of focus, and what the designer intends the user to notice first.

---

## Relationship to Other Intelligence Tags

Each component carries four intelligence tags that work together:

| Tag | Measures | Example (Button) |
|-----|----------|------------------|
| `@cognitive-load` | Intrinsic processing cost (0-10) | 3/10 - Simple action trigger |
| `@attention-economics` | How the component competes for attention relative to siblings | Size/variant hierarchy, max 1 primary per section |
| `@trust-building` | How the component builds or risks user trust | Destructive variants require confirmation, loading prevents double-submit |
| `@accessibility` | WCAG compliance requirements | 44px touch targets, high contrast, screen reader optimization |

Cognitive load answers "how hard is this to use?" Attention economics answers "where should the eye go?" Trust answers "does this feel safe?" Accessibility answers "can everyone use this?"

---

## Scoring Reference Table

All 52+ UI components with their scores and primary cost drivers:

| Score | Components | Primary Cost Driver |
|-------|-----------|-------------------|
| 0 | Separator, Container, AspectRatio | Structural only, no cognitive demand |
| 1 | Skeleton, Kbd | Display only, minimal information |
| 2 | Badge, Breadcrumb, Label, Checkbox, Switch, Toggle, ButtonGroup, Card, Collapsible, Avatar, ScrollArea, Tooltip, Typography, Spinner, Empty, ToggleGroup | Simple state or single information piece |
| 3 | Button, Alert, Sidebar, Accordion, Slider, RadioGroup, Table, Resizable, Field, HoverCard, Image, Embed, Item | One decision + one interaction mode |
| 4 | Input, Textarea, InputGroup, InputOTP, Carousel, Tabs, ContextMenu, DropdownMenu, Popover, Progress, Drawer, Grid, BlockWrapper, InlineToolbar, EditorToolbar | Data entry or menu scanning |
| 5 | Sheet, DatePicker, Calendar, Select, NavigationMenu, Menubar, ColorPicker, BlockCanvas | Multi-step interaction or spatial reasoning |
| 6 | Dialog, Command, Combobox | Compound interaction modes or learning curve |
| 7 | AlertDialog | Full context disruption + consequential decision |

No Rafters component scores above 7. Components that would score 8-10 are too complex for a single component -- they should be decomposed into multiple lower-scoring components composed together (which is what screen-level budgeting handles).
