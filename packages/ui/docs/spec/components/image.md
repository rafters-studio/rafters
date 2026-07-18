# Component Spec — Image

Status: DRAFT. Wave-2 static port. Token-aware `<img>` wrapper with
figure/figcaption semantics and a config-driven load lifecycle.

Files (`src/components/image/`):

```
image.classes.ts    image.behavior.ts    image.tsx    image.element.ts    image.astro
```

Tests mirror into `test/components/image/`: `image.behavior.test.ts` (pure),
`image.classes.test.ts` (parity), and conformance across React, WC, and Astro
through the shared harness.

## Composition

```
image (static score)   no reducer state, no actions, no keymap, no effects
                        parts: root (figure), frame, img, status, caption
                        aria: img aria-busy while loading; status role
                              (alert on error, status while loading)
bindImage(root)         re-reads config from attributes, applies the projection
```

Image is a **static score** in the progress mould: its projection is a total
function of config, so React computes `image.aria(...)` inline while the WC and
Astro drive the same `bindImage`. `status` is **config, not state** — the
runtime load/error flip is the retained-mode (React) surface, the same
disposition `button.behavior.ts` records for its loading transition. Default
`status` is `loaded`: a clean, crawlable image before any JS, matching the
oracle's `isLoading=false` start.

## Config, state, actions

```ts
interface ImageConfig {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'; // token max-width
  alignment?: 'left' | 'center' | 'right';                  // auto margins, default center
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'; // frame corners, default lg
  fill?: string;              // fill signature painted behind the image
  status?: 'loading' | 'loaded' | 'error'; // default 'loaded'
  errorMessage?: string;      // default 'Failed to load image'
  loadingLabel?: string;      // default 'Loading image'
}
type ImageState = Record<never, never>;   // static: no reducer state
type ImageActions = Record<never, never>; // static: no actions
```

`resolveImage(config)` is the single computation the three performances read:
it derives `status`, `isLoading`/`isError`, `hasOverlay`, the overlay `role`,
and the announced `message`.

React owns the live lifecycle: `status` seeds at `loaded`, the img's `onError`
flips it to `error`, a later `onLoad` recovers it. The flipped value feeds back
into config, so the one projection formats the busy/alert semantics.

## Parts and ARIA

| Part | Element | Presence | ARIA |
| --- | --- | --- | --- |
| root | `figure` | always | native figure semantics; no projected role |
| frame | `div` | always | clipping context (radius token, overflow-hidden, fill) |
| img | `img` | always | `aria-busy="true"` while loading; `alt` required |
| status | `div` | loading or error | `role="status"` (loading) / `role="alert"` (error); the announced message |
| caption | `figcaption` | when caption supplied | native figcaption |

Alt text is a **type-level requirement** on the React and Astro props (oracle
parity); the WC defaults `alt=""` when the attribute is absent, matching the
HTML spec for decorative images.

## Keyboard and effects

- `keymap`: none. Image is not a widget; it takes no keyboard interaction.
- `effects(state, config)`: `[]`. No focus-trap, roving, dismiss, or announce
  primitive — the load contract is a pure projection, driven by React's state
  or read once from server/author markup by `bindImage`.
- Motion: **none** (Spec 04 intent). The overlay is a static token surface — no
  spinner, no transition.

## Oracle dispositions (src/old/ui/image.*)

| Oracle feature | Disposition |
| --- | --- |
| figure/figcaption semantics | contract |
| required alt text | contract (type-level on React/Astro; WC defaults `""`) |
| size preset (token max-width) | contract |
| alignment (auto margins) | contract |
| radius (oracle's fixed `rounded-lg`) | contract, lifted to a `radius` token, default `lg` |
| fill behind the image | contract (fill-resolver; fill, not background) |
| load/error handling | contract — `status` config + React's onLoad/onError flip |
| loading / error overlays | contract, reduced: a single token-surface live region, no spinner (motion none) |
| upload (onUpload, file input, "Replace image") | dropped — editor surface, out of scope |
| drag-drop / paste image | dropped — editor surface, out of scope |
| alignment toolbar (editable) | dropped — editor surface, out of scope |
| contentEditable caption (onCaptionChange) | dropped — editor surface, out of scope |
| `isDragOver` ring | dropped — follows drag-drop out of scope |
| loading spinner animation | defect-do-not-port under Spec 04 (motion none); replaced by a static placeholder |

The WC oracle (`image.element.ts`) had already shed the entire editor surface
and rendered display-only; this port unifies the surviving load/error semantics
across all three targets through the one score.

## WCAG 2.1 AA obligations

- 1.1.1 Non-text Content: every img carries `alt` (required on React/Astro,
  defaulted to `""` on the WC for decorative images). The harness asserts the
  figure is axe-clean.
- 4.1.2 Name, Role, Value: the loading overlay is a polite `role="status"`, the
  error overlay an assertive `role="alert"`; the img projects `aria-busy` while
  loading. Asserted against real DOM by the conformance suite.
- 1.4.11 Non-text Contrast / 1.4.3 Contrast: overlay surfaces use role tokens
  (`bg-muted`/`text-muted-foreground`, `bg-destructive`/`text-destructive`),
  never raw colours, so the token contrast contract holds in both themes.
