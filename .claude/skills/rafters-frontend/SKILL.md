---
name: rafters-frontend
description: Use when building frontend UI in a Rafters project -- enforces Container, Grid, typography components, and design token usage.
---

## Layout Is Solved

Container and Grid handle ALL layout. You do not write layout code.

```tsx
// WRONG
<div className={classy("flex gap-4 p-6")}>

// RIGHT
<Container>
  <Grid preset="sidebar-main">
    <aside>Sidebar</aside>
    <main>Content</main>
  </Grid>
</Container>
```

**Never use:** flex, grid, gap-*, p-*, m-*, items-*, justify-*

### Grid Presets

| Preset | Use for |
|---|---|
| sidebar-main | Navigation + content |
| form | Label/input pairs |
| cards | Responsive card grid |
| row | Horizontal group |
| stack | Vertical sequence |
| split | Equal columns |

## Typography -- Components, Not Utilities

| Instead of | Use |
|---|---|
| `<p className="text-sm text-muted-foreground">` | `<P size="sm" color="muted">` |
| `<p>` | `<P>` |
| `<h1 className="text-4xl font-bold">` | `<H1>` |
| `<h2>` | `<H2>` |
| `<h3>` | `<H3>` |
| `<span className="text-xs">` | `<Small>` |
| `<span className="text-lg font-semibold">` | `<P size="lg" weight="semibold">` |

## Color -- Tokens, Not Values

Use semantic tokens as Tailwind classes: `bg-primary`, `text-destructive`, `border-success`.
Never use hex, HSL, or palette internals.

## A Correct Page

```tsx
import { Container, Grid } from "@rafters/ui"
import { H1, P } from "@rafters/ui/components/ui/typography"
import { Card } from "@rafters/ui/components/ui/card"
import { Button } from "@rafters/ui/components/ui/button"

export default function Page() {
  return (
    <Container>
      <H1>Title</H1>
      <P size="xl">Description.</P>
      <Grid preset="cards">
        <Card>...</Card>
        <Card>...</Card>
      </Grid>
      <Grid preset="row">
        <Button variant="secondary">Cancel</Button>
        <Button>Save</Button>
      </Grid>
    </Container>
  )
}
```

No flex. No gap. No padding. No text utilities.
