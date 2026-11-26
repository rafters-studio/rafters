# T23: a token registry

A proof of `registry.feature`, written with Sean on 2026-11-12.

- `src/registry.ts` (314 lines, no `node:` imports): the registry. The intent is a curated default: every token starts from it, as a value or a rule that makes one, in each mode. The one change is `set`. `set(name, value, { reason, mode? })` records a designer's choice for one mode (light unless named; dark follows light until dark is chosen) and pushes it through everything that reads it, staged so a failing rule changes nothing. On a new name it adds a font, a colour or a fill, and refuses anything else. `set(name)` returns that mode to what the intent makes, and removes an addition unless something reads it. A token keeps one reason per mode, the latest; git holds the history.
- `rules/`: one plain function per file, `(args, { get, mode, name }) => value`. There is no plugin layer: no registration, no stored plugin names, no `dependsOn`, no schemas. The registry records every `get` a rule makes; those reads are the token's dependencies. A rule reads its own mode unless it names another; only `mirror`, the dark default for a colour role, reads light.
- `test/feature.test.ts`: BDD, one test per scenario, in the feature's order and wording. Each scenario is one whole thing a designer or a user does; together they say the registry is complete.
- `test/unit.test.ts`: unit tests for the pure logic only: the rules, and the registry's own mechanics (reading a token, making a token once, recording what a rule reads, refusing a cycle).
- `test/support.ts`: the test rules and makers both share.
- `test/default.ts`: the one real registry every test uses: rafters' default colours and motion as intent data, made once per run. `transaction(test)` takes back every choice the test made, newest first, even when it fails, so each test starts from the same registry. `test/default.test.ts` proves both; `test/real.ts` and `test/motion.ts` read their intent from it.
- `test/real.ts`: rafters' semantic colour system as intent data over these rules, against rafters' own registry.
- `test/motion.ts`: rafters' 131 motion tokens as intent data over these rules, against rafters' values and its exporter's reduced-motion law.

Modes come in axes: scheme (light, dark) and motion (full, reduced). A token is on one axis; a rule reads another token in its own mode where that token has it, else in that token's first mode. Reduced motion is law (`packages/ui/docs/spec/matrix/motion.md:96`, "no preset can override it"): a mode the registry is told is law refuses every designer choice.

## Run

```
TSX=../../node_modules/.bin/tsx
$TSX --test test/feature.test.ts test/unit.test.ts
$TSX test/real.ts
$TSX test/motion.ts
```

## Checks over the whole real registry, 2026-11-25

`test/invariants.test.ts` runs 200 seeded random changes on the one default registry (SEED and CHANGES vary them; a failure replays). Every change must land; a refusal is skipped only when it is the registry's own `Refused`, and anything else fails the run and checks four things after each:

- Every value is what its rule makes: held, every token, every change.
- A change reaches only what the registry says it reaches: held.
- Taking the changes back leaves the registry exactly as it was: held.
- Every foreground meets its contrast level against its role, measured with rafters' `calculateWCAGContrast`: fails, on the default registry before any change. All 132 foregrounds are bound at AAA (7:1); 21 measure below it, and 2 are below AA (4.5:1): `success-foreground` 4.30 and `info-foreground` 4.49, both light. The toy reproduces rafters' values exactly (0 of 207 roles differ), so this is rafters' default system, not the toy. The check is left failing: it is the finding. rafters #2668 (readable foregrounds) and #2672 (pair labels match measured contrast) are both closed, and this is measured at rafters main 92e108f9, after both. Not yet known: whether rafters' picker measures contrast another way than `calculateWCAGContrast`.

Under seeds 1, 7, 42 and 2979 the same three hold and the contrast check fails.

## The feature, cut to whole behaviours, 2026-11-24

