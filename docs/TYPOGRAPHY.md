# Typography in Rafters

Typography is not styling. It is the primary interface between the user and the content. Every text element in Rafters is a component with encoded intelligence -- line height, letter spacing, weight, and size are decisions, not suggestions.

## Components, Not Utility Classes

Developers do not apply `text-lg font-semibold leading-6 tracking-tight` to a `<p>` tag. They use a typography component:

```tsx
<H1>Page Title</H1>
<Lead>The summary that draws readers into the content.</Lead>
<P>Body text with proper line height and measure.</P>
<Muted>Secondary information that doesn't compete for attention.</Muted>
<Small>Fine print, metadata, timestamps.</Small>
<Code>inline code references</Code>
<Blockquote>Attributed quotations with proper indentation.</Blockquote>
```

The available components: `H1`, `H2`, `H3`, `H4`, `P`, `Lead`, `Large`, `Small`, `Muted`, `Code`, `Blockquote`.

Each component encodes the complete typographic specification. `H1` is not just "big text" -- it carries the font size, line height, letter spacing, weight, and margin relationships that make it function as a page-level heading. These values are derived from the design token system, not hardcoded.

## The Type Scale

Typography uses the same mathematical progression as spacing: minor-third (1.2) by default. The base font size (16px, derived from `baseSpacingUnit * 4`) is step 0. Each scale position is `base * ratio^step`:

| Scale | Step | Size | Line Height | Letter Spacing |
|-------|------|------|-------------|----------------|
| `xs` | -2 | ~11px | 1.6 | 0.01em |
| `sm` | -1 | ~13px | 1.5 | 0.005em |
| `base` | 0 | 16px | 1.5 | 0em |
| `lg` | 1 | ~19px | 1.4 | -0.005em |
| `xl` | 2 | ~23px | 1.35 | -0.01em |
| `2xl` | 3 | ~28px | 1.3 | -0.015em |
| `3xl` | 4 | ~33px | 1.25 | -0.02em |
| `4xl` | 5 | ~40px | 1.2 | -0.025em |
| `5xl`-`9xl` | 6+ | 48px+ | 1.1 | -0.03em |

Notice the inverse relationship: as font size increases, line height decreases and letter spacing goes negative. Large text needs tighter tracking because the letter forms are already legible at size. Small text needs looser tracking because the strokes are harder to distinguish.

## Why text-sm and text-xs Are Accessibility Concerns

WCAG AAA requires that text be perceivable. Our research found that text below 14px (the `sm` scale position) creates readability issues for users with low vision, even when contrast requirements are met.

`xs` (approximately 11px) exists in the scale because metadata, timestamps, and legal footnotes sometimes require it. But the typography components enforce guardrails:

- `Small` carries a semantic signal that this text is secondary. Screen readers can convey this distinction.
- `Muted` combines reduced size with reduced contrast, compounding the accessibility risk. It is never used for content the user needs to read to complete a task.
- The APCA contrast calculations in the color system adjust minimum font sizes based on contrast ratio. Lower contrast requires larger text.

The system does not prevent developers from using small text. It makes the consequences visible and the alternatives obvious.

## Encoded Properties

Each typography token includes three linked values:

```
font-size-lg:        1.188rem
line-height-lg:      1.4
letter-spacing-lg:   -0.005em
```

These are generated together and must be used together. A developer cannot change the line height of `lg` text without also getting the correct letter spacing. The typography components enforce this by referencing all three tokens as a unit.

Font weights are also tokenized:

| Weight | Value | Purpose |
|--------|-------|---------|
| `thin` | 100 | Decorative display text only |
| `light` | 300 | De-emphasized body text |
| `normal` | 400 | Default body text |
| `medium` | 500 | Subtle emphasis, labels |
| `semibold` | 600 | Headings, buttons, active states |
| `bold` | 700 | Strong emphasis, primary headings |
| `extrabold` | 800 | Display headings, hero text |
| `black` | 900 | Maximum weight, display only |

The system uses Noto Sans Variable as the primary font, which provides continuous weight interpolation across the full 100-900 range.

## Typography and Spacing Share a Root

Typography and spacing derive from the same two primitives: `baseSpacingUnit` and `progressionRatio`. This is intentional.

The base font size is `baseSpacingUnit * 4` (4px * 4 = 16px). The type scale uses the same minor-third progression as the spacing scale. This means:
- A heading's font size and its surrounding whitespace grow at the same rate
- The visual rhythm of text and space stays proportional across the scale
- Changing the progression ratio adjusts both typography and spacing together

This shared root is why Rafters layouts feel cohesive without manual tuning. The math guarantees that text and space are always in proportion.

## Container Article Typography

The `Container` component with `as="article"` enables automatic prose typography:

```tsx
<Container as="article">
  <h1>This heading gets H1 styling automatically</h1>
  <p>Paragraphs get proper body text treatment.</p>
  <ul>
    <li>Lists get appropriate spacing and markers.</li>
  </ul>
</Container>
```

Inside an article container, raw HTML elements receive the typography component styles without explicit component usage. This is the bridge between content-managed HTML (from a CMS or markdown processor) and the design system's typography decisions.

Outside of article containers, raw `<h1>` and `<p>` elements receive no styling. The system requires explicit intent.
