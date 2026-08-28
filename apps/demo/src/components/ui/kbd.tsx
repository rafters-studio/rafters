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
import classy from '@/lib/primitives/classy';
import { kbdClasses } from '@/components/ui/kbd.classes';

export type KbdProps = React.HTMLAttributes<HTMLElement>;

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    const classes = kbdClasses({}, {});

    // No effects and no optional parts -- nothing ever calls getPart, so the
    // ref is a plain forward. The score projects nothing, so there is no aria
    // to spread; the `<kbd>` element's own semantics are the whole contract.
    return (
      <kbd
        ref={ref}
        data-part="root"
        className={classy(classes.root, className) || undefined}
        {...props}
      >
        {children}
      </kbd>
    );
  },
);

Kbd.displayName = 'Kbd';

export default Kbd;
