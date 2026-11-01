# Intent

A designer starts a rafters project by choosing an intent. It answers one question: how should this feel? Every other decision in the system starts from that answer, and stays editable afterward.

**Which values are the designer's. How many, and where they are allowed, is intent.** Which typeface is the designer's; how many weights and how far apart is intent. Which hue is the designer's; how many colours and where they may appear is intent.

## How to read this document

Each claim below carries its status, because much of this is designed and not yet built.

| Status | Meaning |
|---|---|
| **Built** | The code does this today |
| **Designed** | Decided, not built |
| **Measured** | A study supports it. See [the research](research/) |
| **Open** | Not decided, or no evidence yet |

## What an intent is

- There are five: `efficient`, `elegant`, `friendly`, `technical` and `editorial`. **Built** as names only.
- `efficient` is the default, written to the config by `rafters init`. **Built.**
- `efficient` is the zero point: it owns no signature, and every other intent is a difference from it. **Designed.**
- An intent is a preset: a set of values over the system's tokens, applied by Studio and never encoded in the system. **Designed.** `motion-derivation.ts` encodes intents in the system today, which this replaces.
- It names a feel, never a use. An elegant data tool is a real project, so use-case stays out of the word. **Designed.**
- It is a starting position, not a lock. Everything stays editable, and the project can roll back to it. **Designed.**
- A project that has moved away shows its nearest intent marked as changed, such as `elegant (custom)`. **Designed.**

## How it reaches the system

One intent has to reach every part of the system. A project whose spacing says elegant and whose motion says efficient is incoherent.

| Part | What intent sets | Status |
|---|---|---|
| Motion | Where each duration sits inside its perceptual band, and which curve character applies | **Built** in part: the generator reads intent, but only `elegant` has a position, and the measurement behind it used a method since ruled out |
| Spacing | Where the base and ratio sit | **Designed**, hand-tuned |
| Radius | Follows spacing's base today, so it would follow a preset's base | **Designed** |
| Type | Sizes, weights and how many are in use | **Open.** Type shares spacing's ratio at generation time, and has its own base. Sizes do not follow it at runtime (#2647) |
| Shadow | How much elevation a project spends | **Open** |
| Colour | Never the hue. How many colours, and where they may appear | **Open** |
| Depth | Layer order is structural, and no study suggests intent changes it | **Open** |

`ResolvedSystemConfig` has no `intent` field yet, so only the motion generator reads intent, and it reads it optionally.

## How values change between intents

**Magnitudes interpolate; characters snap.** **Designed.** Any point on a spacing line is a real value, so a designer can settle between two intents. A curve halfway between two characters is neither of them, so curves snap to the nearest.

Positions are tuned by hand. **Designed.** The research narrows a value to a neighbourhood, and perception finds the position. An attempt to derive positions from how often values appear failed, because large spacing is rare by count and a frequency cut removes the top of every scale.

## What the research supports

The studies looked at the page that matters for each brand, not its homepage. Assigning a site to an intent came from earlier work, so "the elegant sites are elegant" is true by definition. Only what the studies found on those sites is independent evidence. Most of this rests on 6 to 14 sites, and the sample is small enough that these are starting points, not rules.

| | efficient | elegant | friendly | technical | editorial |
|---|---|---|---|---|---|
| Elements with a border | 8.7% | 4.0% | 3.1% | **20.5%**, one width | 6.6% |
| Monospace in the stack | 3 of 3 | 0 of 2 | 0 of 3 | 3 of 3 | 1 of 2 |
| Overshoot on motion | none | none | **the only one** | none | none |
| Elements with a shadow | 1.78% | 0.36% | 1.65% | 0.80% | 0.22% |

**Measured:** border rate separates the intents strongly. Monospace is close to categorical. Overshoot held on 29 of 30 sites. The order of shadow rates repeats across two studies, but the size of the gaps is unreliable.

**Measured, and not a signal:** radius does not separate the intents, and neither does spacing density. Duration is marginal. Vercel measured as the densest site in the study and reads as the most spacious, so gap size is the wrong instrument. Chroma was claimed as a signal twice and was wrong both times.

**Measured, and no token can express it:** how a page treats empty space. Separating with a line or a gap is a real signal of intent, and both are hard to reduce to values. So is the split between a spacious persuading surface and a dense working one, which can sit on one screen.

**Open:** that split suggests intent may belong to the surface, not the brand. Only homepages and a limited set of working surfaces have been studied.

## The guidelines for each intent

**Open.** These are the designer's to write, and the research above sets limits without choosing values. `efficient` has its motion defaults. The other four have no preset.

| Intent | Guideline | Preset values |
|---|---|---|
| `efficient` | Not written | The shipped defaults |
| `elegant` | Not written | None |
| `friendly` | Not written | None |
| `technical` | Not written | None |
| `editorial` | Not written | None |

## What is not settled

- Whether type's base derives from spacing's base, or sharing the ratio is enough.
- Whether a preset sets spacing's base. The research protocol records base 4 for `friendly`, and `efficient` ships at base 4 too.
- Whether `(custom)` applies to a single token as well as a whole project.
