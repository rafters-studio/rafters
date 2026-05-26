---
name: rafters-frontend
description: Use when building frontend UI in a Rafters project -- enforces the assembly model (composites first, components second, native HTML inside Container article-mode) and prohibits any agent-side design choice.
version: 2.0.0
user-invocable: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent
---

## Core Rule

**The system makes design choices. The agent assembles.**

This is the entire reason Rafters exists. Color, spacing, size, weight, radius, shadow, hierarchy, layout rhythm -- all owned by the system. The agent's job is to pick the right pre-made piece for the content and intent. Not to author visual decisions.

## Assembly Order

1. **`rafters_pattern`** -- start here. Search by what the page or section SOLVES (e.g. `solves: "authentication"`, `solves: "data entry"`, `solves: "navigation"`). Returns composites with designer intent + do/never + block structure.
2. **`rafters_composite`** -- get a specific composite by ID, category, or fuzzy query. The composite's blocks carry their own `variant`, `size`, layout meta -- render them verbatim.
3. **`rafters_component`** -- only when no composite covers the case. Returns component intelligence with do/never and the JSDoc guidance for variant/size choice in that exact situation.
4. **`rafters_rule`** -- validation rules for forms (required, email, password, credentials, etc.).

If a question has a composite answer, the answer is the composite. Do not reach for `rafters_component` to assemble a custom version of something a composite already covers.

## Content Goes Inside `Container as="article">`

Native HTML, no classes, no Typography imports:

```tsx
<Container as="article">
  <h1>Page Title</h1>
  <p>Body paragraph.</p>
  <blockquote>A pull quote.</blockquote>
  <ul>
    <li>List item</li>
  </ul>
  <p>Inline <code>code</code> in prose.</p>
</Container>
```

The container's typography composite system styles every native element correctly via the token system. You do not need to import `H1`, `P`, `Small`, `Code` -- those exist for narrow edge cases outside content regions. Inside an article container, native HTML is the right path.

**Never:**
- `<h1 className="text-4xl font-bold">` -- the class is the bug; bare `<h1>` is correct
- `<P size="sm" color="muted">` -- depromoted; write `<p>` inside an article container instead
- `<H1>` imports for content

## Layout: Container + Grid

```tsx
<Container as="main">
  <Container as="section">
    <h2>Section title</h2>
    <Grid preset="cards">
      <Card>...</Card>
      <Card>...</Card>
      <Card>...</Card>
    </Grid>
  </Container>
</Container>
```

Container owns max-width, padding, and gap. Grid owns column structure and column gap. No flex utilities, no grid utilities, no gap/p/m utilities. The components handle it.

| Grid preset | Use for |
|---|---|
| linear | Equal-priority columns |
| golden | Hierarchical (2:1 ratio) |
| bento | Asymmetric showcase |
| cards | Responsive card flow |
| sidebar | Sidebar + main |
| form | Label/input pairs |
| row | Horizontal group |
| stack | Vertical sequence |
| split | Equal columns |

## Components: Affordances

`Card`, `Button`, `Alert`, `Empty`, `Badge`, `Input`, `Field`, `Tabs`, `Tooltip`, `Dialog`, etc. -- these are the affordances composites assemble from. Use them WHEN there is no composite. When a composite exists, the composite's block list tells you which components to render and which `variant` / `size` to pass.

When falling through to `rafters_component`:
- The component's JSDoc + `usagePatterns` tell you when each variant is correct
- `variant` is a SEMANTIC choice driven by the JSDoc -- not an aesthetic preference (no choosing "ghost vs link" because you like it; the JSDoc tells you which fits the situation)
- Wrong: "Let's make this Button look subtle, so `variant=ghost`"
- Right: "This is the secondary action in a card footer; the Button JSDoc says secondary actions in card footers use `variant=secondary`"

## Hard Rules -- Never

- **No utility classes for visual properties.** No `bg-*`, `text-*`, `border-*`, `font-*`, `rounded-*`, `shadow-*`, `w-*`, `h-*`, `p-*`, `m-*`, `gap-*`, `flex`, `grid`, `items-*`, `justify-*`. None.
- **No `var(--rafters-*)` in any file.** The exporter wires the CSS variables; the consumer NEVER references them directly.
- **No `cn()` / `twMerge()`.** Use `classy()` if you need conditional classes (rare; usually means you are reaching for something a component should own).
- **No `class=` / `className=` on Rafters components.** Use the component's token props (`variant`, `size`, etc.) -- AS DICTATED by the composite manifest or the component's JSDoc, not as a free choice.
- **No wrapper `<div>` around Rafters components.** Components include their own spacing and sizing.
- **No editing files in `lib/primitives/` or `components/ui/*.classes.ts`.** These are installed by `rafters add`. Fix consuming code or file an upstream bug.
- **No arbitrary values.** No `text-[14px]`, no `bg-[#hex]`, no `w-[300px]`.
- **No raw `<h1>` / `<p>` / `<span>` with classes.** Either you are inside `<Container as="article">` (where bare native HTML is correct) or you are using a component.

## What the Agent Actually Decides

- Information architecture: what content goes on a page, in what order
- Composite selection: which pre-made pattern fits this content and intent
- Component selection (fallback): which affordance when no composite exists
- Interaction flow: routing, state transitions, data wiring
- Content: the actual words and data the user reads

Everything else -- size, color, spacing, weight, radius, shadow, hierarchy, layout rhythm, variant aesthetics -- the system owns.
