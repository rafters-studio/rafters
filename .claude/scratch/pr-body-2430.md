Resets the editor for the rebuild from the new model, keeping the code worth keeping as ordinary primitives.

## Acceptance criteria mapping

### The kept code lives flat in primitives with its tests

The op model moved from `components/editor/ops/` to `block-ops.ts` and `block-op-{types,text,format,structural,content}.ts`. `editor-history.ts` became `op-history.ts`. `block-operations`, `clipboard`, `input-events`, `selection`, `cursor-tracker`, `command-palette`, `drag-drop` and `block-palette` moved up from `primitives/editor/`. Their tests moved to `packages/ui/test/primitives/` with only import paths changed, and `ops.test.ts` and `editor-history.test.ts` became `block-ops.test.ts` and `op-history.test.ts`.

Evidence: `pnpm --filter @rafters/ui test` passes 675 files, including every moved test.

### The editor and its editor-only pieces are deleted

Deleted: `components/editor` (bindEditor and the React, Web Component and Astro decorators), `src/old/ui/editor.tsx` and `document-editor.ts`, the four serializers, and the ten primitives only the old editor used (block-canvas, block-context-menu, block-wrapper, canvas-drop-zone, editor-toolbar, inline-formatter, inline-toolbar, rule-dialog, rule-drop-zone, rule-palette), with their tests and the Playwright capture suite in `test/editor/`.

Evidence: `packages/ui/src/primitives/editor/` and `packages/ui/src/components/editor/` no longer exist on this branch.

### Nothing outside imports the deleted code, and the registry subdir support is gone

`legion sym importers` showed no consumer outside the deleted code except its own tests. The hooks, `command`, `input-otp` and `composites/bridge.ts` now import the flat primitives. The registry lost `PRIMITIVE_SUBDIRS` and `flattenNestedPrimitiveImports`: `listPrimitiveNames` and `readPrimitiveSource` read the flat folder only. Its two editor test blocks went with them. The primitives matrix drops the deleted rows and lists the kept ones as a "Block documents" section.

Evidence: `apps/registry` typechecks and passes 52 tests, and `composites` typechecks.

### The CHANGELOG records the change

`packages/cli/CHANGELOG.md` has an Unreleased breaking entry: `rafters add editor` and the editor-only primitives are no longer served, and it lists what carries forward.

Evidence: `packages/cli/CHANGELOG.md` top section.

### pnpm preflight is green

Typecheck, lint (0 errors), format, every package's tests (ui unit 675 files, a11y 191 files) and the build pass.

Evidence: `.claude/scratch/preflight-editor-reset.log` in the branch worktree, exit 0.

## Not done

The rebuild itself: block editor, composite blocks and rule mode come from a new spec. `bindEditor`'s capture techniques stay as a reference in git at main `703f91f2` (recorded in legion 01a10a9b). Folding `block-operations` into `block-op-*` and making `op-history` generic are part of the rebuild. #1623 (composites save-as-composite vocabulary) is not closed, because its bug lives in `packages/composites`, not in the editor.

Closes #2430
Closes #2258

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_016dBmsSDKQkD5xjPRVCBRVu
