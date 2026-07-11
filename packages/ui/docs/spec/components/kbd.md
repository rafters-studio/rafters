# Component Spec — Kbd

Status: DRAFT. Static score, astro-only in this scope: no `kbd.tsx` exists
in the new tree yet -- `kbd.astro` is the FIRST render target, not a second
one joining an existing React performance (unlike container/grid/button/
dialog/navigation-menu).

Files (`src/components/kbd/`):

```
kbd.classes.ts    kbd.astro
```

## Purpose

Keyboard key cap. Displays a key or shortcut visually (`<kbd>Ctrl</kbd>`,
or several `Kbd`s composed by the consumer for a combination).

## The structure contract

- One semantic `<kbd>` element wrapping a slot. No parts beyond `root`, no
  config, no state, no aria projection -- the native element carries the
  semantics, the same reasoning that leaves Container's `as`-driven
  landmarks unprojected.
- No `kbd.behavior.ts`. A `BehaviorSpec` with an empty `Config`/`State`
  pair and an empty `aria` projection would be ceremony nothing downstream
  reads: `kbd.classes.ts` needs no `Config` type to accept (there are no
  fields), and no conformance assertion needs a spec object to run
  `assertContractFulfillment` against (see `container.astro.conformance
  .test.ts`, which doesn't call it either, for the same reason: nothing
  to assert beyond element identity, decoration, and axe cleanliness).
- Fixed token decoration, ported verbatim from the oracle's single class
  string: `rounded border border-border bg-muted px-1.5 py-0.5
  text-code-small text-muted-foreground shadow-sm`, `inline-flex
  items-center justify-center` for baseline alignment inside prose.
- Consumer `class` merges via `classy`; all other HTML attributes pass
  through untouched (the oracle's `Props extends HTMLAttributes<'kbd'>`
  is unchanged).

## Oracle dispositions (`src/old/ui/kbd.{astro,tsx,element.ts}`)

| Oracle feature | Disposition |
| --- | --- |
| Single fixed `kbdBaseClasses` string, no variants/sizes | contract -- ported verbatim across all three old-tree targets, so ported verbatim here |
| `bg-muted` + `text-code-small` + `text-muted-foreground` | contract -- `muted` is a `PAIRED_SURFACE_ROLES` member in `fill-resolver.ts` whose foreground word IS `muted-foreground`; NOT the `bg-*-subtle`/solid-`*-foreground` contrast defect class flagged elsewhere in the oracle audit. `text-code-small` is the typography composite the token registry maps to `'kbd'` by name (`design-tokens` defaults: `'code-small': ['code-inline', 'kbd']`) -- a straight port, not a repoint. |
| `Props extends HTMLAttributes<'kbd'>`, no other props | contract -- ported |
| Sequence/combination grouping (e.g. a wrapping element for `Cmd`+`K`) | not present in any oracle target -- the demo app's own doc comment shows consumers composing multiple `<Kbd>` inside an external `<span className="flex gap-1">`, not a prop this component owns. Not invented here; a future `kbd-group` composite, if ever ratified, is a separate component. |
| Web Component target (`rafters-kbd`) | not in this scope (astro-only port; WC performance stays open, same debt as the other articles) |

## Open

- React performance (`kbd.tsx`) -- not built in this scope. Matrix line:
  `frameworks.behaviorLayer.react` stays `missing`.
- WC performance -- same debt as the other articles.
- Astro performance shipped (`kbd.astro`): a thin wrapper over
  `kbd.classes.ts`'s fixed decoration, no client runtime, no effects
  (Spec 03). Conformance (`kbd.astro.conformance.test.ts`, container's
  standalone `AstroContainer` pattern) wraps the render in `<main>` for
  axe's region rule -- kbd is inline content, not a landmark, and the
  isolated test scaffold has no surrounding prose to carry one (same fix
  as `grid.astro.conformance.test.ts`).
- Static-score conformance is thinner than interactive articles: element
  identity + decoration assertions + axe. No interaction tier exists to
  run.
