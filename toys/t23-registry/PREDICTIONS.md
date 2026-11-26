# T23, round 2: rules and modes, predictions

Written before any code. Each is recorded as held or broken in README.md.

The design under test:

- **Rules are plain functions,** `(args, { get, mode }) => value`, one tiny file each in `rules/`. There is no plugin layer: no registration, no stored plugin names, no `dependsOn`, no schemas around a rule.
- **Dependencies are observed.** The registry records every `get` a rule makes while it runs; those reads are the token's dependencies, and nothing is declared by hand.
- **Modes.** Every token has a value per mode (light, dark), each with its own choice and reason. A rule runs in each mode and reads that mode unless it asks for another. With no mode, a change goes to light; dark follows unless dark was chosen.

## Predictions

1. **Every scenario passes,** the 18 already in `registry.feature` and the new mode and rule scenarios.
2. **Rule files are tiny.** No rule file is over 30 lines; there are at most 10 of them.
3. **The core stays small.** `src/registry.ts` with modes and observed reads is at most 350 lines.
4. **The rules reproduce rafters.** Rafters' 414 semantic colour tokens, rebuilt as intent data over the new rule files (`at`, `state`, `contrast`, `mirror`), give rafters' value in light for every token, and rafters' `--dark` twin's value in dark for every token that has one.
5. **Observed reads find what plugins hide.** Every semantic foreground's observed reads include the colour family behind its role, which no rafters binding declares.
6. **A family change reaches its foregrounds.** Changing a family's colours re-runs every foreground that reads it; in rafters it re-runs none.
7. **The type scale follows its base.** With the progression rule, setting `font-size-base` changes every `font-size-*` step.

## Where it breaks

8. Prediction 4 breaks first, on dark: rafters' dark contrast fallback reads the light `neutral` (generators/semantic.ts:194), and the new rules read the dark one. Where those differ, the values differ.

# T23, round 3: motion, predictions

Written before any code.

The design under test: a token belongs to an axis of modes. Colour tokens use the scheme axis (light, dark); motion tokens use the motion axis (full, reduced). Reduced motion is the motion axis's second mode, so the reduced-motion law becomes data: in `reduced`, durations and delays are made by a rule that zeroes them, periods follow `full`, and a semantic motion takes its own reduced spec. A rule reads another token in its own mode when that token has the mode, and in that token's first mode when it does not. A designer can choose a reduced value with a reason, as with dark.

1. **Full motion matches rafters.** Rafters' 131 motion tokens, rebuilt as intent data over the rules, give in `full` the value rafters stores, with every `var(--rafters-*)` resolved through rafters' own tokens; a cell or semantic JSON spec is compared with its tier, period and curve resolved the same way. 0 differ.
2. **Reduced motion matches the exporter's law.** In `reduced`, every duration and delay is `0ms`, every period keeps its value, every tier cell's duration is `0ms`, every period cell keeps its period, and every semantic motion with a reduced spec takes that spec. 0 exceptions.
3. **A duration change reaches what reads it, in full only.** Setting `rafters-duration-normal` to `300ms` changes every animation, cell and semantic motion on the normal tier in `full`, and none of them in `reduced`.
4. **A designer can choose a reduced value.** Setting `rafters-duration-fast` in `reduced` to `50ms`, with a reason, changes the reduced value of everything that reads it, and nothing in `full`.
5. **Small.** The axes add at most 40 lines to the core; motion needs at most 3 new rule files, each at most 30 lines.
6. **The motion scenarios pass.**

## Where it breaks

7. The five looping animations (spin, ping, pulse, bounce, caret-blink) hold their duration as a literal (`spin 1s ...`), not a period token. Rebuilt as rafters stores them, a period change does not reach them, here or in rafters.
