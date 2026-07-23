/**
 * Kbd -- a keyboard key cap for displaying keys, shortcuts, and combinations.
 * Render one key per Kbd and compose several for a combination
 * (`<Kbd>Cmd</Kbd> + <Kbd>S</Kbd>`); use platform-appropriate modifiers.
 *
 * @cognitive-load 1/10 - decision 0, info 1, interaction 0, disruption 0, learning 0
 * @attention-economics Tertiary information: a key cap supplements the primary
 * content without competing for attention -- it annotates, it never announces.
 * @trust-building Teaches keyboard shortcuts in place, building power-user
 * confidence; a consistent cap shape makes shortcuts scannable across a view.
 * @accessibility The semantic `<kbd>` element is the whole contract -- it marks
 * its text as keyboard input for assistive technology, so the score projects no
 * ARIA and adds no role. The key text is the accessible name by construction.
 *
 * A pure static score has nothing to subscribe to: the performance is pure
 * decoration application. No useMemory, no bind -- config in, classes out,
 * children through, the semantic `<kbd>` element is fixed.
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
