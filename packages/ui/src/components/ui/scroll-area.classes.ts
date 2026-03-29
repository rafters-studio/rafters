/**
 * Shared scroll area class definitions
 *
 * Imported by scroll-area.tsx (React) to keep inline strings
 * in a single source of truth.
 */

export const scrollAreaBaseClasses = 'h-full w-full rounded-sm @md:rounded-md @lg:rounded-lg';

export const scrollAreaScrollbarBaseClasses =
  '[&::-webkit-scrollbar]:w-2.5 ' +
  '[&::-webkit-scrollbar]:h-2.5 ' +
  '[&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full ' +
  '[&::-webkit-scrollbar-thumb]:bg-border ' +
  '[&::-webkit-scrollbar-corner]:bg-transparent';

export const scrollAreaOrientationClasses: Record<string, string> = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
};

export const scrollBarBaseClasses = 'flex touch-none select-none transition-colors';

export const scrollBarOrientationClasses: Record<string, string> = {
  vertical: 'h-full w-2.5 border-l border-l-transparent p-px',
  horizontal: 'h-2.5 w-full flex-col border-t border-t-transparent p-px',
};

export const scrollBarThumbClasses = 'flex-1 rounded-full bg-border';
