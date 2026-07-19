# Component Spec — Embed

Status: DRAFT. A STATIC score, modelled on Container and Card: no state, no
actions, no keymap, no effects, and an empty structural ARIA projection. The
one piece of real behaviour is the URL security resolver, which lives in the
score (a decision, never duplicated across performances); the three
performances are pure decoration application over its descriptor.

Files (`src/components/embed/`):

```
embed.behavior.ts    embed.classes.ts    embed.tsx    embed.element.ts    embed.astro
```

Tests mirror into `test/components/embed/` (behavior, classes, and React + WC +
Astro conformance).

## Purpose

An external media frame. Wraps a third-party iframe (YouTube, Vimeo, Twitch)
with an accessible title and aspect-ratio control, behind a secure URL
allowlist — so an agent drops in an embed by URL and gets a validated,
privacy-preserving frame or an honest recovery fallback, never a raw iframe to
an arbitrary host.

## Composition

```
embed score        the URL security resolver + an empty static contract
embed.classes      container / iframe / fallback / message / link class strings
resolveEmbed       config -> { kind:'iframe', src, title, aspectRatio }
                          | { kind:'fallback', url, message, includeLink }
```

There is no `bindEmbed`. The `loading`/`loaded` state vocabulary describes the
iframe's NATIVE `loading="lazy"` lifecycle, not a reducer — the oracle tracked
no loading state on the iframe path, so there is nothing to bind.

## Config, state, actions

```ts
interface EmbedConfig {
  url: string;                 // required for a frame
  provider?: EmbedProvider;    // override the auto-detected provider (title only)
  aspectRatio?: AspectRatio;   // '16:9' (default) | '4:3' | '1:1' | '9:16'
  title?: string;              // iframe title; default '{provider} embed'
}
type EmbedState = Record<never, never>;    // static: nothing to remember
type EmbedActions = Record<never, never>;  // static: nothing to dispatch
```

`resolveEmbed(config)` is the whole decision. It returns an `iframe` descriptor
only when the URL is present, on the allowlist, resolves to a supported
non-Twitter provider; otherwise a `fallback` descriptor. The provider override
renames the default title but NEVER the resolved `src` (the embed URL always
comes from detection, so an override cannot redirect the frame).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none — empty projection. The frame's accessible name is the iframe's `title` (content), not a root projection |

The iframe carries `title` (verbatim from the descriptor), the security
attributes below, `allowfullscreen`, and `loading="lazy"`. The fallback carries
a message and, for a disallowed/unresolvable URL, a recovery link
(`target="_blank" rel="noopener noreferrer"`). Only `root` is a declared part
(boundary 5); the iframe and fallback children carry no `data-part`.

## Security (the crown jewel)

- **Allowlist.** `isAllowedEmbedDomain` gates on an exact `hostname` set
  (youtube/youtu.be/nocookie, vimeo/player.vimeo, twitch hosts, twitter/x).
  A host outside the set NEVER renders an iframe — it degrades to the fallback.
- **YouTube → nocookie.** Detection rewrites every YouTube URL to
  `www.youtube-nocookie.com/embed/{id}`.
- **Twitch parent guard.** Twitch embed URLs carry `parent={hostname}`.
- **Iframe attributes, preserved verbatim** (score constants, one source of
  truth across the three performances):
  - `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`
  - `referrerPolicy="strict-origin-when-cross-origin"`

## Keyboard and effects

None. A static frame claims no keys (`keymap` returns `null`) and runs no
effects (`effects` returns `[]`).

## Motion

None declared. The only lifecycle is the browser's native lazy-load.

## Aspect ratio — the one inline style channel

`aspectRatio` resolves through `getAspectRatioValue` to a CSS ratio applied as
an inline style (`aspect-ratio: 16 / 9`), mirroring Container's `container-name`
precedent. A class cannot express it: 4:3 and 9:16 have no built-in aspect
utility and arbitrary-value classes are banned.

## shadcn parity

N/A — shadcn/ui has no `embed` component, so there is no drop-in surface to
match. The API is Rafters' own, carried forward from the oracle's iframe path.

## Oracle dispositions (src/old/ui/embed.{tsx,element.ts,classes.ts,-utils.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `url` / `provider` / `aspectRatio` / `title` | contract |
| URL allowlist + provider detection + youtube→nocookie + twitch parent guard | contract — moved verbatim into `embed.behavior.ts` (no separate `embed-utils.ts`; the pure logic is the score's) |
| iframe `allow` / `referrerPolicy` / `allowFullScreen` / `loading="lazy"` | contract — preserved verbatim as score constants |
| fallback message + recovery link | contract — the tokenized WC fallback (`text-label-small`), not the `.tsx`'s SVG + raw `text-sm` version |
| Twitter widget flow (`TwitterEmbed`, `platform.twitter.com/widgets.js`, `window.twttr`) | dropped — a runtime third-party widget, not an iframe; Twitter URLs resolve to the fallback exactly as the oracle WC did. `detectEmbedProvider` still recognises Twitter (validation), it simply maps to fallback |
| `editable` / URL input `<form>` / `onChange` | dropped — block-editor / studio-layer concern, same disposition as Container's `editable`/`showDropZone` |
| drag/drop file upload, alignment toolbar | dropped — studio-layer concern |
| `ProviderBadge` (provider colour chip) | dropped — an editor affordance tied to `editable` |
| React `SVG` fallback icon + raw `text-sm` chrome | dropped — the WC's tokenized fallback is the floor; the SVG was decorative |
| `.tsx` fallback message as `<p>`, WC/React via `createElement` | framework-affordance — React and the WC render a raw `<p>` via `createElement` (the Typography-pending disposition Card/Alert record); Astro renders a `<div>` (no `createElement` escape) with the same message class |

## WCAG 2.1 AA obligations

- **1.1.1 / 4.1.2 (name, role, value):** every iframe carries a `title`; the
  conformance harness asserts it against the rendered DOM. A default
  `{provider} embed` guarantees the frame is never nameless.
- **1.3.1:** the root projects no ARIA; structure comes from the iframe and the
  fallback's link. Only `root` is a declared part.
- **2.4.4 (link purpose):** the fallback recovery link points at the original
  URL with `rel="noopener noreferrer"`, reachable when a frame is blocked.
- **Security-as-accessibility:** a disallowed URL degrades to an honest,
  navigable fallback rather than a silent blank frame.

## Open

- Repoint the fallback message at a Typography role component once one exists
  (the Astro `<div>` / React `<p>` split collapses then) — a designer pass,
  flagged, not done, matching Card and Alert.
