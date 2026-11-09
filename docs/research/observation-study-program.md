# Observation study program

One method, one study per dimension, one coverage map. Written after the negative-space
study worked and two measurement studies before it did not.

## The boundary this program operates inside

**Which values are the designer's. How many, and where they are allowed, is intent.**

Colour is the clearest case and is **out of scope by operator ruling** — hue is brand
identity and the system does not prescribe it. But Aesop being brown is identity;
Aesop being *monochrome* is register. Vercel forcing another company's logo to greyscale
is a rule about where colour may appear at all. Those are counts and permissions, not
values, and they are the same question as element-count-per-viewport.

The boundary generalises: *which* typeface is the designer's, how many weights and how far
apart is register. *Which* products go on the page is merchandising, how many is register.

Everything below studies counts and permissions. Nothing below picks a value.

## The method, stated once

**Observation and translation are separate stages.** Observation is what the work is going
for, in words, medium-agnostic. Translation is what that means in our tokens — our
judgment, ours to defend. Keeping them apart lets someone challenge the translation
without redoing the observation. Collapsed, every argument becomes an argument about a
number, which is what happened for most of a day.

Seven rules, each earned:

1. **Look at the work, not the stylesheet.** Computed styles measure what a platform
   shipped. The proof: Vercel measured the densest site in a 30-site sweep (median gap
   4px) and reads as the most spacious page in the set.
2. **The page that matters.** Product, category, article, or the actual working surface —
   never the homepage template, where every brand looks most alike.
3. **Record the reason, not only the device.** This is the rule the first study missed.
   A device catalogue does not translate: "technical uses hairlines" is a fact nobody can
   apply. "When rows-per-screen is the metric, separate with a line" is a rule an agent
   can follow. Brand choices were made for a reason and the reason travels with the
   choice — it is inferable from what the brand is up against, and does not require a
   second corpus.
4. **Same-job comparison isolates the variable.** Gucci, Etsy and Ulta on the identical
   task — category browse — produced three densities and was the cleanest comparison in
   the study. Cross-task comparisons confound.
5. **Control for surface job.** The same brand runs a spacious *persuading* register and a
   dense *working* register within one viewport. Compare marketing to marketing, or
   product to product, never across.
6. **Prefer convergent findings.** Anything two instruments reach independently outweighs
   anything one instrument reaches confidently. The technical hairline signature was found
   twice — once by counting borders, once by looking at how GitHub separates rows.
7. **Report the null.** Chroma was claimed as an intent discriminator twice and was wrong
   both times.

### Traps

- Do not fit a tolerance to the data and report the data passing it.
- Compute the false-positive rate before claiming N-of-N matches.
- Check within-group against between-group variance before believing any grouping.
- A beautiful shape is more suspect, not less.
- Run the refutation on the finding you like, not only the one you doubt.
- Circularity: if sites were assigned to intents by an earlier study, "the elegant sites
  are elegant" is definitional. Only *device* findings are independent.

## On physical brands, and why the corpus does not change

Half the corpus are brands whose register was established in atoms — a store, a shopping
bag, a garment's finish, a lobby, a print campaign, across a century in several cases
(Hermès 1837, Rolex 1905, Prada 1913, Gucci 1921). Their website is a transcription. The
other half — Stripe, Vercel, Linear, GitHub — have no physical antecedent; the site *is*
the brand.

This looked like it demanded a second corpus of campaign and retail material. It does not,
because of rule 3: **the reason travels with the choice.** Gucci withholds a grid because
you do not comparison-shop a €3,000 bag, and that is legible from the page plus the price.
Going to the boutique would confirm it, not reveal it.

Worth recording as context rather than as work: **almost nothing in the observed registers
originated on the web.** Technical inherited Swiss by way of Material; luxury inherited
retail and print. Only the Swiss line was ever *packaged* — Material, Bootstrap, Ant,
Tailwind — which is a better explanation for web homogenisation than designer laziness.
There has only ever been one register available as a system.

## Coverage map

| dimension | what is established | method | confidence | gap |
|---|---|---|---|---|
| **motion** | five intents; values are entropy, found by knobs; jagged per-intent waves; efficient owns no peak by design | knobs + 30-site sweep | **high** for the model, **none** for four intents' values | four non-efficient intents have no measured values |
| **spacing** | six void languages; separation device (line vs gap) is intent, pitch is a second dial; the scale itself carries nothing | observation, 28 pages | **high** on device, **high** on the negative | reasons not recorded; budget unmeasured |
| **elevation / depth / shadow** | elevation-share is a **mid-hump** — flat at extremes, bulging at efficient/friendly; extremes separate planes by other means | two computed-style sweeps | **high on the shape** — two instruments agree on order — **low on separation** (between/within 0.84) | see the unification below |
| **type** | monospace → technical (3/3) and → efficient (3/3), absent from friendly 0/3 and elegant 0/2; serif → editorial | two computed-style sweeps | **high** for mono as a categorical — the strongest presence signal besides springs | scale, weight, measure; the harmonic attempt was refuted |
| **border** | **border rate separates** — technical 20.5%, efficient 8.7%, editorial 6.6%, mass 4.6%, elegant 4.0%, friendly 3.1% (between/within **4.22**), and technical spends **one width** | computed-style sweep + observation | **high** — convergent, found twice by different instruments | which elements carry it |
| **radius** | ~~part of the friendly signature~~ — **not supported at n=14** (0.50). Friendly alone spans 4 / 8 / 12 | computed-style sweep | **none** — the friendly bundle loses this leg | where radius applies — container, control, image |
| ~~colour~~ | **out of scope** — hue is identity | — | — | count and placement fold into the budget study |
| **focus / breakpoint** | nothing | — | — | may not be intent-bearing; cheap check before any study |

