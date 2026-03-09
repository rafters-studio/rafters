/**
 * Keyboard key indicator component for displaying shortcuts and key combinations
 *
 * @cognitive-load 1/10 - Simple visual indicator, no interaction required
 * @attention-economics Tertiary information: supplements primary content without competing
 * @trust-building Teaches keyboard shortcuts, builds power-user confidence
 * @accessibility Semantic kbd element, screen reader compatible
 * @semantic-meaning Keyboard representation: displays key names, shortcuts, combinations
 *
 * @usage-patterns
 * DO: Use in tooltips to show keyboard shortcuts
 * DO: Use in menus alongside action items
 * DO: Use platform-appropriate modifier keys (Cmd for Mac, Ctrl for Windows)
 * DO: Combine multiple Kbd elements for key combinations
 * NEVER: Use for non-keyboard content, use without context
 *
 * @example
 * ```tsx
 * // Single key
 * <Kbd>Enter</Kbd>
 *
 * // Key combination
 * <Kbd>Cmd</Kbd> + <Kbd>S</Kbd>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => {
  return (
    <kbd
      ref={ref}
      className={classy(
        'inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
});

Kbd.displayName = 'Kbd';
