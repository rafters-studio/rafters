# Editor Architecture (post-rewrite)

## Ownership split: Rafters vs phantom-zone
- **Rafters**: vanilla primitives + one thin React editor component per framework
- **phantom-zone**: block editor product built on Rafters -- owns sidebar (composed from Rafters ui components + drag-drop primitive), property editing, and app-level layout

## Vanilla primitives (4 editor-specific)
- `block-canvas.ts` -- selection state machine, focus traversal, keyboard shortcuts
- `block-wrapper.ts` -- per-block hover chrome, drag handle, menu state
- `editor-toolbar.ts` -- button definitions, platform-aware shortcuts, history state
- `inline-toolbar.ts` -- viewport positioning, format button config, URL validation

Plus existing primitives consumed by the editor: `command-palette.ts`, `drag-drop.ts`, `history.ts`, `clipboard.ts`, `keyboard-handler.ts`

## What was removed (not primitives)
- `block-sidebar.ts` -- application-level; phantom-zone composes from Rafters ui + dnd
- `command-palette-ui.ts` -- trivial grouping/highlighting; collision-detector already handles positioning
- `property-editor.ts` -- schema-driven forms belong in phantom-zone

## Media components moved to ui/
- `components/ui/embed.tsx`, `components/ui/image.tsx`, `components/ui/embed-utils.ts`

## Deleted
- `components/editor/` and `components/media/` directories
- `test/components/editor/` (React component tests)
- `apps/demo/src/components/editor-playground/` + `pages/editor.astro`
- `./components/editor` export from package.json