# Intent × token surface

What values populate **the namespaces rafters actually ships**, per intent. Computed-style
extraction across the page that matters for each brand.

This is the right use of computed styles. The earlier failures measured gaps and asked
about feeling; this measures the token surface and asks what values sit in it. Different
question, correct instrument.

## The matrix

| | **elegant** Gucci | **editorial** Atlantic | **technical** GitHub | **efficient** Vercel | **friendly** Duolingo | **mass** Ulta |
|---|---|---|---|---|---|---|
| elements sampled | 5317 | 419 | 1723 | 943 | 765 | 3684 |
| base font size | 16 | 16 | **14** | 16 | **17** | 16 |
| sizes carrying the page | 4 | **12** | 5 | 8 | 4 | 4 |
| line-height | normal / 1.33 / 1.5 | **1.15 / 1.25 / 1** | 1.5 | 1.5 / 1.43 | 1.18 | 1.5 / 1.14 |
| **tracking** | **−0.03 / −0.04** | 0, +0.038 on labels | **0** | **0** | 0 | **+0.016 / +0.025** |
| weights in use | 400, 500 | 400, 300 | 400, 500, 600 | 400 (+450) | **500, 700** | **300**, 700 |
| type families | 1 | **4** (serif + mono + sans) | 2 + mono | 2 + mono | 1 | 1 |
| **radius workhorse** | **2** | 4 | 6 | 6 | **12** | 8 |
| radius distinct | 5 | 2 | 8 | 8 | 2 | 6 |
| **border widths** | 1, 3 | 1, 2 | **1 only** (224×) | **1 only** | **2, 4 — never 1** | 1 |
| shadow instances | **1** | **1** | **31** | 13 | 1 | 3 |
| **duration** | **800ms** | 300ms | **80ms** | **100 / 150ms** | 200 / 300ms | 200ms |

> **SUPERSEDED IN PART — read the variance test below first.** The matrix above and the
> ranked list that follows were derived from six sites, one per intent. Extending to
> **fourteen** and computing between-group against within-group variance kills most of it.
> Two of the eight survive. The corrections are at the end of this document and they
> include two claims made confidently in the section immediately below.

## The discriminators as they looked at n=6 (retained for the record)

1. **Duration — 10× range.** 80ms (technical) → 800ms (elegant). Ordered
   technical < efficient < friendly ≈ mass < elegant. Independently confirms the motion
   study's finding that elegant peaks on duration.
2. **Radius workhorse — 6× range.** 2px (elegant) → 12px (friendly). Elegant is nearly
   sharp; friendly is nearly a pill. Confirms radius as part of the friendly signature and
   puts a number on it.
3. **Tracking, and it changes sign.** Negative for elegant (−0.03/−0.04), zero for
   technical and efficient, positive for mass (+0.016/+0.025). A signed axis, not a
   magnitude.
4. **Border width, as a categorical.** Technical and efficient use **1px and nothing
   else**. Friendly uses **2px and 4px and never 1px**. This is not a scale, it is a
   choice of which rung exists.
5. **Type family count.** One family for elegant, friendly and mass — total commitment to a
   custom face. Four for editorial (Times, AGaramondPro, Logic Monospace, Graphik) mixing
   serif, mono and sans in one page.
6. **Line-height splits editorial off.** Everyone else runs 1.5 or thereabouts. Editorial
   runs **1.15 / 1.25 / 1** — display-dominant, because headlines outnumber paragraphs on a
   section front.
7. **Base weight.** Ulta's page is 89% weight **300**; Duolingo's is 88% weight **500**.
   Most others sit at 400. The baseline weight is itself a register decision.
8. **Size count.** Editorial spends 12 sizes; elegant, friendly and mass spend 4. This is
   the type-scale equivalent of the element budget.

## The variance test — fourteen sites

Extended to fourteen (elegant: Gucci, Rolex · editorial: Atlantic, Guardian · technical:
GitHub, Cloudflare, Supabase · efficient: Vercel, Linear, Stripe · friendly: Duolingo,
Airbnb, Etsy · mass: Ulta), then between-group variance divided by within-group.

| measure | between/within | verdict |
|---|---|---|
| **border rate** | **4.22** | **separates** |
| duration | 1.05 | marginal |
| shadow rate | 0.84 | does not separate |
| radius workhorse | 0.50 | does not separate |

### What survives

**Border rate — the discriminator.** Percentage of elements carrying any border:

