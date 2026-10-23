# Component Spec — Kbd

Status: DRAFT. Wave-2 static score (imitates Container/Card). No state, no
actions, no keymap, no effects, no motion block. A pure static performed in
React and Astro.

Files (`src/components/kbd/`):

```
kbd.behavior.ts   kbd.classes.ts   kbd.tsx   kbd.astro
```

Tests mirror into `test/components/kbd/` (behavior, classes, React
conformance, Astro conformance).

## Purpose

A keyboard key cap: a small, bordered, monospaced chip that marks a key,
shortcut, or key combination. Render one key per `Kbd` and compose several for
a combination (`<Kbd>Cmd</Kbd> + <Kbd>S</Kbd>`); use platform-appropriate
modifiers (`Cmd` on macOS, `Ctrl` on Windows). Kbd annotates; it never
announces (unlike Alert) and it never interrupts (unlike Dialog).

## The finding: a pure static needs no bind

Kbd is the thinnest static in the tree. Its score projects no ARIA (the
`<kbd>` element is its own native semantics -- a run of keyboard input), holds
no state, and runs no effects. There is therefore **nothing to bind**:

- `kbd.behavior.ts` is the score **only** -- there is no `bindKbd`. A DOM
  binding exists to run effects and apply projections imperatively; a static
  with an empty projection and no effects has neither to run.
- `kbd.tsx` uses **no** `useMemory` -- config in, classes out, children
  through, the semantic `<kbd>` element is fixed.
- `kbd.astro` ships **no** `<script>` -- it is server-rendered markup with the
  shared class string and a default slot; there is nothing to hydrate.

The score is declared at all only so the conformance harness can assert the
one real contract (the `root` part renders and projects no ARIA) identically
across every framework.

## Config, state, actions

```ts
interface KbdConfig {
  fill?: string;    // exactly one bg-fill-* token
  surface?: string; // a surface name
}
type KbdState = Record<never, never>;
type KbdActions = Record<never, never>;
```

The oracle exposes no variants, sizes, or attributes on any of its targets,
so `KbdConfig` carries only `fill` and `surface`. Config in, one class string
out: `kbdClasses(config, state) => { root }` returns the cap's structure plus
its surface -- the single projection every performance reads.

### Fill and surface

`Kbd` takes `fill` and `surface`, which change the surface of its root
(`kbd.classes.ts:30`):

- The base surface is `border-border bg-muted text-muted-foreground`.
- `fill` takes exactly one `bg-fill-*` token and replaces the base. Any other
  value is dropped with a console warning and the base stands.
- `surface` names a generated surface (`surface="card"` renders
  `bg-surface-card`) and replaces the base. An unknown name is ignored.
- Precedence: fill, then surface, then the base.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection, semantics native to the `<kbd>` element |

There is exactly one behavioral part, the `<kbd>` cap. The rendered key text is
the accessible name by construction (boundary 5: only the node with a contract
to project is a declared part).

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client. `keymap` returns
`null`, `effects` returns `[]`, and `canDispatch` returns `true`
unconditionally; all three are asserted directly in `kbd.behavior.test.ts` as
the explicit "nothing happens" contract.

## Motion

None. The cap is a static chip; the matrix records no motion intents.

## Oracle dispositions (boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| Semantic `<kbd>` element, both targets | contract |
| Base cap: `inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-code-small text-muted-foreground shadow-sm` | contract -- ported verbatim from the old kbd |
| No variants, sizes, or attributes on any target | contract -- `KbdConfig` is empty |
| `forwardRef<HTMLElement>` (React) | contract -- Kbd is frequently wrapped by Tooltip/Popover shortcut rows; ref forwarding is load-bearing |
| `@semantic-meaning` / `@usage-patterns` / `@example` JSDoc tags (old `kbd.tsx`) | dropped from the tag block -- the registry parses the four required tags (`@cognitive-load`, `@attention-economics`, `@trust-building`, `@accessibility`); the extras were prose, recoverable from the oracle. `@example` is kept as documentation, not a parsed tag |

## Deltas from the oracle

1. Each performance renders `data-part="root"` on the `<kbd>` so the
   conformance harness locates the root -- the oracle carried no `data-part`.

## shadcn drop-in parity

The oracle is rafters' own library, and its Kbd is a single semantic `<kbd>`
element with a base class string -- there is no `KbdGroup` wrapper or variant
surface on any of the oracle targets. shadcn's more recent `Kbd`/`KbdGroup`
pair (a group wrapper plus per-key caps) is a superset the oracle never adopted;
this port preserves the oracle's single-element surface faithfully rather than
fabricate a `KbdGroup` the tree never had. A consumer composes a combination the
same way the oracle intended -- several `Kbd` elements side by side -- so a
migration needs no prop or import-path change beyond the registry path. Adding a
`KbdGroup` wrapper, if wanted, is a future disposition, not this port's.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the `<kbd>` element marks its content as
  keyboard input for assistive technology; the score projects no role because
  the element's native semantics are the whole contract.
- 4.1.2 Name, Role, Value: no role is asserted because none is projected; the
  rendered key text is the accessible name by construction.
- 1.4.3 Contrast: the `bg-muted` / `text-muted-foreground` pairing is a
  contrast-tuned token pair drawn from the frozen paired-surface-role contract,
  so contrast is a registry guarantee, not a per-component check.
- Landmark containment: a key cap is inline text, not a landmark -- the page
  around it supplies any region. The conformance suites scope axe to the render
  container (or the host) so the document-level `region` best-practice rule is
  about the test page, not the cap.
