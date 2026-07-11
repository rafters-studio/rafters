# Component Spec — Separator

Status: DRAFT. A static score with no state, no actions, no keymap, no
effects, and exactly one thing to get right: which of two ARIA lies it
refuses to tell.

Files (`src/components/separator/`):

```
separator.classes.ts    separator.behavior.ts    separator.astro
```

Tests mirror into `test/components/separator/`. React (`.tsx`) and WC
performances not yet written -- this port is Astro-only (issue #1791 scopes
the full four-target port; this pass ships the Astro render target against
the score).

## Purpose

A visual divider between content or inline items. Decorative by default:
most rules in a UI are structural whitespace with a line drawn over it, and
announcing every one of them to a screen-reader user is noise, not signal.
Non-decorative flips to the real ARIA separator semantics for the rare case
where the division itself is the content (e.g. a toolbar group boundary a
screen-reader user needs to navigate by).

## Astro performance

`separator.astro` is a pure decoration wrapper: config in
(`orientation`, `decorative`), `separator.aria`'s role/orientation
projection and `separatorClasses`' hairline out, one server render. No
client runtime, no effects (Spec 03) -- there is nothing dynamic to run.
`Props` omits `role` from the native attribute passthrough
(`Omit<HTMLAttributes<'div'>, 'role'>`, the same type-gate
`grid.astro` uses) so a consumer cannot spread a raw `role` over the one
the score computed from `decorative`.

## Config, state, actions

```ts
interface SeparatorConfig {
  orientation?: 'horizontal' | 'vertical'; // default 'horizontal'
  decorative?: boolean;                    // default true
}
type SeparatorState = Record<never, never>;
type SeparatorActions = Record<never, never>;
```

No state: a separator has nothing that changes after render. No actions,
no keymap: there is no interaction surface to gate.

## Parts and ARIA (the auditable table)

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="none"` (decorative, default) or `role="separator"` with `aria-orientation` (non-decorative) |

`separator.parts.root` declares no fixed `role`: the value is not one the
harness can assert as a literal (Spec 01's `PartDecl.role`), because it
switches on config. The projection itself (`separator.aria`) carries the
real value for every scenario, and the conformance suite asserts DOM
against that projection directly rather than against a fixed part
declaration -- the same shape `grid.behavior.ts` uses for its
conditional `role="grid"`.

## Keyboard and effects

None. `keymap` returns `null` unconditionally; `effects` returns `[]`
unconditionally. A separator is inert furniture -- Spec 04 declares no
motion intent for it either.

## Oracle dispositions (`src/old/ui/separator.{tsx,astro,element.ts}`, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `orientation` ('horizontal' \| 'vertical', default 'horizontal') | contract |
| `decorative` (default true) | contract |
| `role={decorative ? 'none' : 'separator'}` | contract |
| `aria-orientation` only when non-decorative | contract |
| `bg-border` hairline (shrink-0, h-px/w-full or h-full/w-px) | contract -- `bg-border` is the correct primitive here, not a background/fill violation: a 1px line has no edge to stroke a border ON, so painting the token color as the element's own fill IS how a hairline renders. No `*-subtle`/`*-foreground` contrast pairing exists to repoint (no text content, one token) |
| shared `separator.classes.ts` class maps consumed identically by all three oracle targets | superseded by the score/classes split -- `separatorClasses(config, state)` is the one decoration function every performance calls, replacing the old tree's parallel-import convention |
| WC `decorative` presence-based attribute parsing (absent = decorative, present and not `"false"` = non-decorative) | framework-affordance (WC) -- Astro/React config takes a real boolean; this port does not carry a WC performance |

Cancelled feature note: issue #1393 ("Separator label slot for pill-on-rule
dividers") was cancelled before this port and is out of scope -- no label
slot exists in the score.

## WCAG 2.1 AA obligations

- 1.3.1: decorative separators are `role="none"` so they are not announced
  as structure that isn't there; non-decorative separators expose the real
  `separator` role plus orientation so assistive tech can navigate by them.
- 4.1.2: role is honest or absent, never a role with no matching semantics
  (the same rule `grid.md`'s dropped `role="grid"` enforces) -- there is no
  state here in which the role lies.
- 1.4.11 (non-text contrast): `bg-border` carries the token's own
  3:1-against-background contrast obligation; the score does not introduce
  a new color decision, it reuses the border token verbatim.
