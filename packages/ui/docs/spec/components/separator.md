# Component Spec — Separator

Status: DRAFT. Wave-2 static score. Imitates Container/ScrollArea: no state,
no actions, no keymap, no effects. UNLIKE the other statics its aria
projection is NOT empty -- role and orientation are the whole accessible
contract, and they are a pure function of config, so the projection is
painted directly by each performance with no `bindSeparator`.

Files (`src/components/separator/`):

```
separator.classes.ts    separator.behavior.ts    separator.tsx
separator.element.ts     separator.astro
```

Tests mirror into `test/components/separator/`: behavior (pure), classes,
and conformance across React, the Web Component, and Astro via the shared
harness.

## Purpose

Visual divider. A horizontal or vertical rule; decorative by default
(`role="none"`), semantic on request (`role="separator"`).

## The structure contract

- Renders one part, `root`, a `<div>` carrying the composed classes and the
  score's resolved aria projection. There are no children: a rule carries no
  content, so the Web Component ships no slot.
- `orientation` selects the thin axis: `horizontal` is a 1px-tall full-width
  rule (`h-px w-full`), `vertical` a 1px-wide full-height rule
  (`h-full w-px`). Selection only -- both strings are literals in
  `separator.classes.ts`; the base is `shrink-0 bg-border` (fill via the
  semantic border token, never a raw colour utility).
- `decorative` (default `true`) is the accessibility switch, not a visual
  one: it changes only the projected role, never the classes. A decorative
  rule is `role="none"` (removed from the accessibility tree); a semantic
  rule is `role="separator"` carrying `aria-orientation`.

## Config, state, actions

```ts
type SeparatorOrientation = 'horizontal' | 'vertical';

interface SeparatorConfig {
  orientation?: SeparatorOrientation; // default 'horizontal'
  decorative?: boolean;               // default true
}
type SeparatorState = Record<never, never>;
type SeparatorActions = Record<never, never>;
```

No dynamic behavior: a separator does not toggle, open, or dispatch. Config
in, classes and a static aria projection out.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | decorative (default): `role="none"`, no `aria-orientation`. semantic (`decorative={false}`): `role="separator"` + `aria-orientation` mirroring `orientation`. |

`role` is projected by the score, not declared on the part, because it
VARIES with config -- the part-decl `role` field is for a fixed role, which a
divider does not have (the same shape Grid uses for its conditional
`role="grid"`).

## Keyboard and effects

None. `keymap` returns `null` unconditionally; `effects` returns `[]`
unconditionally; `canDispatch` returns `true` unconditionally (there is
nothing to gate). All three are asserted directly in
`separator.behavior.test.ts` -- the explicit "nothing happens" contract, per
the issue's acceptance criteria.

## Framework parity note: the `decorative` attribute/prop split

React and Astro expose `decorative` as a plain boolean prop defaulting to
`true`. The Web Component exposes it as a presence-based attribute, faithful
to the oracle (`src/old/ui/separator.element.ts`): ABSENT = decorative;
PRESENT and not the literal `"false"` = semantic; `decorative="false"` keeps
it decorative. This attribute/prop asymmetry is standard (an attribute is a
string, a prop is a boolean) and is asserted in both conformance suites.

## Oracle dispositions (src/old/ui/separator.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `orientation` (`horizontal \| vertical`, all three targets) | contract |
| `decorative` (default true; role="none" vs role="separator" + aria-orientation) | contract -- the earned accessibility semantic, moved verbatim into the score's aria projection |
| Base classes `shrink-0 bg-border` + orientation map (`h-px w-full` / `h-full w-px`) | contract, ported verbatim from `src/old/ui/separator.classes.ts` |
| WC presence-based `decorative` rule (absent/"false" = decorative; any other present value = semantic) | contract -- preserved as the WC attribute semantic, distinct from the React/Astro boolean prop |
| `forwardRef<HTMLDivElement>` | contract -- separators are frequently placed by layout wrappers; ref forwarding is load-bearing |
| WCAG/JSDoc block (`@cognitive-load`, `@attention-economics`, `@trust-building`, `@accessibility`) | contract, carried into `separator.tsx` as the recorded designer decision |
| `@semantic-meaning` / `@usage-patterns` / `@example` JSDoc tags | dropped from `separator.tsx` -- the four required tags are the registry's parsed surface; the extras were prose, recoverable from the oracle if a future pass wants them |
| Oracle `breadcrumb-separator.astro` / `menubar-separator.astro` | out of scope -- those are compound-component sub-parts (Breadcrumb, Menubar), not the standalone Separator this issue ports |

## classes.ts

- Shape per Spec 01: `separatorClasses(config, state) => { root }`.
- Content ported verbatim from `src/old/ui/separator.classes.ts`, typed
  against the closed `SeparatorOrientation` enum instead of loose
  `Record<string, string>`.
- Every string a literal; classy composes the tuple in `separator.tsx`.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: a semantic rule (`decorative={false}`)
  exposes `role="separator"` so the section break is programmatically
  determinable; a decorative rule is correctly `role="none"` so no spurious
  boundary is announced.
- 1.4.11 Non-text Contrast: the `bg-border` token is drawn from the frozen
  semantic border-role contract, so divider contrast is a registry
  guarantee, not a per-component check.
- 4.1.2 Name, Role, Value: role is projected exactly per the decorative
  contract; a decorative separator has no role in the a11y tree, a semantic
  one carries `role="separator"` and its `aria-orientation`. Both are
  asserted axe-clean in every framework's conformance suite.

## Open

- `aria-orientation` is projected for both axes on a semantic rule (faithful
  to the oracle). The ARIA default for `role="separator"` is `horizontal`;
  emitting it explicitly is harmless and matches the oracle, so it is not
  trimmed.
- Static-score conformance is thinner than interactive articles: element +
  classes assertions + the role/orientation projection + axe. No interaction
  tier exists to run.
