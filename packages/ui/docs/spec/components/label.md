# Component Spec — Label

Status: DRAFT. Wave-2 port. Static score (imitates Card and Container). No
state, no actions, no keymap, no effects, no motion block. The composition
archetype: a pure static performed across all three frameworks (React, the
`<rafters-label>` web component, and Astro).

Files (`src/components/label/`):

```
label.behavior.ts   label.classes.ts   label.tsx   label.element.ts   label.astro
```

Tests mirror into `test/components/label/`: behavior (pure, no DOM), classes
parity, and conformance across React + WC + Astro.

## Purpose

A form control label. It names a control and associates with it through the
native `for`/`htmlFor` IDREF (`<Label htmlFor="email">` binds
`<Input id="email">`). A label names; it does not interact. Nine semantic
colour variants ride the role vocabulary as an information-hierarchy channel.

## The finding: a pure static needs no bind

Label's association is native, not score logic, so — like Card and ScrollArea —
there is **nothing to bind**:

- `label.behavior.ts` is the score **only** -- there is no `bindLabel`. The
  score projects no ARIA and runs no effects, so a DOM binding would have
  nothing to run.
- `label.tsx` uses **no** `useBehavior`/`useMemory` -- config in, classes out,
  children through, `htmlFor` passed to the native `<label>`.
- `label.astro` ships **no** `<script>` -- server-rendered markup with the
  shared classes and a default slot; the native `for` passes through.
- `label.element.ts` performs **no** binding -- the web component renders the
  inner `<label>` with the shared classes and a default slot, once, and
  forwards the host `for` onto that inner label.

The score is declared only so the conformance harness can assert the one real
contract (the `root` part renders and projects no ARIA) identically across
every framework.

## The association is native (why the projection is empty)

The label-to-control association is the platform's `<label for="id">` IDREF, an
attribute the consumer supplies. The score neither computes nor reprojects it:
`for`/`htmlFor` is never in config and never in the aria projection. This is
the ScrollArea parallel -- "native scroll owns every semantic" becomes "native
`<label for>` owns the association." Preserving the mechanism exactly (the port
spec's requirement) is precisely why the projection stays empty rather than
routing `for` through the score.

## Config, state, actions

```ts
type LabelVariant =
  | 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
  | 'warning' | 'info' | 'muted' | 'accent';

interface LabelConfig {
  variant?: LabelVariant; // semantic colour channel (rafters extension)
}
type LabelState = Record<never, never>;
type LabelActions = Record<never, never>;
```

`variant` maps to a `text-{role}` token over the frozen colour vocabulary --
semantic classes only, never a raw colour utility. It styles the text; it does
not change the label's role or association. `field`, `hint`, and `error` are
usage roles these same nine colours express (default = field label,
destructive = error, muted = hint, success = confirmation), not a separate
variant vocabulary. The `for`/`htmlFor` association attribute is native and
lives outside config.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection; the `<label>` and its native `for` carry the whole contract |

There is exactly one behavioral part, the `<label>` element itself.

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client. A label is not
interactive; clicking it focuses its associated control, which is native
behaviour the score neither adds to nor removes.

## Oracle dispositions (src/old/ui/label.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| Nine semantic colour variants (`default`…`accent`, each a `text-{role}` token) | contract -- rafters extension over the shadcn base; carried forward verbatim |
| `htmlFor` / `for` association (IDREF to a control's id) | contract -- native pass-through; the port preserves the mechanism exactly |
| `text-label-medium leading-none` base decoration | contract (verbatim from the oracle's settled decoration) |
| `peer-disabled:cursor-not-allowed peer-disabled:opacity-70` | contract -- the sibling-`.peer` disabled affordance; verbatim |
| WC `for` forwarding onto the inner shadow `<label>` | contract -- preserved verbatim; the shadow-boundary caveat below applies |
| `{...props}` / `{...attrs}` spread on the root | framework affordance (React/WC/Astro pass consumer attributes through) |

## Deltas from the oracle

1. The score is declared (`label.behavior.ts`) so the conformance harness can
   assert the empty contract across three frameworks -- the oracle had no score
   file. No behaviour changed: the projection is empty and there is no bind.
2. Classes moved into `label.classes.ts` as `labelClasses(config)` returning a
   `{ root }` class set, the same shape Card and Container use.

## shadcn drop-in parity

shadcn's Label wraps `@radix-ui/react-label`; the prop surface a consumer sees
is `htmlFor` + `className` + standard label attributes, which this port matches
(plus the rafters `variant` extension). A consumer migrating a shadcn label
needs no prop or import-path changes beyond the registry path.

Radix's Label adds one behaviour beyond a plain label: a double-click
text-selection guard (`onMouseDown` preventDefault on a second click). The
oracle is a plain non-Radix `<label>` and never carried that guard, so this
faithful port does not add it -- an explicit disposition, not a regression.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships / 4.1.2 Name, Role, Value: the label associates
  with its control via the native `for`/`htmlFor` IDREF, so assistive tech
  announces the label when the control takes focus. The root projects no ARIA;
  the empty contract is asserted against real DOM across React, WC, and Astro.
- 1.4.1 Use of Colour: the `variant` colour is never the sole carrier of
  meaning -- an error-state label pairs its colour with the control's own
  `aria-invalid` and error text; colour alone never signals validity.
- 1.4.3 Contrast: every variant is a contrast-tuned semantic role token, not a
  raw colour, so the label stays legible on the surrounding surface.
- 2.5.3 Label in Name: the visible label text is the accessible name (it is the
  label's own content), so they cannot diverge.

### Known caveat (not a regression)

Inside the web component's shadow root, the inner label's `for` IDREF resolves
within that tree, so it does NOT associate across the shadow boundary to a
light-DOM control -- the same shadow-boundary limitation the oracle recorded
for its `peer-disabled` utilities. The forwarding is preserved verbatim;
consumers wanting cross-boundary association wrap the control or mirror the
association outside the shadow root. Repointing this (a light-DOM association
strategy for the WC) is a tracked follow-up, not an agent call to make in a
faithful port.