## The pattern across every result so far: presence separates, magnitude does not

Read the table above by what kind of measure each row is, and it sorts cleanly:

| separates — **presence and permission** | does not — **magnitude** |
|---|---|
| monospace → technical, efficient (3/3, 3/3) | duration → elegant (1.05; 8× within-elegant in the earlier sweep) |
| serif → editorial | radius → friendly (0.50; friendly alone spans 4/8/12) |
| springs — 29 of 30 sites zero overshoot, friendly-only | chroma (claimed twice, wrong twice) |
| border rate, and technical spending **one** width (4.22) | elevation share as a magnitude (0.84 — the *order* still holds) |

*Does this appear at all, and how many rungs exist* separates registers. *How much* does
not. Two instruments, two corpora, two studies neither of which was designed to test this.

It is also consistent with the boundary this program already operates inside — which
values are the designer's, how many and where they are allowed is intent. That was stated
as a scoping rule. It now looks like an empirical finding as well.

**What it directs:** design every remaining study around counts and permissions first, and
treat any magnitude result as suspect until it survives a variance test. The budget study
is already this shape, which is part of why it is Priority 1.

## Priority 1 — the budget study

Promoted from a footnote. It is the thing that most separates registers, the thing no
token can express, and now the home of the colour question as well.

**What it measures:** counts and permissions. Elements competing for attention per
viewport. Hues load-bearing. Where colour is permitted to appear. Primary actions offered.
Products shown out of how many held.

**Why it is the hard one:** models are additive. Every instruction adds an element, and
there is no gradient toward less. A budget is invisible to an additive process, which is
why it cannot be a token and probably has to be a constraint in the intelligence layer.

**Same-job comparison:** category browse across intents, which already produced the
cleanest result in the corpus — Gucci zero of 374, Etsy six then a grid, Ulta everything
at once.

## Priority 2 — the unification test

**Elevation and spacing-separation may be the same question.**

Both ask: *how do you say this thing is a separate plane?* The candidate answers are
shadow, border, gap, fill, overlap. The negative-space study found border-versus-gap is
intent-bearing. The elevation study found shadow-share is a mid-hump whose extremes
separate "by other means" — and named those means as whitespace at elegant/editorial and
hairline borders at technical. **Those are the same two answers.**

If it holds, the system has an unmodelled **separation** concept whose values are
`shadow | border | gap | fill | overlap`, and shadow-elevation and spacing-gap are two of
five. Cheap to test: one working surface per intent, record only what device says
"separate plane." It either collapses two namespaces or it does not, and it should be
answered before either is designed.

## Priority 3 — retrofit the reason column

Re-derive across the twenty-eight pages already read. No new browsing. Turns a device
catalogue into applicable rules. Worked examples:

| register | device | what it solves |
|---|---|---|
| Gucci | shows 0 of 374 | a grid invites comparison; comparison is the wrong frame for a €3,000 purchase |
| Ulta | shows everything at once | the deal *is* the product; density is merchandise |
| GitHub | hairline at ~57px pitch | rows-per-screen is the metric when scanning a known repo |
| Airbnb | gaps and rounded images, no borders | the photograph is the product; it needs room and must not read as a database row |
| Duolingo | enormous soft targets | the user is a beginner one frustration from quitting |
| Vercel | no image, no colour, monochrome logos | the audience distrusts marketing, so not-persuading is the persuasion |

## Later — type

The ratio question is closed. What remains observable, and it was visible without looking
for it: **how much of the page's meaning is carried by letters versus image.** Vercel is
all type and no image; Gucci is all image with type as a whisper. Extends the axis the
prior work started with serif and mono. Also: weight contrast, case and tracking as
signature, whether type sits *on* the image or beside it, and how long a line is allowed
to get.

Same-job comparison: the product or category page across intents, since every one of them
must name a thing and say one sentence about it.

## Later — radius, focus, breakpoint

Radius: record *where* it is applied, not how much. Airbnb rounds images; GitHub rounds
nothing. Half a day.

Focus and breakpoint: check before studying. "Not intent-bearing" is a result worth
recording so nobody studies them twice.

## What this program does not do

It produces no token values. Every brief ends at observation. Translation into tiers,
scales or presets is a separate argument, and the rule holds across all of them: **values
arrive from studies, never from invention.**
