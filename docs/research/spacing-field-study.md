# Spacing field study

Computed-style sampling of thirty commercial sites, 2026-08-07, to answer one
question for #2031: when a designer picks spacing, what structure do the picks
actually have?

Committed because the 2026-07-23 intent study's raw data did not survive. Its
conclusions live in a reflection; its numbers are gone, so it could not be
re-analysed or extended, and its sample could not be reproduced. Research with no
committed artifact cannot be re-run.

## Method

Playwright, one homepage per brand, `getComputedStyle` over every visible element in
`body`. Collected `padding*`, `margin*`, `rowGap`, `columnGap`; kept values in
`(0, 400]px`; counted instances per distinct value. 26,611 spacing instances across
30 sites.

Structure is read off the **distinct value set**, prevalence off the counts. A
twelve-card grid contributes one value to the set and twelve to its count. This is
the fix for the element-vs-declaration caveat the previous study flagged and did not
address.

### What this does not support

- **Not the same thirty.** Ten are named in the prior reflection (Stripe, Vercel,
  Gucci, Cloudflare, Airbnb, Supabase, Rolex, Prada, Ritz-Carlton, Mailchimp,
  Datadog); the rest of that sample was never recorded. Twenty are new. Both groups
  are marked `provenance` in `spacing-study.jsonl`.
- **Homepages only**, which the prior study identified as where brands look most alike.
- **medium.com sampled only 96 elements** and is marked `lowConfidence`.
- **Off-grid values are ambiguous.** A site with many non-even values may have chosen
  them, or may set padding in `em` against varying font sizes, which produces the same
  computed spread from one declaration. This study cannot separate the two.
- **Per-intent claims are weak.** Five to seven sites per intent, and within-intent
  variance is larger than between-intent (elegant spans Gucci at 96% to Aesop at 28%).

## The finding

> **Superseded reading.** This section originally presented the pattern as a major
> triad. An adversarial review refuted the musical interpretation; see "the test where
> the two readings diverge" below. The *measurement* stands unchanged -- the set, the
> percentages and the 23x gap are all reproducible from `spacing-study.jsonl`. Only the
> explanation changed, from chord to inherited lineage.

**Spacing concentrates on `2^n`, `3 x 2^n` and `5 x 2^n` from a base of 4.**

87.2% of all 26,611 instances land on `2^n`, `3 x 2^n`, or `5 x 2^n` from a base of 4.
Every octave band carries all three members, in the same order of prevalence -- root
heaviest, fifth second, third third:

| band | root (2^n) | third (5:4) | fifth (3:2) |
|---|---|---|---|
| 2 : 2.5 : 3 | 2 (980) | 2.5 (35) | 3 (309) |
| 4 : 5 : 6 | 4 (2577) | 5 (296) | 6 (1102) |
| 8 : 10 : 12 | **8 (5367)** | 10 (1679) | 12 (2349) |
| 16 : 20 : 24 | 16 (2711) | 20 (967) | 24 (2161) |
| 32 : 40 : 48 | 32 (1059) | 40 (459) | 48 (445) |
| 64 : 80 : 96 | 64 (189) | 80 (112) | 96 (105) |

Pure octaves alone -- `4, 8, 16, 32, 64` -- account for 49.6%. The thirds and fifths
carry the other 37.6%.

### It is not "round numbers on a grid"

The obvious deflation is that these are just convenient multiples of 4 and the triad
reading is pattern-matching. The discriminator is the multiples of 4 that are *not*
triad members. They are equally round, equally available, equally easy to type:

| value | role | instances | present on |
|---|---|---|---|
| 8 | root | 5367 | 30/30 sites |
| 16 | root | 2711 | 30/30 |
| 24 | fifth | 2161 | 29/30 |
| 4 | root | 2577 | 28/30 |
| 12 | fifth | 2349 | 27/30 |
| 20 | third | 967 | 26/30 |
| 32 | root | 1059 | 26/30 |
| 40 | third | 459 | 25/30 |
| 48 | fifth | 445 | 23/30 |
| **36** | -- | **178** | **10/30** |
| **28** | -- | **62** | **8/30** |
| **44** | -- | **20** | **4/30** |

Triad multiples of 4 average 2011 instances and appear on 23-30 sites. Non-triad
multiples average 87 and appear on 4-10. A 23x gap on values that are otherwise
indistinguishable.