| technical | efficient | editorial | mass | elegant | friendly |
|---|---|---|---|---|---|
| **20.5%** | 8.7% | 6.6% | 4.6% | 4.0% | 3.1% |

Between-group variance is four times within-group. Technical runs 2–6× everyone else, and
does it with **one width** — 1px at GitHub, Cloudflare and Supabase; 0.5px at Linear.

**Monospace presence — categorical, and near-perfect.** technical 3/3, efficient 3/3 ·
friendly 0/3, elegant 0/2, mass 0/1, editorial 1/2. Tool-facing carries mono in the stack;
consumer-facing does not.

### Corrections to the n=6 claims above

**Radius does not separate — ratio 0.50.** The "6× range, 2px elegant to 12px friendly"
was Gucci against Duolingo: two extremes drawn from six sites. Friendly alone spans
Airbnb 4, Etsy 8, Duolingo 12. Within-group swamps between-group.

**The shadow "conflict" was my arithmetic, not the data.** I compared raw instance counts
across pages of wildly different element counts. As *rates*, the order reproduces the
earlier study's mid-hump exactly — efficient 1.78%, friendly 1.65%, technical 0.80%,
elegant 0.36%, editorial 0.22%, mass 0.08%. Bulging at the middle, flat at both extremes,
as that study said. To state both halves without contradiction: **the order is convergent
across two independent instruments** — rule 6 of the study program, which outranks a
single-instrument ratio at this n — **while the magnitude of separation is unreliable**
(0.84). The prior finding stands on shape; the conflict I flagged does not exist.

**Duration is marginal, not a 10× discriminator.** The order holds — elegant 550ms →
efficient 137ms — but Gucci at 800 and Rolex at 300 nearly cancel the between-group
signal on their own.

**The cross-study duration link above is unsupported.** Discriminator 1 claims this
"independently confirms the motion study's finding that elegant peaks on duration." It
does not. That finding came from the 2026-07 CSS sweep, whose raw data was never
committed and for which no variance test is recorded — so it cannot be recomputed, only
noted as unsupported. It was also produced by the instrument the method ruling of the same
week disqualifies ("we do NOT measure gucci.com CSS transitions"), on homepages, which its
own caveats call the worst surface for the question. This result is a second independent
failure of that instrument, not a pooled measurement confirming it.

### The pattern in the failures

Of the eight discriminators reported at n=6, **two survive n=14**. This is the third time
in one session that a small sample looked decisive and dissolved on extension, and the
first two were not caught without prompting. The cheap guard is the one already in the
method: compute between-group against within-group before reporting any grouping, and
compare **rates**, never counts, across pages of different sizes.

## The conflict worth flagging (WITHDRAWN — see corrections above)

**Shadow does not behave as the earlier study predicted.** That study found shadow-share
as a mid-hump, bulging at efficient and friendly and flat at the extremes. Here the
technical page carries the most shadow by a wide margin — GitHub 31 instances, Vercel 13 —
while friendly (Duolingo) and elegant (Gucci) both sit at **1**.

Two readings, and this data cannot separate them: the earlier study sampled homepages while
this sampled working surfaces, or one of the two is wrong. Do not build on shadow until
that is resolved.

## What this gives that the composition study did not

Every row above is a **value in a namespace we ship**. `radius-base`, `letter-spacing-*`,
`font-weight-*`, `duration-*`, border width, family count. An intent preset is a value-set
over system tokens, and these are candidate values for four of the five non-efficient
intents that have never had any.

The composition findings — void languages, element budgets, what each register solves —
are not that. They describe decisions no token can express. Both are true; only this one
is preset-shaped.

## Limits

- **Six sites, one page each.** The prior 30-site sweep is a separate corpus; this is a
  deliberate small sample on the pages that matter, not a replacement for it.
- **Intent labels come from earlier work**, so "the elegant site is elegant" is
  definitional. The *values* are independent; the *assignment* is not.
- **Working surface versus marketing surface is not controlled** across all six. GitHub and
  Duolingo are product surfaces; Gucci, Vercel and Atlantic are closer to marketing. The
  persuade/prove split means this could move numbers, and the shadow conflict above is the
  most likely place it already has.
- **One page cannot show a scale.** These are the values a page *spends*, which is not the
  same as the values a system *offers*. Duolingo showing 2 radii does not mean its system
  has 2.
- No translation. These are observations, not proposed token values.
