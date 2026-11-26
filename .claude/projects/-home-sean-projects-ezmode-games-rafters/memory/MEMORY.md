# Rafters Memory

## Open Issues

### Type Scale Problem (from courses agent)

Rafters default type scale produces unusable sizes below base. Minor-third (1.2) with the current step count puts sm at 5.36px and xs at 6.43px. Nothing below base is usable, so LLMs fall back to Tailwind's text-sm (14px) directly -- bypassing the scale entirely.

Two issues:

1. Default ratio should be perfect fifth (~1.5) -- minor-third produces timid jumps; headings don't differentiate from body
2. sm/xs step positions are too deep -- sm is 6 steps below base, xs is 5 (also backwards -- sm < xs). With 1.5 ratio: sm at 1 step down = ~10.7px (usable secondary text), xs at 2 steps = ~7.1px (true footnote territory)

MCP guidance gap: `rafters_vocabulary` returns the scale but doesn't warn that LLM training priors about text-sm = 14px don't apply. An `llmWarnings` field in the response would catch every agent automatically.

### Issue #756 - resolved

oxlint unused-vars fixed in PR #759. oxfmt formatting failures were just single vs double quotes (config mismatch, not a rafters bug). grid.tsx `priority` was false positive (used as data-priority attr).

## Toolchain Notes

- Consuming projects are switching to ox (oxlint, oxfmt) and tsgo -- stricter than biome
- Rafters still uses biome, no plans to switch today
- Unused params need `_` prefix for oxlint compat (biome doesn't flag these the same way)
