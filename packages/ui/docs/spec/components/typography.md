# Component Spec — Typography

Status: DRAFT. A STATIC score in the grain of Container: no state, no actions,
no keymap, no effects. The semantic text set (H1–H6, P, Code, Small,
Blockquote, List, and the presentational variants) proves the static grain
scales to a *set* of elements — one score decides structure (variant → tag),
the classes file carries the whole view, and each performance is pure
decoration application (no `useMemory`, no controller, no composed primitives).

Files (`src/components/typography/`):

```
typography.behavior.ts   typography.classes.ts   typography.tsx
typography.element.ts     typography.astro
```

## Purpose

The one text set. Agents never hand-roll `<h1 class="text-4xl font-bold …">`;
they reach for `H1`, `P`, `Code`, `Blockquote`, `Ul`/`Li`, and token props tune
individual dimensions. There is no raw class surface — every utility comes from
the resolver.

## Composition

- **React**: named components — `H1`–`H6`, `P`, `Lead`, `Large`, `Muted`,
  `Small`, `Code`, `CodeBlock`, `Blockquote`, `Mark`, `Abbr`, `Ul`/`Ol`/`Li`
  (`List` aliases `Ul` for shadcn parity), plus a generic `Typography` with
  `as`/`variant`. A factory builds each named component (DRY construction, not a
  decision surface).
- **Web Component**: `<rafters-typography variant="…">` renders the variant's
  tag inside a shadow root (RaftersElement), carrying the shared composed
  classes. Unknown `variant` falls back to `p` — never throws.
- **Astro**: `<Typography as="…" variant="…">` renders the element through
  Astro's dynamic-tag support (one tag, not the oracle's branch-per-element).

## Config / state / actions

- **Config**: `variant` (or, on the generic wrapper, `as` which derives the
  variant) plus the eight token-prop dimensions —
  `size` `weight` `color` `line` `tracking` `family` `align` `transform`.
- **State**: none. `initialState()` returns `{}`.
- **Actions**: none. `canDispatch()` is `true` (there is nothing to gate).

## Structure contract

- The **variant chooses the semantic element** (`variantToTag`): headings are
  real `h1`–`h6`, `blockquote` is a real quotation, lists are real lists,
  `code`/`mark`/`abbr` carry native semantics. `codeblock` renders `pre` and
  nests a `code`.
- The **element IS the accessibility contract** — which is why the score's ARIA
  projection is empty and the conformance suite asserts the *element*, not a
  projected role.
- **Token props replace, never append.** Defaults are stored dimensionally so an
  override swaps the matching dimension (`size="2xl"` on `H1` replaces
  `text-4xl`, and suppresses the CQ `@lg:text-5xl` on that same dimension). A
  non-size override leaves the CQ default surviving. This dodges the Tailwind
  alphabetical-cascade trap (`text-accent` would otherwise lose to
  `text-foreground`).
- **`color` is a fill signature** (#1637), not a raw utility: a plain word emits
  `text-{word}`; an invalid signature emits nothing. Same contract as
  Container/Card.
- **h5/h6 borrow h4.** The variant scale stops at h4; `H5`/`H6` (and `as="h5"`
  /`"h6"`) render their own tag with h4's classes. `span` reads as body (`p`).

## Parts + ARIA

| Part | Element | Role | ARIA |
| --- | --- | --- | --- |
| `root` | the variant's semantic tag | native | none projected — the element carries the meaning |

## Keyboard + effects

None. A static text set has no interaction tier and no impure work: no keymap,
and (Spec 03 is gone) no effects. The score composes no primitives.

## Oracle dispositions (src/old/ui/typography.{tsx,classes.ts,element.ts,astro})

| Oracle feature | Disposition |
| --- | --- |
| variant vocabulary (h1–h4, p, lead, large, small, muted, code, codeblock, blockquote, mark, abbr, ul, ol, li) | contract — ported verbatim in `typography.classes.ts` |
| dimensional token props (size/weight/color/line/tracking/family/align/transform) | contract |
| `color` as a fill signature (#1637) | contract |
| variant → tag map + `p` fallback (`resolveVariant`) | contract — moved onto the score |
| `as`-element → variant derivation (span→p, h5/h6→h4) | contract — moved onto the score as `variantForElement` |
| h5/h6 as tags (no own variant scale) | ported as-is — h5/h6 render their tag with h4 classes |
| generic `<Typography as … variant …>` | contract |
| named per-tag components (H1…, P, Code, …) | contract — React factory; Astro's per-tag `.astro` files collapse into one dynamic tag |
| editable / contenteditable / `onChange` / `onEnter` / `onBackspaceAtStart` / placeholder | **stripped** — block-editor concern, belongs in a studio-layer wrapper (matches Container's editable strip). `Fill, not background. No editor props.` |
| `InlineToolbar` / `SlashMenu` / `SelectionInfo` / inline-mark rich text | **stripped** — editor surface, not the text set |
| `CodeBlock` `language` / `showLineNumbers` | dropped — syntax highlighting + gutter are a studio/highlighter concern; `CodeBlock` renders `pre > code` only |
| `Lead`/`Large`/`Muted`/`Mark`/`Abbr` presentational variants | contract — exposed as React named components; present in every framework's class vocabulary |

## WCAG obligations (author-owned)

- Follow heading order — H1 once per page, never skip a level. The component
  renders the tag it is told; hierarchy discipline is the author's.
- Do not use headings for styling only — use `P` with token props (`lead`,
  `muted`, `large`) for visual weight without structural meaning.
- Token-driven color must meet contrast; `color` resolves design tokens, but the
  author owns the pairing.

## Open

- The article-flow utilities Container bakes for `as="article"` still point at
  raw sizes, not the Typography role tokens; repointing both at shared display/
  title/body role tokens is a designer pass (flagged on Container, not done
  here).
- `CodeBlock` line numbers / syntax highlighting await a highlighter primitive.
