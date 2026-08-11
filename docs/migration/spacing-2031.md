# Migrating to the spacing progression (#2031)

Spacing values now derive from `progressionRatio` instead of a hardcoded multiplier
table. The rungs are no longer consecutive, so some class names no longer resolve.

**This document is the mapping, not the decision.** Scale naming is unresolved; the two
options cost different things and both are laid out below.

## What actually changed

At the shipped default -- base 4, minor-third -- the scale is 21 rungs:

```
multiplier   1   2   3   4   5   6   7   9  11  13  15  18  22  27  32  38  46  55  66  79  95
px           4   8  12  16  20  24  28  36  44  52  60  72  88 108 128 152 184 220 264 316 380
```

`spacing-4` still means `base * 4`. The name is still the multiplier; there are simply
fewer multipliers, and they stop being consecutive above 7.

**The dense end is untouched.** `p-1` through `p-7` are byte-identical to before, as are
`p-9`, `p-11` and `p-32`. A 1.2 progression rounds to consecutive integers below 28px, so
the curve only diverges above it -- which is exactly where a linear ladder's steps stop
being distinguishable.

**Rung 11 survives.** `h-11` / `w-11` still resolves to 44px, so the WCAG 2.5.5 touch
floor is intact across button, dialog, drawer, sheet, select, combobox, command,
navigation-menu, pagination, toggle, alert-dialog, input-group and popover. No
accessibility regression.

## Mapping

Every rung `packages/ui/src` and `apps/demo/src` currently use, and where it lands.
`nearest` is the closest surviving rung; `delta` is the pixel change at base 4.

| old | px | status | nearest | px | delta |
|---|---|---|---|---|---|
| `0.5` | 2 | **lost** | `1` | 4 | +2 |
| `1` | 4 | kept | `1` | 4 | 0 |
| `1.5` | 6 | **lost** | `1` | 4 | -2 |
| `2` | 8 | kept | `2` | 8 | 0 |
| `2.5` | 10 | **lost** | `2` | 8 | -2 |
| `3` | 12 | kept | `3` | 12 | 0 |
| `3.5` | 14 | **lost** | `3` | 12 | -2 |
| `4` | 16 | kept | `4` | 16 | 0 |
| `5` | 20 | kept | `5` | 20 | 0 |
| `6` | 24 | kept | `6` | 24 | 0 |
| `7` | 28 | kept | `7` | 28 | 0 |
| `8` | 32 | **lost** | `7` | 28 | -4 |
| `9` | 36 | kept | `9` | 36 | 0 |
| `10` | 40 | **lost** | `9` | 36 | -4 |
| `11` | 44 | kept | `11` | 44 | 0 |
| `12` | 48 | **lost** | `11` | 44 | -4 |
| `14` | 56 | **lost** | `13` | 52 | -4 |
| `16` | 64 | **lost** | `15` | 60 | -4 |
| `20` | 80 | **lost** | `18` | 72 | -8 |
| `24` | 96 | **lost** | `22` | 88 | -8 |
| `32` | 128 | kept | `32` | 128 | 0 |
| `40` | 160 | **lost** | `38` | 152 | -8 |
| `48` | 192 | **lost** | `46` | 184 | -8 |
| `60` | 240 | **lost** | `55` | 220 | -20 |
| `64` | 256 | **lost** | `66` | 264 | +8 |
| `72` | 288 | **lost** | `66` | 264 | -24 |
| `80` | 320 | **lost** | `79` | 316 | -4 |
| `96` | 384 | **lost** | `95` | 380 | -4 |

Seventeen losses. `1.5`, `2.5` and `3.5` go by design -- fractional multipliers cannot
survive a rule that every name is an integer. The rest are casualties of the curve
diverging above 28px.

`p-8` (32px) is the sharpest: it sits exactly between `p-7` (28) and `p-9` (36), so
neither substitution is obviously right and the call belongs to whoever owns the
component.

## The naming decision

**Option A -- names stay multipliers.** What ships today. `spacing-4` means `base * 4`
forever, `p-4` still reads as four units, and the seventeen rungs above are the whole
migration. Costs: seventeen class substitutions, each a judgement where the delta is
non-zero.

**Option B -- names become positions.** `spacing-0` through `spacing-20`, so `p-4` means
the fourth position rather than four units. Honest about what a progression is, and the
scale never has gaps again. Costs: *every* spacing class in 55 components changes
meaning, silently -- `p-4` keeps compiling and renders 20px instead of 16px. That is a
far larger and far more dangerous migration than seventeen names that stop resolving.

A missing rung is loud: the class emits no CSS and the layout visibly collapses. A
renumbered rung is quiet. That asymmetry is the strongest argument for A, and it is why
A is what shipped rather than a claim that A is correct.

## What has no automated path yet

**Container and Grid hand-maintain their own rung lists** across four files that do not
import from the generator:

```
packages/ui/src/components/grid/grid.classes.ts        gridGapClasses, gridPaddingClasses
packages/ui/src/components/grid/grid.behavior.ts       type SpacingValue
packages/ui/src/components/container/container.classes.ts  paddingClasses, stackGapClasses, sizeGapScale
packages/ui/src/components/container/container.behavior.ts type ContainerPadding
```

Drop a rung and `ContainerPadding` still type-checks `'16'`, `paddingClasses['16']` still
returns `'p-16'`, and the class references a custom property that no longer exists.
TypeScript catches nothing. These four need updating by hand and, separately, need linking
to the generator so the next scale change cannot desync them.

**Component tests assert class strings, not values.** `expect(...).toContain('h-11')`
passes whether or not `--spacing-11` resolves, which is how a scale rewrite can break the
touch floor with a green suite.
