---
name: rafters-frontend
description: Use when building or changing UI in a Rafters project. Rafters resembles Tailwind and shadcn but inverts them -- the designer's judgment is encoded in the components, so you compose patterns instead of authoring visual values. Supersedes generic frontend-design guidance inside a Rafters project.
version: 0.2.3
user-invocable: true
---

# This is not Tailwind, and it is not shadcn

It looks like both. The class names are familiar, the components have the names
you expect, and every instinct you have says open a `div`, reach for
`flex gap-4 p-6`, pick a color. Those instincts are why this file exists.

Rafters carries one designer's judgment. That judgment is not written down as
prose you can read. It is **encoded** in the token values -- this radius, this
chroma, this type ratio -- and it is **applied** in the components and
composites, which are those tokens composed for a purpose.

That distinction is the whole thing:

- **Reach for a pattern** (a composite, a component, a variant) and the judgment
  comes with it.
- **Reach past it to a raw value** (`bg-primary`, `text-4xl`, `gap-4`) and you
  get a value with the judgment stripped off. Not forbidden because color is
  sacred -- wrong because the decision that made that value *mean* something
  stayed behind in the pattern you skipped.

## What this frees you to do

Your pattern instinct is good and this system wants it. What it does not want is
the vocabulary your instinct arrives with: the averaged taste of every site in
your training data. Real knowledge, no opinion, by construction.

So keep the reasoning and swap the vocabulary. You will never know whether 14px
or 16px is right here -- you cannot see, and reasoning about a rendering returns
what you reasoned, not what is there. Effort spent on that axis is spent where
you are blind.

Spend it here instead:

- Is this screen asking the reader to hold too much at once?
- Do the reading order and the priority order agree?
- Does this form ask for the hardest thing first?
- Is this one page, or two?
- Which composite actually solves this problem?
- Which variant fits *this* situation, per its recorded intent?

Those are cognitive problems. They are hard, they are what gets neglected while
you are busy picking hex values, and they are squarely what you are good at.

## Cognitive load is your instrument

`.rafters/config.rafters.json` carries two designer-set constraints. Read them
before you write anything.

- `intent` -- the project's declared personality (elegant company, tech product,
  zine). Narrows which composite and which density fit; a zine and a banking app
  solve "landing page" differently. Match it, never substitute your own.
- `attentionBudget` -- how much attention this project spends on a screen. Every
  component and composite carries a cognitive-load score, and the sum of what you
  place must stay inside it.

Over budget, you cut **content** -- never styling. Drop it, defer it, split the
page, or choose a leaner composite. A screen being too busy is a real finding and
the system is allowed to say so. This is the main lever you have; using it well
is the job.

If either field is absent, proceed with what the manifest gives you. Do not
invent values.

## The MCP

Three tools. Query before you write -- you do not know this system from training,
and no version of it exists in your priors.

- `rafters_workspaces` -- lists workspaces. Call first if this might be a monorepo.
- `rafters_describe` -- the intel graph, walkable like a filesystem. `describe()`
  for the installed surface, `describe(button)` for a node, `describe(button.*)`
  to expand its props in one call, `describe(button.props.variant)` to drill.
  Nodes carry `parent` and `siblings`, so you can move up and sideways. Do/never,
  cognitive load, and accessibility live here.
- `rafters_generate` -- a component name in, that component's verbatim snippet out.

The old `rafters_component`, `rafters_composite`, and `rafters_pattern` are
deprecated aliases for `describe`. Do not use them.

## How to use it

For each thing you render, in order:

1. **Prose or content** (headings, paragraphs, lists, quotes) -- bare native HTML
   inside `<Container as="article">`. No classes, no imports; the container's
   typography styles every native element through the token system.
2. **A section that solves a known problem** (auth, data entry, navigation,
   pricing) -- `describe(composites)` for the roster, `describe(<id>)` for the
   match. Render its blocks verbatim; each block carries its own variant, size,
   and layout meta. The manifest is the decision.
3. **A lone affordance no composite covers** (one button, one badge) --
   `describe(<component>)` for its intel, then `generate` for the snippet. The
   variant is dictated by the situation and the component's recorded intent,
   never by how it looks to you.
4. **Something rafters genuinely does not ship** -- author it in
   `src/components/` (see below).

If a composite covers it, the composite is the answer. Do not drop to step 3 to
hand-build what step 2 already solved.

## Layout

`Container` and `Grid`. Not a `div` with a class string.

```tsx
<Container as="main">
  <Container as="section">
    <h2>Section title</h2>
    <Grid preset="cards"><Card>...</Card><Card>...</Card></Grid>
  </Container>
</Container>
```

Container owns max-width, padding, and gap. Grid owns columns and column gap.

| preset | for |
|---|---|
| linear | equal-priority columns |
| golden | hierarchical (2:1) |
| bento | asymmetric showcase |
| cards | responsive card flow |
| split | equal columns |
| sidebar | sidebar + main |
| form | label/input pairs |
| row | horizontal group |
| stack | vertical sequence |

## Never -- and it is all one rule

Every row is a write the hook rejects, and every row is the same move: reaching
past a pattern to a raw value.

| Never in assembly | Instead | What it drops |
|---|---|---|
| `flex`, `grid`, `gap-*`, `items-*`, `justify-*` | `Container` / `Grid` | the spatial system |
| `p-*`, `m-*`, `px-*`, `mt-*` | `Container` | the spacing rhythm |
| `bg-primary`, `text-destructive`, `border-success` | composite block variant, or component `variant` | what that color *means* here |
| `text-sm`, `text-4xl`, `font-bold` | native HTML in `<Container as="article">` | the type scale |
| `rounded-*`, `shadow-*`, `w-*`, `h-*`, `max-w-*` | component-owned; leave them | the radius and depth decisions |
| `w-[300px]`, `text-[14px]`, `bg-[#hex]` | tokens | everything -- these are outside the system |
| `class=`/`className=` on a rafters component | its token props | the component's own composition |
| `<h1>`/`<p>`/`<span>` with classes | bare native HTML in article mode | the typography system |
| `<div className="...">` wrapping `<Button>`/`<Card>`/`<Input>` | nothing -- they carry their own spacing | |
| `cn(...)` / `twMerge(...)` | `classy(...)` | |
| `var(--rafters-*)` | never -- the exporter wires these | |
| editing `lib/primitives/` or `components/ui/*.classes.ts` | fix your code, or file upstream | (installed by `rafters add`) |

## Authoring a custom component

Only when rafters does not ship the affordance. It goes in `src/components/` --
not `src/components/ui/`, which is rafters-installed and read-only.

Here the rules invert, and for a reason: you are **building** a pattern rather
than consuming one, so you are the one applying tokens to a purpose. Write class
strings, use `classy()` for conditional merging, reference semantic tokens.

```tsx
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

Still banned even here: `var(--rafters-*)`, arbitrary values, `cn()`/`twMerge()`.
Assembly code gets none of these relaxations.

## Before you finish

1. Did you solve the cognitive problem, or only render the request? Name what the
   screen asks the reader to hold.
2. Does the composition fit `attentionBudget`? If you went over, you cut content
   -- not styling.
3. Does every choice match the recorded `intent` rather than your own taste?
4. Does every visible thing trace to a composite, a component, or native HTML
   inside `<Container as="article">`?
