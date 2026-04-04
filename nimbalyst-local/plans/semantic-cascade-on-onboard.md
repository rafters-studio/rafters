---
planStatus:
  planId: plan-semantic-cascade-on-onboard
  title: Semantic Cascade on Onboard Map
  status: draft
  planType: feature
  priority: high
  owner: rafters
  tags:
    - mcp
    - onboard
    - semantic-tokens
    - cascade
    - wcag
  created: "2026-04-04"
  updated: "2026-04-04T18:15:00.000Z"
  progress: 0
---

# Semantic Cascade on Onboard Map

## Problem

When an agent onboards colors via `rafters_onboard map`, there are two kinds of mappings:

1. **Non-semantic colors** -- brand palette, custom accents, etc. These become `--color-*` tokens usable like any Tailwind color. No cascade needed.

2. **Semantic family assignments** -- mapping `primary` to `#00e5ff`, `destructive` to `#ff3b30`, etc. These SHOULD cascade to all surface tokens that reference that family (primary-foreground, primary-hover, primary-active, primary-border, primary-ring, etc.) with WCAG AAA compliant positions. Currently they don't -- the color family is created but the ~10 surface tokens per family stay on neutral defaults.

This forces the agent to make a second manual pass with `light`/`dark` fields on every surface token. That's ~10 mappings per family x 11 families = 110 manual remaps. It's error-prone, the agent doesn't know the right positions for WCAG compliance, and Sean says it's "ick."

## Goals

- Mapping `primary` to a color auto-cascades to all `primary-*` surface tokens
- Positions are computed for WCAG AAA contrast (not just copied from defaults)
- Non-semantic colors (target is NOT one of the 11 families) just create `--color-*` tokens, no cascade
- State variants (hover, active, focus) get correct lightness offsets from the base
- Dark mode inversions are computed from the color's OKLCH scale
- The response shows what cascaded so the agent can verify

## Architecture

### The 11 Semantic Families

`SEMANTIC_FAMILIES` in tools.ts: primary, secondary, tertiary, accent, neutral, success, warning, destructive, info, highlight, muted.

### DEFAULT_SEMANTIC_COLOR_MAPPINGS Structure

Each semantic family has a cluster of surface tokens in `defaults.ts`. Example for `primary`:

| Token | Light | Dark | Role |
|-------|-------|------|------|
| primary | 900 | 50 | Base interactive color |
| primary-foreground | 50 | 900 | Text on primary |
| primary-hover | 800 | 200 | Hover state |
| primary-hover-foreground | 50 | 900 | Text on hover |
| primary-active | 700 | 300 | Pressed state |
| primary-active-foreground | 50 | 900 | Text on active |
| primary-focus | 900 | 50 | Focus state |
| primary-border | 900 | 50 | Border |
| primary-ring | 900 | 50 | Focus ring |

All 268 light/dark references in the defaults point to `neutral`. When `primary` is mapped to a real color, swap `neutral` for the new family across all `primary-*` tokens.

### Position Strategy

The positions (50, 100, ..., 950) encode a lightness relationship, not an arbitrary choice. When swapping families:

1. **Keep the same positions** if the new color family has a well-distributed OKLCH scale (most enriched colors do -- the scale generator already optimizes for perceptual uniformity).

2. **Compute WCAG AAA contrast** for foreground/background pairs:
   - primary (900) vs primary-foreground (50): must be >= 7:1 contrast ratio (AAA)
   - primary-hover (800) vs primary-hover-foreground (50): must be >= 7:1
   - If the new color at position 900 doesn't meet 7:1 against position 50, adjust positions

3. **State offsets**: hover = base - 100, active = base - 200 (in the light direction). These are already encoded in the default positions.

### Cascade Flow

When `rafters_onboard map` receives a mapping where `target` is one of the 11 SEMANTIC_FAMILIES:

```
1. Enrich the color value into a full ColorValue with OKLCH scale (existing code)
2. Create/update the color family token (existing code)
3. NEW: Detect that target is a semantic family
4. NEW: Find all surface tokens in DEFAULT_SEMANTIC_COLOR_MAPPINGS prefixed with target
5. NEW: For each surface token:
   a. Replace the family name (neutral -> new family) keeping the position
   b. Compute WCAG AAA contrast ratio for fg/bg pairs
   c. Adjust positions if contrast fails
   d. Update the semantic token's value (ColorReference) and dependsOn
6. NEW: Batch persist via registry.setTokens()
7. Regenerate CSS (existing code)
```

