/**
 * Shared editor class definitions
 *
 * Co-located utility strings for the editor's composed palette surfaces (block
 * sidebar, rule palette, and future command palette / context menu / inline
 * toolbar). Kept here so the React `editor.tsx` and the planned
 * `<rafters-editor>` Web Component re-host bind to one source of truth, the same
 * way every other triple-target component shares a `*.classes.ts`.
 */

/** Flex row wrapping the palette panes and the canvas. */
export const editorPaletteLayoutClasses = 'flex h-full min-h-0';

/** Block sidebar pane (left of the canvas). */
export const editorSidebarAsideClasses =
  'flex w-64 shrink-0 flex-col overflow-hidden border-r border-border';

/** Rule palette pane (right of the canvas). */
export const editorRulePaletteAsideClasses =
  'flex w-64 shrink-0 flex-col overflow-hidden border-l border-border';

/** A palette pane's search input. */
export const editorPaletteSearchClasses = 'border-b border-border px-3 py-2 text-sm outline-none';

/** Scrollable list region a block-palette primitive mounts into. */
export const editorPaletteListClasses = 'flex-1 overflow-y-auto p-2';

/** Category header above each group of palette items. */
export const editorPaletteCategoryClasses = 'px-1 py-1 text-xs font-medium text-muted-foreground';

/** A single palette item row. */
export const editorPaletteItemClasses = 'cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent';

/** Floating slash-command menu, caret-anchored (viewport position via inline style). */
export const editorSlashMenuClasses =
  'fixed z-50 flex w-64 flex-col overflow-hidden rounded border border-border bg-popover shadow-md';

/** The slash menu's command search input. */
export const editorSlashSearchClasses = 'border-b border-border px-3 py-2 text-sm outline-none';

/** The slash menu's scrollable command list. */
export const editorSlashListClasses = 'max-h-64 overflow-y-auto p-1';

/** A single slash-menu command row. */
export const editorSlashItemClasses = 'cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent';

/** The selected slash-menu command row. */
export const editorSlashItemSelectedClasses = 'bg-accent';

/** Block right-click context menu (positioned fixed by the primitive). */
export const editorContextMenuClasses =
  'z-50 min-w-40 rounded border border-border bg-popover p-1 shadow-md';

/** A single context-menu item. */
export const editorContextMenuItemClasses =
  'cursor-pointer rounded px-2 py-1 text-sm outline-none hover:bg-accent focus:bg-accent';

/** A destructive context-menu item (e.g. delete). */
export const editorContextMenuDestructiveClasses = 'text-destructive';

/** Floating inline format toolbar, anchored at the selection (viewport position via inline style). */
export const editorInlineToolbarClasses =
  'fixed z-50 flex items-center gap-0.5 rounded border border-border bg-popover p-1 shadow-md';

/** An inline-toolbar format button. */
export const editorInlineToolbarButtonClasses =
  'cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent';

/** An active (applied) inline-toolbar format button. */
export const editorInlineToolbarButtonActiveClasses = 'bg-accent';
