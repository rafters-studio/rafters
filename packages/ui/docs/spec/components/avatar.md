# Component Spec — Avatar

Status: DRAFT. Static score (imitates Container/Card, with a datum like
Progress). No actions, no keymap, no effects, no motion. The image-load
`status` is CONFIG, not state; presence is a total function of it. Performed
across all three frameworks (React, the `<rafters-avatar>` web component, and
Astro).

Files (`src/components/avatar/`):

```
avatar.behavior.ts   avatar.classes.ts   avatar.tsx   avatar.element.ts   avatar.astro
```

Tests mirror into `test/components/avatar/` (behavior, classes, React
conformance, WC conformance, Astro conformance).

## Purpose

A user's representation: an image with an initials (or icon) fallback shown on
load failure. Avatar identifies; it does not announce and it is not a widget.
The surface is the contract; the image and fallback are how the load outcome is
performed.

## The datum: status is config, not state

Avatar is a static score with a datum, the same shape Progress records. The
image-load `status` (`loading` / `loaded` / `error`) is CONFIG: the score is a
total function from `status` to which part is present, computed once in
`resolveAvatar`:

| status | image | fallback |
| --- | --- | --- |
| loading | present (loading) | present (behind the image) |
| loaded | present | HIDDEN |
| error | HIDDEN | present |

The transition BETWEEN statuses is a runtime concern the retained-mode (React)
performance owns -- an `<img>` `load`/`error` listener flips React state, which
feeds back through `resolveAvatar`. The DOM-native performances are
caller-decides statics (see the finding below), so there is **no universal
`bindAvatar`**: the score is score-only, exactly like Card.

## The finding: caller-decides statics reprise the Card no-bind result

The oracle already drew the boundary this port keeps. The old `avatar.astro`
was zero-JS (`src ? <img> : <fallback>`), and the old `avatar.element.ts`
explicitly **deferred** image-load coordination to a follow-up. So:

- `avatar.behavior.ts` is the score plus `resolveAvatar`; there is no
  `bindAvatar`. A binding exists to run effects and apply projections
  imperatively; a static with an empty projection and no effects has neither.
- `avatar.element.ts` performs no binding -- the web component renders the
  surface once from its attributes, and the caller declares the outcome via
  `status` (defaulted from `src`).
- `avatar.astro` ships no `<script>` -- server-rendered markup, caller-decides.
- `avatar.tsx` alone owns the runtime transition, because retained-mode is the
  only surface that observes the live `load`/`error` events.

## Composition

```
Avatar          root (span), the surface; size; holds status (React)
AvatarImage     img, data-part="image"; onLoad/onError drive status (React)
AvatarFallback  span, data-part="fallback"; initials/icon; delayMs flash guard
```

The React surface is the shadcn/radix compound, preserved exactly:
`Avatar` / `AvatarImage` / `AvatarFallback`, `onLoadingStatusChange`, `delayMs`.
The WC and Astro performances cannot observe live load events, so they take a
`status` attribute/prop (defaulted from `src`) and a fallback `slot`/`fallback`
prop.

## Config, state, actions

```ts
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarStatus = 'loading' | 'loaded' | 'error';

interface AvatarConfig {
  size?: AvatarSize;   // unknown -> 'md'
  status?: AvatarStatus; // unknown/absent -> 'loading'
}
type AvatarState = Record<never, never>;
type AvatarActions = Record<never, never>;
```

`resolveAvatar(config)` is the one computation the classes and all three
performances read: it resolves the size, resolves the status, and derives
`imageHidden` (status is `error`) and `fallbackHidden` (status is `loaded`).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection; the span carries no role |
| image | unless status is `error` | none -- native `alt` is a passthrough |
| fallback | unless status is `loaded` | none -- the span carries no role |

The projection is empty per part, like Container/Card. Presence -- not ARIA --
is Avatar's contract, and presence is `resolveAvatar`. `image` and `fallback`
are declared optional because which one is present is a function of status.

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute. Motion: none.

## Oracle dispositions (src/old/ui/avatar.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `size` (xs/sm/md/lg/xl) | contract |
| Avatar / AvatarImage / AvatarFallback compound | contract |
| image-load `status` (loading/loaded/error) | contract -- config, resolved by `resolveAvatar` |
| `onLoadingStatusChange` callback | contract (React) -- the load-status report |
| `delayMs` fallback-flash guard | framework-affordance -- React-only nicety on top of the score's decision |
| React context sharing status | framework-affordance -- the retained-mode transition surface |
| old WC deferred image coordination | resolved -- the WC is now a caller-decides static via the `status` attribute |
| old Astro `src ? img : fallback` zero-JS | contract -- the caller-decides default the WC also adopts |

## WCAG obligations

- A meaningful avatar's image MUST carry real `alt` text; a decorative avatar
  sets `aria-hidden` on the root (native passthrough, not projected).
- Never rely on the avatar alone to convey identity -- pair it with a name.
- The fallback initials/icon must remain legible against `bg-muted`
  (`text-muted-foreground` supplies the paired contrast).
