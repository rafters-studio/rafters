### apps/registry/src/lib/registry/componentService.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Removed PRIMITIVE_SUBDIRS and flattenNestedPrimitiveImports; listPrimitiveNames and readPrimitiveSource now read the flat folder only, simpler with no duplicated branch. Evidence: componentService.ts listPrimitiveNames, readPrimitiveSource. Verdict: clean.

### apps/registry/test/componentService.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Removed the two editor describe blocks (#2136, #2170) and the imports only they used; remaining tests unchanged. Evidence: componentService.test.ts import block. Verdict: clean.

### packages/cli/CHANGELOG.md
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/cli/CHANGELOG.md diff. Verdict: clean.

### packages/cli/test/integration/add-editor-primitive.integration.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/cli/test/integration/add-editor-primitive.integration.test.ts (deleted). Verdict: clean.

### packages/composites/src/bridge.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/composites/src/bridge.ts diff. Verdict: clean.

### packages/ui/docs/spec/matrix/primitives.jsonl
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/docs/spec/matrix/primitives.jsonl diff. Verdict: clean.

### packages/ui/docs/spec/matrix/primitives.md
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/docs/spec/matrix/primitives.md diff. Verdict: clean.

### packages/ui/src/components/chart/index.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/components/chart/index.ts diff. Verdict: clean.

### packages/ui/src/components/command/command.behavior.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/components/command/command.behavior.ts diff. Verdict: clean.

### packages/ui/src/components/editor/editor.astro
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/editor.astro (deleted). Verdict: clean.

### packages/ui/src/components/editor/editor.behavior.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/editor.behavior.ts (deleted). Verdict: clean.

### packages/ui/src/components/editor/editor.classes.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/editor.classes.ts (deleted). Verdict: clean.

### packages/ui/src/components/editor/editor.element.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/editor.element.ts (deleted). Verdict: clean.

### packages/ui/src/components/editor/editor.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/editor.tsx (deleted). Verdict: clean.

### packages/ui/src/components/editor/index.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/components/editor/index.ts (deleted). Verdict: clean.

### packages/ui/src/components/input-otp/input-otp.behavior.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/components/input-otp/input-otp.behavior.ts diff. Verdict: clean.

### packages/ui/src/hooks/use-block-selection.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/hooks/use-block-selection.ts diff. Verdict: clean.

### packages/ui/src/hooks/use-clipboard.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/hooks/use-clipboard.ts diff. Verdict: clean.

### packages/ui/src/hooks/use-command-palette.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/hooks/use-command-palette.ts diff. Verdict: clean.

### packages/ui/src/hooks/use-drag-drop.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/src/hooks/use-drag-drop.ts diff. Verdict: clean.

### packages/ui/src/index.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Root exports now point at the flat block-ops, block-op-types and op-history primitives; dropped exports of deleted modules and the src/old type re-export. Evidence: packages/ui/src/index.ts export list. Verdict: clean.

### packages/ui/src/old/ui/document-editor.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/old/ui/document-editor.ts (deleted). Verdict: clean.

### packages/ui/src/old/ui/editor.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/old/ui/editor.tsx (deleted). Verdict: clean.

### packages/ui/src/primitives/block-op-content.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-op-content.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-op-format.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-op-format.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-op-structural.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-op-structural.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-op-text.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-op-text.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-op-types.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-op-types.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-operations.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-operations.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-ops.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-ops.ts import block. Verdict: clean.

### packages/ui/src/primitives/block-palette.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/block-palette.ts import block. Verdict: clean.

### packages/ui/src/primitives/clipboard.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/clipboard.ts import block. Verdict: clean.

### packages/ui/src/primitives/command-palette.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/command-palette.ts import block. Verdict: clean.

### packages/ui/src/primitives/cursor-tracker.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/cursor-tracker.ts import block. Verdict: clean.

### packages/ui/src/primitives/drag-drop.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/drag-drop.ts import block. Verdict: clean.