### Surface Tokens That Reference Neutral (by family group)

background/foreground/card/card-*/popover/popover-*/surface/surface-* all reference `neutral` and are NOT prefixed with a semantic family. These are the SURFACE layer -- they reference neutral for chrome/structure, not for brand color. These should cascade when `neutral` is remapped, but NOT when `primary` is remapped.

The family-prefixed tokens (primary-*, secondary-*, destructive-*, etc.) cascade when their family is mapped.

## Implementation

### File: `packages/cli/src/mcp/tools.ts` -- `mapTokens()`

After the color family is created/updated (existing code), add:

```typescript
// After creating the color family token...
if (SEMANTIC_FAMILIES.has(target)) {
  const cascaded = await this.cascadeSemanticFamily(
    registry, target, enrichedFamilyName, results
  );
  // cascaded contains the list of surface tokens that were updated
}
```

### New Method: `cascadeSemanticFamily()`

```typescript
private async cascadeSemanticFamily(
  registry: TokenRegistry,
  familyName: string,        // e.g., "primary"
  colorFamily: string,       // e.g., "silver-true-glacier"
  results: Array<...>
): Promise<void> {
  const tokensToUpdate: Token[] = [];

  for (const [name, mapping] of Object.entries(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
    // Only cascade tokens that belong to this family
    if (!name.startsWith(familyName) && name !== familyName) continue;

    const existing = registry.get(name);
    if (!existing) continue;

    const lightRef = { family: colorFamily, position: mapping.light.position };
    const darkRef = { family: colorFamily, position: mapping.dark.position };
    const lightTokenName = `${colorFamily}-${mapping.light.position}`;
    const darkTokenName = `${colorFamily}-${mapping.dark.position}`;

    // TODO: WCAG AAA contrast check and position adjustment here

    tokensToUpdate.push({
      ...existing,
      value: lightRef,
      dependsOn: [lightTokenName, darkTokenName],
      userOverride: {
        previousValue: JSON.stringify(existing.value),
        reason: `Auto-cascaded from ${familyName} -> ${colorFamily}`,
      },
    });

    results.push({
      source: familyName,
      target: name,
      action: 'cascade',
      ok: true,
      persisted: { value: lightRef, dependsOn: [lightTokenName, darkTokenName] },
    });
  }

  if (tokensToUpdate.length > 0) {
    await registry.setTokens(tokensToUpdate);
  }
}
```

### WCAG AAA Contrast Computation

The color family's ColorValue already has a precomputed OKLCH scale with 11 positions. For each fg/bg pair:

1. Get the OKLCH values at the proposed positions
2. Compute relative luminance from OKLCH L channel
3. Check if contrast ratio >= 7:1 (AAA) for normal text
4. If not, walk the scale to find the nearest position that meets AAA
5. The color-utils package likely has contrast computation -- check `packages/color-utils/`

### Edge Cases

- **Neutral remapping**: When `target` is `neutral`, cascade to surface tokens (background, foreground, card, etc.) that reference neutral. This is the broadest cascade -- ~40+ tokens.
- **Family not yet created**: If the color family tokens (e.g., silver-true-glacier-50 through -950) don't exist yet in the registry, they need to be created first (existing enrichment code handles this).
- **Human override preservation**: If a surface token has a `userOverride` that the designer explicitly set, do NOT cascade over it. The designer's decision wins.

## Acceptance Criteria

- [ ] Mapping `primary` to a color auto-cascades to all `primary-*` surface tokens
- [ ] Mapping `neutral` to a color auto-cascades to background/foreground/card/popover/surface tokens
- [ ] Non-semantic color mappings (e.g., "brand-blue") do NOT cascade
- [ ] Foreground tokens meet WCAG AAA (7:1) contrast against their background
- [ ] State variants (hover, active) use correct position offsets
- [ ] Dark mode inversions are correct (light positions in dark, dark positions in light)
- [ ] Human overrides on surface tokens are preserved (not overwritten by cascade)
- [ ] Response includes cascaded tokens with persisted state
- [ ] Existing tests pass, new tests cover cascade behavior
- [ ] Shingle can map the legion palette and get correct dark mode CSS in one step