### Correction: the "thirds" argument was wrong

An earlier version of this document argued that 10, 20 and 40 are load-bearing because
they are not multiples of 8 and so cannot come from a grid. True and irrelevant. The
grid in play is 4px with half-steps, and `2.5`, `5` and `10` are first-class positions
in `DEFAULT_SPACING_MULTIPLIERS` (`defaults.ts:1544`, mirroring Tailwind) -- giving
exactly 10, 20 and 40. Every "triad member" is a shipped position in the scale these
sites are built on. The 8px-grid framing was a strawman of my own construction.

### The test where the two readings diverge -- and harmony loses

Consonance and lineage make the same prediction almost everywhere, which is why the
23x gap cannot separate them. They diverge on one value, and it is decisive.

**36** is a perfect fifth above 24 (3:2) and a major second above 32 (9:8) -- both
named intervals in the registry the system ships. It is equally available: multiplier
9 is in the default scale. If perceived consonance with neighbouring scale members
drove selection, 36 should thrive.

Observed: **178 instances on 10 of 30 sites**, against a triad-member average of 2011
on 23-30 sites. Eleven times rarer. The same holds for 28, a septimal minor third
above 24: 62 instances, 8 sites.

Lineage predicts this exactly -- 36 is not a doubling of 8, 12 or 10 -- and consonance
predicts the opposite. Where the hypotheses are distinguishable, the musical one is
wrong.

So `{2^n, 3 x 2^n, 5 x 2^n}` is better read as **three doubling ladders from three
inherited bases** (the Swiss eight-point module, the 12-column scaffold, a decimal
10px lineage) than as a chord. The two sets are extensionally identical, so the 87.2%
figure supports both equally and settles neither -- but the 36 test breaks the tie
against harmony.

### Minor-third does not appear

A `base * 1.2^n` progression from 4 gives `4, 4.8, 5.76, 6.91, 8.29, 9.95, 11.94,
14.33, 17.2, 20.64`. Instances landing on it: 9.7% -- and essentially all of that is
the value 4 itself, which both scales share. The progression's own values are
effectively unused.

## What this settles and what it does not

**Settles:** the structure is a chord rather than a scale, and it is not the minor
third the config has carried since before the regression at #384.

**Does not settle why**, and this is a real limit rather than a hedge. Two
explanations fit the data equally:

1. *Harmony* -- the ratios are perceptually right and designers converge on them.
2. *Learned convention* -- the 8pt grid is taught, 12-column thinking came from
   Bootstrap and outlived it, and a 10px lineage supplies the thirds. 4:5:6 is what a
   trained grid looks like once people also need half-steps.

Framework detection cannot separate them. Sampling the extremes found **bespoke CSS at
both ends** -- Gucci (96%) ships hashed CSS modules with zero utility classes,
Net-a-porter (96%) ships pure BEM, and Aesop (28%) is also bespoke. So shipped tooling
does not predict the pattern. But class names reveal which framework is *in the page*,
not which conventions the designer *learned*, and no amount of additional sampling
fixes that: every site in reach was built by someone trained in the same decade.

For the practical decision this may not matter -- if 4:5:6 is the vocabulary designers
reach for, from ear or from training, it is the vocabulary a system should speak. It
does mean "because it is harmonic" is not an available justification, only "because it
is what is used."

**Does not settle:** what rafters should ship. A design system may be more opinionated
than the field, and convergence is weak evidence when much of it is framework
inheritance -- though the 23x gap argues that designers are *filtering* an inherited
linear ladder down to harmonic positions rather than accepting it. That filtering is
the empirical form of the homogeneity argument: sites are handed 4, 8, 12, 16, 20, 24,
28, 32, 36, 40, 44, 48 and spend their instances on the triad members while leaving 28,
36 and 44 nearly untouched.

**Weak signal, recorded for completeness.** Mean harmonic share by intent: efficient
79.5% (n=6), elegant 70.3% (n=7), friendly 63.0% (n=6), technical 62.1% (n=6),
editorial 47.2% (n=5). Within-intent variance exceeds between-intent variance, so this
does not support an intent claim.

## Raw data

`spacing-study.jsonl`, committed alongside this file -- one line per site with `intent`,
`provenance`, element count, and the full `[value, instances]` set. The sampling
function is in the method section above. Both are in the repo on purpose: the study
this one replaces was lost because its numbers lived only in a session.
