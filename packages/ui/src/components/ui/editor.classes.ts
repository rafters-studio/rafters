/**
 * Shared editor class definitions
 *
 * Co-located utility strings for the editor's composed surfaces (sidebar block
 * palette, and future command palette / context menu / inline toolbar). Kept
 * here so the React `editor.tsx` and the planned `<rafters-editor>` Web
 * Component re-host bind to one source of truth, the same way every other
 * triple-target component shares a `*.classes.ts`.
 */

/** Flex row wrapping the block-palette sidebar and the canvas. */
export const editorSidebarLayoutClasses = 'flex h-full min-h-0';

/** The sidebar panel itself: fixed-width, scrollable column beside the canvas. */
export const editorSidebarAsideClasses =
  'flex w-64 shrink-0 flex-col overflow-hidden border-r border-border';

/** The sidebar search input. */
export const editorSidebarSearchClasses = 'border-b border-border px-3 py-2 text-sm outline-none';

/** Scrollable list region that the block-palette primitive mounts into. */
export const editorSidebarListClasses = 'flex-1 overflow-y-auto p-2';

/** Category header above each group of palette items. */
export const editorSidebarCategoryClasses = 'px-1 py-1 text-xs font-medium text-muted-foreground';

/** A single palette item row. */
export const editorSidebarItemClasses = 'cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent';
