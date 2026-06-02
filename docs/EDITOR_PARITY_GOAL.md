# Editor Parity Goal

The goal record for the `<rafters-editor>` Web Component epic (#1319) and the
React-editor gap-fixes it depends on. This is the durable "why and what" that
every editor PR maps back to. Read it before touching the editor.

## Why this matters

The editor is the **lynchpin for six products** (gitpress, kelex, ezmode guilds,
courses, ctrl, veneer). Gitpress is waking up to consume it as its UI. This
component pays for everything downstream of it. It needs to be perfect.

Every editor change requires extreme care. The React `editor.tsx` must stay
functional throughout; we fix it, we do not break it.

## End goal

`<rafters-editor>` shipped as a Web Component at **full parity** with the React
`Editor`. Not a slice, not a reduced surface -- parity. It re-hosts the same
20+ primitive orchestration (block-handler, document-editor, block-canvas,
clipboard, keyboard-handler, cursor-tracker, serializers, palettes, toolbars)
inside a custom-element shell, built on the shipped WC pattern (render from
`*.classes.ts`, adopt the compiled utility sheet via `setUtilityCSS`; #1564 /
#1565), with token styling delivered by #1562 / #1563.

The React `editor.tsx` is the **parity spec**. So it must first reach its full
intended surface -- which means closing the documented gaps before the re-host.

## How: TDD, real browser, one PR each

- **TDD.** For each behavior/gap: write the failing test that encodes the
  documented expected behavior (red), then implement to green. No literal
  Gherkin ceremony -- tests are the contract.
- **Real browser.** The editor's edges (selection-based formatting,
  contenteditable, keyboard, clipboard, IME) cannot be exercised in happy-dom --
  which is exactly why they went untested. Tests run in **Playwright**, which
  starts its own dev server (`webServer` running the demo's `astro dev`) and
  drives `/editor` (the `EditorPlayground` dogfood consumer; its Export panel
  serializes blocks for assertions).
- **One PR each.** Every gap and every re-host slice is its own branch -> tests
  -> fix -> `pnpm preflight` -> `/code-review` -> PR. Nothing batched.
- **Stop-and-talk rule.** The design is documented (see below), so we encode it
  and make it pass. We stop only if a test would encode a behavior the design
  docs do NOT specify -- then we talk, we do not guess.

## The design-intent record (the source of truth)

The editor's intended behavior is written down. Hold the editor to its own spec.

- `editor-behavior-matrix.mdx` -- per-primitive Guarantees / Does-NOT-guarantee /
  Known edge cases / Test coverage. The contract surface. Most "Test coverage"
  rows are currently `untested`; converting them to `tested` is the work.
- `editor-known-gaps.mdx` -- every gap with Current vs **Expected** behavior,
  blast radius, fix sketch. Expected behavior = the design. This is the gap list
  below.
- The rest of the `editor-*.mdx` family (data-model, render-path, component,
  primitives, serialization, composites, rules) for shapes and contracts.

(All in the sibling shingle repo: `sites/rafters.studio/src/pages/docs/editor-*.mdx`.)

## Phase 0 -- fix the React editor's 9 documented gaps

Each its own TDD PR. Order is roughly by editing-fidelity impact and dependency.

1. **Inline-formatter write-path (data loss) -- FIRST.**
   `document-editor.reconcileDOM()` reads `el.textContent`, flattening user marks
   to a plain string on the next keystroke; `inline-formatter` is documented as
   orchestrated but never imported. inline-formatter is in fact **entirely
   unwired** (no toolbar, no keyboard binding), so "bold survives save" forces
   wiring the format operation end-to-end: keyboard `Cmd+B/I/E` ->
   `inline-formatter.applyFormat` -> a new `serializeElement(el)` -> `block.content`,
   plus `reconcileDOM` serializing marks structurally (not `textContent`).
   Test: type, select, `Cmd+B`, export MDX shows `**word**`. (The floating
   inline-toolbar UI is gap #2's surface, a later PR.)
2. **EditorProps re-wiring (the big one).** `sidebar`, `rulePalette`,
   `commandPalette`, `inlineToolbar`, `blockContextMenu`, `onSaveAsComposite`
   are typed but dropped (stripped post-#1048); the demo already passes them.
   Restore the JSX integration; the backing primitives all exist. Multi-part --
   one PR per surface (sidebar, rule palette, command/slash menu, inline toolbar,
   block context menu).
3. **`Editor.deselect()`** -- real impl: clear selection, blur, emit focus-change.
4. **Converge MDX serializers** -- one (`mdxSerializer` in `@rafters/ui`); migrate
   callers off legacy `composites/serializer.ts:toMdx`, delete it.
5. **Composites -> ui import removal** -- inline `fuzzyScore`, define
   `BlockPaletteItem` locally; composites depends only on zod.
6. **Depth-limit asymmetry** -- single shared constant (10) for `toMdx` and
   `instantiateBlocks`.
7. **Rule runtime validation** -- `validateBlocks(blocks, ruleRegistry)` that
   resolves each block's rule name to its Zod schema and validates content.
8. **Registry import-path bug in `rafters add editor`** -- primitives' relative
   imports must resolve to the install target; include `types.ts` in the bundle.
9. **Save-as-composite UI** -- dialog + form collecting name/category/description,
   calling `onSaveAsComposite`. Depends on #2 (EditorProps wiring).

## Phase 1+ -- re-host as `<rafters-editor>` at parity

After the React editor is whole. The WC host takes the role React plays: owns
the nanostores store, drives the DOM render loop, subscribes for re-render,
proxies keyboard/clipboard/selection, round-trips through the serializers.
Sliced into reviewable PRs: canvas -> input -> formatting -> palettes/toolbar ->
serialization. React `editor.tsx` untouched. Styling via the WC pattern
(`editor.classes.ts` + `setUtilityCSS`, only irreducible CSS in `static styles`).

## Invariants / guardrails

- React `editor.tsx` stays functional and untouched except for gap-fixes.
- No scoping down. Full parity is the goal.
- Every PR: `pnpm preflight` green, `/code-review` before merge, no batching.
- Behavior-matrix rows move from `untested` to `tested` (with file:line) as we go.
- Extreme care on the hot input path (`reconcileDOM`, input-events): every change
  there gets mdxSerializer round-trip tests.

## Open design items -- settle, do not assume

These are genuinely undecided. Surface and decide; do not encode a guess in a test.

- **Pluggable serialization.** Sean wants the serializer/deserializer layer
  swappable (MDX -> JSON blocks -> ...) and designed **with veneer** first.
  Building the WC before this risks baking in the wrong interface.
- **Editor chrome styling.** The architecture review leaned "unstyled or minimally
  styled for OSS -- don't force rafters aesthetics on gitpress consumers." Confirm
  before styling the editor shell.
- **Gitpress consumption shape.** Earlier review (#189-192) had gitpress building
  its own React editor over rafters primitives; the WC epic assumes it consumes
  `<rafters-editor>`. Confirm which, since it changes what "done" means.

## Definition of done

`<rafters-editor>` at parity with the React editor; all 9 documented gaps closed;
every `editor-behavior-matrix.mdx` row `tested`; gitpress can consume the editor
to run. The lynchpin is trustworthy.

## References

- Epic: #1319. WC pattern: #1564 / #1565 / #1198. Styling pipeline: #1562 / #1563.
- Prior audit + docs plan: `~/.claude/plans/eventual-crafting-cocke.md`.
- Design docs: shingle `sites/rafters.studio/src/pages/docs/editor-*.mdx`.
