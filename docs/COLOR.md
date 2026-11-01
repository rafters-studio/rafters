# Color

Your AI doesn't know what blue means to your brand. It picks hex values that look plausible and moves on. Rafters doesn't guess. Every color is a decision with a reason attached.

## OKLCH, Not HSL

We build in OKLCH because it matches human vision. Two colors at the same lightness actually look the same brightness. In HSL they don't -- a blue at 50% lightness looks darker than a yellow at 50% lightness. This isn't a preference. It's physics.

This matters because we generate entire color families from a single input. One OKLCH value produces an 11-position scale, five harmony sets, accessibility metadata, and perceptual analysis. If the color space lies, everything downstream is wrong.

## One Color In, Complete Family Out

Give the system an OKLCH value. Get back:

**An 11-step scale** from near-white (50) through base (500) to near-black (950). Each step has uniform perceptual distance. The scale doesn't bunch up in the darks or flatten in the lights.

**Five harmony sets.** Complementary, triadic, analogous, tetradic, monochromatic. Computed from the hue angle, not picked from a palette.

**Pre-computed accessibility.** WCAG AAA and APCA contrast ratios against white and black, in both directions. The system knows which positions pair safely before any component uses them.

**Perceptual analysis.** Temperature, atmospheric weight, how visually heavy the color feels. The kind of information a senior designer carries in their head, encoded as data.

## The 11 Families

Every project starts with 11 semantic families. These are roles, not colors.

**primary** is the brand. It's on the nav, the CTAs, the elements that say "this is us."

**secondary** supports the primary. It's the quieter actions, the less prominent UI.

**destructive** is irreversible. Deletions, errors, the things that can't be undone.

**success**, **warning**, **info** are status. They tell the user what happened without requiring them to read.

**neutral** is the structure. Backgrounds, borders, text. The chrome that holds everything else.

**accent**, **highlight**, **muted**, **tertiary** fill the gaps between the primary roles.

These families are the foundation, not the ceiling. A game adds faction colors. A bank adds tier colors. A retailer adds seasonal colors. Custom families get the same treatment: full scales, accessibility, dark mode, dependency graph.

## Dark Mode Is Math

Each dark role derives from its light token. A top-of-tree role such as `primary` mirrors its light position on the family's scale, plus a designed elevation offset. Its foregrounds and states then derive from that dark parent. The family stays, so the identity stays.

This means dark mode is not a second design. It's a transformation of the first one. Change your primary color and both modes update.

## The Dependency Graph

Change primary and 20+ tokens cascade. Primary-foreground, primary-hover, primary-active, primary-ring, sidebar-primary, chart-primary -- they all reference the primary family at computed positions.

The semantic tokens don't store colors. They store references: "primary at position 500" not "oklch(0.5 0.15 240)." Swap your entire primary palette and every component updates without touching a single component file.

## The Why-Gate

Override a color and the system asks why. Not to be bureaucratic -- to build institutional memory. Six months from now, someone asks "why is destructive different from the default?" The answer is in the token, not in someone's head who quit in April.