The 26 scenarios of rounds 1 to 3 were fragments: most were single checks, not something a designer or a user does. They are now 6 scenarios: a base change follows through every mode and survives a save and load; a choice is made, changed and taken back; a brand colour, font and fill are added and removed; a project starts from its intent and a new intent starts it over; reduced motion stops movement and no designer can override it; a bad change is refused and nothing moves. Four checks were logic and became unit tests. 6 of 6 scenarios and 9 of 9 unit tests pass. The round tables below count the scenarios as they were.

## Round 2 results, 2026-11-12 (predictions in PREDICTIONS.md, commit fa4b6e4)

| # | Prediction | Result | Measured |
|---|---|---|---|
| 1 | Every scenario passes | Held | 23 of 23 scenarios; 5 of 5 rule unit tests |
| 2 | No rule file over 30 lines; at most 10 | Held | 10 rule files, the longest 15 lines, plus a 22-line colour helper; 136 lines in all with the index |
| 3 | Core at most 350 lines | Held | 297 |
| 4 | The rules reproduce rafters' semantic colours | Held | 207 roles: 0 differ in light; 0 differ in dark against rafters' `--dark` twins |
| 5 | Observed reads find the family behind a role | Held | 66 of 66 foregrounds read their role's family, which no rafters binding declares |
| 6 | A family change reaches its foregrounds; in rafters none | Broke as framed, held where it matters | With the default roles, rafters' cascade also reaches all 132 foregrounds, through each fallback's declared `neutral`, which declares `zinc`. Once a designer points `primary` at `silver-true-sky`, a change to that family reaches `primary-foreground` in both modes here and not at all in rafters |
| 7 | The type scale follows its base | Held | `font-size-base` 1.25rem gives `font-size-xl` 1.8rem |
| 8 | Breaks first on the dark fallback | Broke | No dark value differs: in the default system both neutrals resolve to the zinc family, so reading the dark neutral and the light one give the same foregrounds |

Round 1 (the first core, the run against rafters' real system, the reach through Tailwind, the drop-in into rafters) is in the commit history, a13b0a8 to fdc00df.

## Round 3 results, motion, 2026-11-12 (predictions in PREDICTIONS.md, commit 75ed0f3)

| # | Prediction | Result | Measured |
|---|---|---|---|
| 1 | Full motion matches rafters | Held | 131 tokens, 0 differ, with every `var(--rafters-*)`, tier, period and curve resolved through rafters' own tokens |
| 2 | Reduced motion matches the exporter's law | Held | 0 differ: durations and delays 0ms, periods kept, tier cells 0ms, period cells keep their period, semantic motions take their reduced spec |
| 3 | A duration change reaches what reads it, in full only | Held | `rafters-duration-normal` 300ms changed the 23 tokens on the normal tier and itself in full, 0 in reduced |
| 4 | A designer can choose a reduced value | Wrong against the design | Written before reading the motion docs, which make reduced motion law above every intent. Built as law instead: a choice in reduced is refused |
| 5 | Axes at most 40 lines; at most 3 motion rule files of 30 lines | Held | Axes and law added 17 lines (297 to 314); `css` 6, `cell` 10, `transition` 7 |
| 6 | The motion scenarios pass | Held | 3 scenarios; 26 in all, with 5 rule unit tests |
| 7 | Looping animations hold their period as a literal | Held | `rafters-period-spin` at 2s leaves `motion-animation-spin` at `spin 1s linear infinite`; it reads no period token |

Found against the motion docs: `motion-semantic-hover` (colour, background, border) and `motion-semantic-focus` (box-shadow, outline) carry no reduced spec, so under reduced motion their transitions are 0ms, here and in rafters' exporter. `docs/MOTION.md` lists "hover colour transitions, focus rings" as preserved under reduced motion.

## Not covered

- Rafters' typography, spacing, shadow and the rest were not rebuilt over the new rules; semantic colours and motion were.
- No schemas: values are not validated.
- A designer can add only through `set` on the first mode; adding a colour or fill per mode is not designed.
