/**
 * Collapsible component for single expandable/collapsible sections
 *
 * @cognitive-load 2/10 - Simple show/hide toggle with clear state
 * @attention-economics Progressive disclosure: hidden content doesn't compete for attention until expanded
 * @trust-building Immediate visual feedback, reversible action, clear expanded/collapsed state
 * @accessibility Proper ARIA expanded state, keyboard toggle, screen reader announcements
 * @semantic-meaning Binary visibility: open=content visible, closed=content hidden
 *
 * @usage-patterns
 * DO: Use for single sections of optional or secondary content
 * DO: Provide clear trigger indicating expand/collapse action
 * DO: Animate height changes for smooth transitions
 * DO: Use for content that users may want to hide after reading
 * NEVER: Hide critical information, use for multiple related sections (use Accordion)
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <Collapsible.Trigger>Toggle Section</Collapsible.Trigger>
 *   <Collapsible.Content>
 *     Hidden content that can be revealed
 *   </Collapsible.Content>
 * </Collapsible>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import { collapsibleContentClasses } from './collapsible.classes';

// Context for sharing collapsible state
interface CollapsibleContextValue {
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  triggerId: string;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within Collapsible');
  }
  return context;
}

// ==================== Collapsible (Root) ====================

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled open state */
  open?: boolean;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Whether the collapsible is disabled */
  disabled?: boolean;
}

export function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
  ...props
}: CollapsibleProps) {
  // Uncontrolled state
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  // Determine if controlled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (disabled) return;

      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, disabled, onOpenChange],
  );

  // Generate stable IDs for ARIA relationships
  const id = React.useId();
  const contentId = `collapsible-content-${id}`;
  const triggerId = `collapsible-trigger-${id}`;

  const contextValue = React.useMemo(
    () => ({
      open,
      disabled,
      onOpenChange: handleOpenChange,
      contentId,
      triggerId,
    }),
    [open, disabled, handleOpenChange, contentId, triggerId],
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div
        className={classy(className)}
        data-state={open ? 'open' : 'closed'}
        data-disabled={disabled ? '' : undefined}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

// ==================== CollapsibleTrigger ====================

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render as child element (polymorphic) */
  asChild?: boolean;
}

export function CollapsibleTrigger({
  asChild,
  onClick,
  className,
  disabled: disabledProp,
  children,
  ...props
}: CollapsibleTriggerProps) {
  const {
    open,
    disabled: contextDisabled,
    onOpenChange,
    contentId,
    triggerId,
  } = useCollapsibleContext();

  const disabled = disabledProp ?? contextDisabled;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(!open);
    }
  };

  const triggerProps = {
    id: triggerId,
    'aria-expanded': open,
    'aria-controls': contentId,
    'data-state': open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
    disabled,
    onClick: handleClick,
    className: classy(className),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(triggerProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

// ==================== CollapsibleContent ====================

export interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force mount the content (useful for animations) */
  forceMount?: boolean;
  /** Render as child element (polymorphic) */
  asChild?: boolean;
}

export function CollapsibleContent({
  forceMount,
  asChild,
  className,
  children,
  ...props
}: CollapsibleContentProps) {
  const { open, contentId, triggerId, disabled } = useCollapsibleContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  const shouldRender = forceMount || open;

  if (!shouldRender) {
    return null;
  }

  const contentProps = {
    ref: contentRef,
    id: contentId,
    'aria-labelledby': triggerId,
    'data-state': open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
    hidden: !open,
    className: classy(collapsibleContentClasses, className),
    ...props,
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown>;
    const merged = mergeProps(contentProps as Partial<unknown>, childProps);
    return React.cloneElement(child, merged as Partial<Record<string, unknown>>);
  }

  return <div {...contentProps}>{children}</div>;
}

// ==================== Display Names ====================

Collapsible.displayName = 'Collapsible';
CollapsibleTrigger.displayName = 'CollapsibleTrigger';
CollapsibleContent.displayName = 'CollapsibleContent';

// ==================== Namespaced Export ====================

Collapsible.Trigger = CollapsibleTrigger;
Collapsible.Content = CollapsibleContent;

export default Collapsible;
