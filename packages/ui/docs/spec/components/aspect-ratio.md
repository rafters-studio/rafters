# Component Spec — AspectRatio

Status: DRAFT. Static score, no behavior file: the entire config is
`ratio?: number`, and there is no aria projection to encode -- content
inside the box carries its own semantics (an `img` brings its own `alt`,
an `iframe` its own `title`). Where `container.behavior.ts` exists to
centralize a large shared Config type (sizes, paddings, positions, depths,
elements, columns, spans) across `.astro`/`.tsx`/`.classes.ts`, AspectRatio
has one field, so there is nothing to centralize.

Files (`src/components/aspect-ratio/`):

```
aspect-ratio.classes.ts    aspect-ratio.astro
```

## Purpose

Ratio-locked box. Constrains children to a fixed width/height ratio so
images, video embeds, and iframes reserve layout space before they load
(no cumulative layout shift).

## The structure contract

- `ratio` (default `1`, a square) is the only config. It is data-driven --
  a caller-supplied number, not a fixed token -- so it cannot be a class
  (arbitrary-value utilities are banned) and cannot live in
  `aspect-ratio.classes.ts`. It rides the one narrow style channel instead,
  the same channel `container.astro`'s `queryName` -> `containerName`
  occupies: no inline style math beyond the ratio value itself.
  `style="aspect-ratio: <ratio>"`.
- The wrapper is `relative w-full` (positioned, full-width); slotted
  children are absolutely positioned to fill it
  (`[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full`). Both class
  strings are static -- no `config`/`state` branching -- so
  `aspect-ratio.classes.ts` exports constants, not a `(config, state) =>`
  function.
- No landmark, no role, no aria projection: the box is content, not a
  region. The conformance suite wraps renders in `<main>` before running
  axe so the region rule assesses the surrounding page, not this static.
- `data-part="root"` on the wrapper is the only structural hook; all
  consumer attrs (`class`, `data-*`, `aria-*`) pass through onto it.

## Oracle dispositions (`src/old/ui/aspect-ratio.{tsx,classes.ts,element.ts}`)

| Oracle feature | Disposition |
| --- | --- |
| `ratio` prop, default `1` | contract |
| `aspectRatioBaseClasses` / `aspectRatioChildFillClasses` | contract -- ported verbatim, no token-vocabulary changes needed (no color/fill classes in play) |
| React: `style={{ aspectRatio: ratio, ...style }}` (object-spread merge with consumer `style`) | framework-affordance -- React's object `style` prop supports merge natively; Astro's `style` is a string, so this performance follows `container.astro`'s precedent (spread order decides, no manual merge) rather than reproducing object-spread semantics |
| WC: per-instance adopted stylesheet (`aspect-ratio.element.ts`) encoding `.aspect-ratio { aspect-ratio: <ratio> }`, keeping the element style-attribute-free | framework-affordance -- shadow-DOM specific technique (styles can't cross the boundary as classes); not applicable to a server-rendered `.astro` wrapper, which has no shadow boundary to protect |
| WC: `parseRatio` accepting `"16/9"` fraction strings, decimal strings, and non-positive/non-numeric fallback to `1` | dropped for this tier -- Astro's typed `Props` takes `ratio?: number` directly (TypeScript enforces the type at the call site); the permissive string-parsing behavior is a custom-element attribute-string concern this performance does not have |
| `@cognitive-load 1/10`, `@attention-economics`, `@trust-building`, `@accessibility`, `@semantic-meaning`, `@usage-patterns` JSDoc intelligence tags | new-grain -- these tags are the React `.tsx`'s registry-parsed contract (Spec: "the `.tsx` JSDoc carries the four tags"); out of scope for this astro-only port, deferred to the react performance |

## Scope note

This port is Astro-only. The `.tsx` deliverable, the four JSDoc intelligence
tags the registry parses, and "shadcn drop-in parity" (shadcn/ui's
AspectRatio wraps Radix UI and exposes the same `ratio` prop shape our
oracle already matches) are React-performance concerns, deferred to a
future port. `frameworks.behaviorLayer.react` stays `missing`.

## WCAG 2.1 AA obligations (minimum bar)

- 1.1.1 Non-text Content: not this component's obligation -- slotted media
  (`img`, `iframe`) carries its own accessible name; AspectRatio is layout
  only.
- 1.4.10 Reflow / 2.4.11 Focus Not Obscured: not applicable -- no focusable
  content originates here.
- No ARIA obligations: no role, no state, nothing for axe to flag beyond
  whatever the slotted content itself introduces (asserted by wrapping
  conformance renders in a landmark and running axe against that).

## Conformance matrix

Binding: Astro (`aspect-ratio.astro` -- server-rendered, static; no
interaction tier exists, matching `container.md`'s "static-score
conformance is thinner than interactive articles" note). React and WC
bindings are out of scope for this port (see Scope note above).
