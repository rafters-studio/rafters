---
name: rafters-frontend
description: Use when building frontend UI in a Rafters project -- enforces the assembly model (composites first, components second, native HTML inside Container article-mode) and prohibits any agent-side design choice.
version: 0.2.3
user-invocable: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# The system makes design choices. You assemble.

Color, spacing, size, weight, radius, shadow, hierarchy, layout rhythm -- all
owned by the system and already decided. Your job is to pick the right pre-made
piece for the content and intent, and put real content in it. You never author a
visual decision. This is not a guideline -- a write-time hook **denies** any edit
that contains a hand-authored visual choice. Assemble and it ships; design and it
is rejected.

## Gate: query before you write

You do not know this design system from training; you read it from the MCP, every
time. **Before writing any UI, you must have (a) read the project's intent and
attention budget from `.rafters/config.rafters.json`, and (b) queried the MCP for
the piece you are about to render.** If you have not, you are not ready to write.
Designing a layout or picking a color "from memory" is the one failure that
produces non-rafters code.

## The project's recorded intent and attention budget

Two project-level constraints live in `.rafters/config.rafters.json`, recorded by
the designer during Studio onboarding. They are inputs you honor, not choices you
make.

- **Intent** (`config.intent`) -- the project's declared personality and
  constraints (elegant company, tech product, personal blog, zine...). This is the
  *designer's* taste, not yours. It narrows which composite or density fits: a zine
  and a banking app solve "landing page" differently, and the intent tells you
  which. Select to match the recorded intent; never substitute your own.
- **Attention economics** (`config.attentionBudget` -- the cognitive-load
  budget) -- how much attention this project will spend on a screen. Every
  composite and component carries a cognitive-load score; the sum of what you place
  on a page must stay within the budget. When you are over, do **not** trim styling
  -- drop or defer content, split the page, or choose a leaner composite. The
  system is allowed to say a screen is too busy; respect it.

If a field is absent (onboarding has not run), proceed with the composite the
manifest provides and a sensible default budget -- do not invent values. (Deep
budget scoring will move to a dedicated sub-agent later; for now, stay within the
recorded budget by judgment.)

## Decision procedure

For each thing you need to render, in order:

1. **Is it prose/content** (headings, paragraphs, lists, quotes)? → put it inside
   `<Container as="article">` as **bare native HTML**, no classes, no imports.
2. **Is it a page or section that solves a known problem** (auth, data entry,
   navigation, pricing...)? → `rafters_pattern` `{ solves: "..." }`, then
   `rafters_composite` for the match. **Render its blocks verbatim** -- each block
   carries its own `variant`/`size`/layout meta. The manifest is the decision.
3. **Is it a single affordance with no composite** (a lone button, badge)? →
   `rafters_component`. Use the `variant`/`size` its JSDoc + `usagePatterns`
   dictate for this exact situation.
4. **Does rafters genuinely not ship the affordance?** → author a custom component
   in `src/components/` (see bottom), where the rules relax.

If a request has a composite answer, the answer is the composite. Do not drop to
`rafters_component` to hand-build something a composite already covers. (Rules for
forms -- required, email, etc. -- arrive on the composite's block `rules`, not a
separate tool.)

## Content: `<Container as="article">`

```tsx
<Container as="article">
  <h1>Page Title</h1>
  <p>Body paragraph with inline <code>code</code>.</p>
  <blockquote>A pull quote.</blockquote>
  <ul><li>List item</li></ul>
</Container>
```

The container's typography system styles every native element through the token
system. Do not import `H1`/`P`/`Small`/`Code` for content, and do not pass them
`size`/`color` -- bare native HTML inside the article container is correct.

## Layout: Container + Grid

```tsx
<Container as="main">
  <Container as="section">
    <h2>Section title</h2>
    <Grid preset="cards"><Card>...</Card><Card>...</Card></Grid>
  </Container>
</Container>
```

Container owns max-width, padding, gap. Grid owns columns and column gap.

| Grid preset | Use for |
|---|---|
| linear | Equal-priority columns |
| golden | Hierarchical (2:1) |
| bento | Asymmetric showcase |
| cards | Responsive card flow |
| split | Equal columns |
| sidebar | Sidebar + main |
| form | Label/input pairs |
| row | Horizontal group |
| stack | Vertical sequence |

## Variant is semantic, never aesthetic

When you fall through to `rafters_component`, the `variant` is dictated by the
JSDoc for the situation -- not chosen because you like how it looks.

- Wrong: "make this button subtle, so `variant=ghost`"
- Right: "this is the secondary action in a card footer; the JSDoc says that is
  `variant=secondary`"

## Never -- and what to do instead

Every row here is a write the hook rejects. Pre-empt it.

| Never (assembly code) | Instead |
|---|---|
| `cn(...)` / `twMerge(...)` | `classy(...)` (rarely needed -- usually a component should own it) |
| arbitrary values: `w-[300px]`, `text-[14px]`, `bg-[#hex]` | design tokens |
| `flex`, `grid`, `gap-*`, `items-*`, `justify-*` | `Container` / `Grid` |
| `p-*`, `m-*`, `px-*`, `mt-*` ... | `Container` owns spacing |
| `bg-primary`, `text-destructive`, `border-success` ... | composite block `variant`, or component `variant` prop per JSDoc |
| `text-sm`, `text-4xl`, `font-bold` ... | native HTML inside `<Container as="article">`, or the composite |
| `rounded-*`, `shadow-*`, `w-[0-9]`, `h-*`, `max-w-*` ... | component-owned; don't set them |
| `var(--rafters-*)` anywhere | never -- the exporter wires variables; consumers don't reference them |
| `class=`/`className=` on a Rafters component | its token props (`variant`, `size`, ...) |
| `<div className="...">` wrapping `<Button>`/`<Input>`/`<Card>`/`<Select>`/`<Dialog>` | components include their own spacing -- no wrapper |
| `<h1>`/`<p>`/`<span>` **with classes** | bare native HTML inside `<Container as="article">`, or a component |
| editing `lib/primitives/` or `components/ui/*.classes.ts` | read-only (installed by `rafters add`); fix consuming code or file upstream |

## The one exception: authoring a custom component

Only when rafters does not ship the affordance. It lives in `src/components/`
(NOT `src/components/ui/`, which is rafters-installed, read-only). There you DO
write class strings, DO use `classy()` for conditional merging, and DO reference
semantic tokens via Tailwind utilities (`bg-primary`, `text-foreground`) -- that
is how a custom component hooks into the token system.

```tsx
// src/components/FeatureTile.tsx
import { classy } from '@rafters/ui/classy';
import type { ReactNode } from 'react';

/** Compact feature card. @cognitive-load 2/10 @accessibility AAA */
export function FeatureTile({ highlighted, children }: { highlighted?: boolean; children: ReactNode }) {
  return (
    <div className={classy('rounded-lg p-6', highlighted ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground')}>
      {children}
    </div>
  );
}
```

Still banned even when authoring: `var(--rafters-*)`, arbitrary values,
`cn()`/`twMerge()`. Assembly code (pages, layouts, routes) gets none of these
relaxations.

## Before you finish

1. Every visible piece traces to: a composite, a component, or native HTML inside
   `<Container as="article">`. Nothing visual was hand-authored in assembly code.
2. No row of the Never table appears in what you wrote.
3. The composites/variants you chose match the project's recorded `intent`, and
   the composition stays within `attentionBudget` (split or trim content, never
   styling, if over).
4. You can name the MCP intelligence (designer intent, do/never, JSDoc) and the
   config intent/budget behind each choice -- not your own taste.
