# Typography

Text is the interface. If the hierarchy isn't clear in the typography alone, no amount of color or spacing saves it.

## Components, Not Classes

Every text element uses a typography component. `H1` through `H6`, `P`, `Lead`, `Large`, `Small`, `Muted`, `Code`, `Blockquote`. The sizing, weight, tracking, line-height, and color are encoded in the component. The developer picks the semantic role, not the visual treatment.

This is deliberate. `text-sm text-muted-foreground font-medium tracking-wide` is five decisions an AI agent has no business making. `<Muted>` is one decision the designer already made.

## The Scale

Typography uses the same minor-third progression as spacing. The sizes are mathematically related, not hand-picked. This creates visual harmony between text and space -- the same ratio that determines paragraph padding determines the size difference between H2 and H3.

The sizes ship as fixed `rem` values. They come from the ratio, but changing `font-size-base` at runtime does not move them yet (#2647).

## Why Not text-sm

`text-sm` is one step below base, about 13.3px at the default scale. `text-xs` is two steps below, about 11.1px. Sustained reading at those sizes gets harder, especially for older readers.

Small text has its place. Timestamps, footnotes, legal copy. But it's a conscious choice with accessibility implications, not a default. The `<Small>` component exists for these cases. `text-xs` in a className does not.

## Each Component Has Intent

`<H1>` is the page. One per page. If you need two, your page has an architecture problem.

`<Lead>` is the first impression. The sentence under the title that tells you whether to keep reading.

`<P>` is the workhorse. Body text. Most of the words on screen.

`<Muted>` is the quiet context. Timestamps, metadata, secondary information the user can ignore.

`<Small>` is the footnote. Used sparingly, with awareness that some users will struggle with it.

`<Code>` is the literal. Monospaced, boxed, unmistakable.

`<Blockquote>` is the voice. Someone else's words, set apart.
