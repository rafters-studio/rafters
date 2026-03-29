# Spacing in Rafters

Spacing is the silence between words. Too little and the interface feels cramped. Too much and elements lose their relationship. The right amount communicates grouping, hierarchy, and breathing room without the user noticing it at all.

Developers never set padding or margin directly. The system handles it.

## Two Primitives Drive Everything

The entire spacing system derives from two values:

| Primitive | Default | Purpose |
|-----------|---------|---------|
| `baseSpacingUnit` | 4px | The atomic unit. Every measurement is a multiple of this. |
| `progressionRatio` | minor-third (1.2) | The mathematical ratio that generates the scale. |

Change `baseSpacingUnit` from 4 to 5 and every spacing token in the system recalculates. Change `progressionRatio` from minor-third to perfect-fourth (1.333) and the scale stretches -- small values stay close together, large values spread further apart. The progression is musical: the same ratio that creates harmonious intervals in a chord creates harmonious spacing in a layout.

## The Scale

Spacing tokens use `calc()` with `var()` references so changes cascade through CSS:

```css
--rafters-spacing-base: 0.25rem;              /* 4px */
--rafters-spacing-1:    var(--rafters-spacing-base);           /* 4px */
--rafters-spacing-2:    calc(var(--rafters-spacing-base) * 2); /* 8px */
--rafters-spacing-4:    calc(var(--rafters-spacing-base) * 4); /* 16px */
--rafters-spacing-8:    calc(var(--rafters-spacing-base) * 8); /* 32px */
```

The multipliers range from 0 (zero spacing) through 0.5, 1, 1.5, 2, up to 96 (384px at the default base). Each multiplier has a semantic meaning:

| Range | Purpose |
|-------|---------|
| 0-1 | Micro spacing: icon gaps, tight inline elements |
| 1.5-4 | Component internals: padding inside buttons, form field gaps |
| 5-12 | Section spacing: card padding, list gaps, breathing room |
| 14-32 | Layout gaps: section margins, page padding |
| 36-96 | Page-level: hero sections, major structural breaks |

## Container Owns Page Spacing

The `Container` component controls content boundaries. It sets max-width, horizontal padding, and vertical rhythm. Developers pick a semantic element and a size:

```tsx
<Container as="main" size="6xl" padding="6">
  <Container as="article">
    <h1>Title</h1>
    <p>Content with automatic typography spacing.</p>
  </Container>
</Container>
```

Container handles:
- **Max-width** via size prop (sm through 7xl, or full)
- **Internal padding** via the spacing scale
- **Vertical rhythm** via gap when children are present
- **Centering** via auto margins
- **Semantic HTML** -- `main`, `section`, `article`, `aside`, or `div`

The `article` variant enables automatic prose typography. Headings, paragraphs, lists, and code blocks get proper spacing without any additional classes.

Spacing happens inside containers (padding), never outside (margins). Parent components control the gap between children. This eliminates margin collapsing bugs and makes layouts predictable.

## Grid Owns Arrangement

Grid provides layout structure with preset patterns:

| Preset | Layout |
|--------|--------|
| `sidebar-main` | Fixed sidebar + fluid main content |
| `form` | Label-input pairs in structured rows |
| `cards` | Responsive card grid with consistent gaps |
| `row` | Horizontal arrangement with wrapping |
| `stack` | Vertical arrangement with consistent gaps |
| `split` | Equal halves side by side |

Grid gaps come from the spacing scale. The grid never sets padding -- that is the Container's job. Grid handles arrangement, Container handles boundaries.

## The calc() Cascade

Every spacing token references `spacing-base` through `calc()`. This creates a live dependency:

```
spacing-base (0.25rem)
  -> spacing-1  = spacing-base * 1
  -> spacing-2  = spacing-base * 2
  -> spacing-4  = spacing-base * 4
  -> spacing-8  = spacing-base * 8
  -> spacing-16 = spacing-base * 16
```

Override `--rafters-spacing-base` in a theme and every token updates through CSS custom property resolution. No rebuild, no regeneration. The cascade is live.

This is why the system uses `calc(var(--rafters-spacing-base) * N)` instead of pre-computed rem values. A pre-computed `1rem` for spacing-4 would not respond to a base change. The `calc()` expression preserves the mathematical relationship at runtime.

## Why Token References, Not Hardcoded Values

```css
/* Wrong */
padding: 16px;
gap: 8px;

/* Right */
padding: var(--rafters-spacing-4);
gap: var(--rafters-spacing-2);
```

Hardcoded values create three problems:

1. **They don't cascade.** Changing the base unit requires finding and updating every instance.
2. **They break the scale.** A developer picks 14px because it "looks right," but 14px sits between spacing-3 (12px) and spacing-4 (16px). It breaks the harmonic relationship.
3. **They fragment the system.** Twenty developers making twenty "looks right" decisions produces twenty different spacing values where there should be six.

Token references enforce the scale. The system has opinions about which values exist. If the value you need isn't in the scale, the answer is usually that you need a different value, not a new token.

## The Progression Metadata

The spacing system exposes its own mathematics as a metadata token:

```json
{
  "ratio": "minor-third",
  "ratioValue": 1.2,
  "baseUnit": 4,
  "sample": [0, 4, 4.8, 5.76, 6.91, 8.29]
}
```

This metadata is available to AI agents via the MCP tools. When an agent asks "what spacing should I use between these elements?" it can read the progression and pick the mathematically correct value rather than guessing.
