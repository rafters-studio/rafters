# Component Spec — Container

Status: DRAFT. Fourth test article, first STATIC score: no state, no
actions, no keymap, no effects. Proves the grain scales down — the score
survives as the structure contract the harness audits, the classes file
carries everything, and the performance is pure decoration application
(no useBehavior, no memory).

Files (`src/components/container/`):

```
container.classes.ts    container.behavior.ts    container.tsx
```

## Purpose

The div-soup killer. One element that owns semantic structure, width,
internal spacing, and layout flow, so agents never hand-roll wrapper divs.

## Rulings (Sean, 2026-07-03)

1. **Grid mode: one tag, container + grid.** `columns` (same 1–12 /
   responsive / auto vocabulary as Grid linear) puts children on a grid;
   `gap` then means grid gap. Presets stay Grid's — equal columns is layout
   plumbing (Container), unequal attention is design (Grid).
2. **Layout modes are exclusive and mechanical:** `columns` → grid mode;
   no columns + `gap` → vertical stack (flex-col; `gap=true` derives from
   size by walking the spacing scale); neither → plain block.

## The structure contract

- `as` chooses the semantic element; landmarks are NATIVE (main, header,
  footer, aside; section + aria-label = named region). The score projects
  nothing — the element IS the contract, and the conformance suite asserts
  it with axe landmark checks.
- Spacing happens inside (padding/gap), never margins.
- CQ provider by default (`@container w-full`, the TW v4 width-collapse
  guard); sized containers center and carry CQ-responsive edge padding.
- `position`/`depth` map to the token vocabulary so agents never write raw
  sticky/z-index utilities. `colSpan`/`rowSpan` self-place inside any grid.
- `queryName` → `containerName` inline style: the ONE style channel, ruled
  narrowly (arbitrary-value classes are banned; CQ names cannot be
  literal classes). Needs formal ratification as a contract note.

## Oracle dispositions (src/old/ui/container.{tsx,classes.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| as/size/padding/gap/query/queryName/colSpan/rowSpan/position/depth | contract |
| `fill` signature (#1637, build-time safelist gate) | contract |
| `background` legacy enum | dropped — superseded by fill (pending ratification) |
| article typography flow + max-w-prose | ported VERBATIM — raw sizes, not the typography role utilities; repointing is a designer pass, flagged, not done |
| editable / showDropZone / DropZonePlaceholder / onBackgroundChange | stripped — block-editor concern, belongs in a studio-layer wrapper (pending ratification); onBackgroundChange was a void'd dead callback |
| position sticky/fixed bake top-anchored offsets | ported as-is; sticky-bottom impossible through the prop — flagged |

## Open

- WC + Astro performances (same debt as the other articles).
- Static-score conformance is thinner than interactive articles: element
  contract + classes assertions + axe. No interaction tier exists to run.