### packages/ui/src/primitives/editor/block-canvas.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/block-canvas.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/block-context-menu.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/block-context-menu.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/block-wrapper.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/block-wrapper.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/canvas-drop-zone.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/canvas-drop-zone.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/editor-toolbar.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/editor-toolbar.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/inline-formatter.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/inline-formatter.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/inline-toolbar.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/inline-toolbar.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/rule-dialog.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/rule-dialog.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/rule-drop-zone.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/rule-drop-zone.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/rule-palette.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/rule-palette.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/serializer-html.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/serializer-html.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/serializer-mdx.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/serializer-mdx.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/serializer-text.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/serializer-text.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/editor/serializer.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/src/primitives/editor/serializer.ts (deleted). Verdict: clean.

### packages/ui/src/primitives/input-events.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/input-events.ts import block. Verdict: clean.

### packages/ui/src/primitives/op-history.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/op-history.ts import block. Verdict: clean.

### packages/ui/src/primitives/selection.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Moved flat from the editor tree; only import specifiers changed (relative paths now ./types, ./memory, ./block-op-*), no logic touched, so no new duplication, abstraction, stringly state or swallowed errors. Evidence: packages/ui/src/primitives/selection.ts import block. Verdict: clean.

### packages/ui/test/components/editor/caret.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/caret.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor-scenarios.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor-scenarios.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.a11y.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.a11y.tsx (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.astro.a11y.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.astro.a11y.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.astro.spec.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.astro.spec.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.behavior.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.behavior.test.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.classes.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.classes.test.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.element.a11y.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.element.a11y.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.element.spec.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.element.spec.ts (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.react-props.test.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.react-props.test.tsx (deleted). Verdict: clean.

### packages/ui/test/components/editor/editor.spec.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/components/editor/editor.spec.tsx (deleted). Verdict: clean.

### packages/ui/test/hooks/use-clipboard.test.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/test/hooks/use-clipboard.test.tsx diff. Verdict: clean.

### packages/ui/test/hooks/use-drag-drop.test.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/test/hooks/use-drag-drop.test.tsx diff. Verdict: clean.

### packages/ui/test/old/components/editor.a11y.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/old/components/editor.a11y.tsx (deleted). Verdict: clean.

### packages/ui/test/old/components/editor.test.tsx
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: packages/ui/test/old/components/editor.test.tsx (deleted). Verdict: clean.

### packages/ui/test/primitives/block-operations.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/block-operations.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/block-ops.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/block-ops.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/block-palette.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/block-palette.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/clipboard.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/clipboard.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/command-palette.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/command-palette.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/drag-drop.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/drag-drop.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/block-context-menu.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/block-context-menu.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/canvas-drop-zone.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/canvas-drop-zone.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/inline-formatter.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/inline-formatter.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/rule-dialog.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/rule-dialog.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/rule-drop-zone.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/rule-drop-zone.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/rule-palette.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/rule-palette.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/serializer-html.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/serializer-html.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/serializer-mdx-fixtures.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/serializer-mdx-fixtures.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/serializer-mdx.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/serializer-mdx.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/serializer-text.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/serializer-text.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/editor/serializer.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/editor/serializer.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/input-events.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/input-events.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/op-history.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/op-history.test.ts import lines. Verdict: clean.

### packages/ui/test/primitives/selection.test.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Test moved with its primitive; only the import path changed to the flat ../../src/primitives location, assertions unchanged. Evidence: packages/ui/test/primitives/selection.test.ts import lines. Verdict: clean.

### packages/ui/tsconfig.json
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: packages/ui/tsconfig.json diff. Verdict: clean.

### plugin/bin/rafters-mcp.bundle.mjs
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: plugin/bin/rafters-mcp.bundle.mjs diff. Verdict: clean.

### test/editor/editor-capture.spec.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: test/editor/editor-capture.spec.ts (deleted). Verdict: clean.

### test/editor/support/build-editor-harness.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: test/editor/support/build-editor-harness.ts (deleted). Verdict: clean.

### test/editor/support/harness-entry.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Deleted as part of the editor reset; nothing outside the deleted code imports it (checked with legion sym importers), so removal leaves no dangling reference. Evidence: test/editor/support/harness-entry.ts (deleted). Verdict: clean.

### vitest.config.ts
Checked for duplicate logic, unnecessary abstraction and stringly state. Reference or config update for the reset (comment wording, matrix rows, tsconfig files entry, vitest exclude, changelog); no logic added. Evidence: vitest.config.ts diff. Verdict: clean.

