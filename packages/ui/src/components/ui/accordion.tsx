/**
 * Accordion component for progressive disclosure of content sections
 *
 * @cognitive-load 3/10 - Progressive disclosure reduces information overload
 * @attention-economics Content hierarchy: headers compete for scanning attention, expanded content demands focus
 * @trust-building Predictable expand/collapse behavior, persistent state for user control
 * @accessibility Keyboard navigation (arrow keys, Enter/Space), proper ARIA expanded states, focus management
 * @semantic-meaning Structure: single=mutually exclusive, multiple=independent sections, collapsible=fully closeable
 *
 * @usage-patterns
 * DO: Use for FAQs, settings groups, or long-form content organization
 * DO: Keep headers scannable and descriptive
 * DO: Use single mode when sections are mutually exclusive
 * DO: Use multiple mode for independent content sections
 * NEVER: Hide critical information in collapsed sections, nest accordions deeply
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>Section 1</Accordion.Trigger>
 *     <Accordion.Content>Content for section 1</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import {
  accordionContentClasses,
  accordionContentInnerClasses,
  accordionItemClasses,
  accordionTriggerClasses,
  accordionTriggerHeadingClasses,
  accordionTriggerIconClasses,
} from './accordion.classes';

// ==================== Context ====================

interface AccordionContextValue {
  type: 'single' | 'multiple';
  value: string[];
  onItemToggle: (itemValue: string) => void;
  collapsible: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within Accordion');
  }
  return context;
}

interface AccordionItemContextValue {
  value: string;
  triggerId: string;
  contentId: string;
  isOpen: boolean;
  disabled: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionTrigger and AccordionContent must be used within AccordionItem');
  }
  return context;
}

// ==================== Accordion (Root) ====================

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Selection mode: single allows one item open, multiple allows any number */
  type?: 'single' | 'multiple';
  /** Controlled value - string for single, string[] for multiple */
  value?: string | string[];
  /** Default value for uncontrolled usage */
  defaultValue?: string | string[];
  /** Callback when value changes */
  onValueChange?: (value: string | string[]) => void;
  /** For single type, allow closing all items (default: false) */
  collapsible?: boolean;
}

export function Accordion({
  type = 'single',
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = false,
  className,
  children,
  ...props
}: AccordionProps) {
  // Normalize value to always be string[] internally
  const normalizeValue = (val: string | string[] | undefined): string[] => {
    if (val === undefined) return [];
    if (Array.isArray(val)) return val;
    return val ? [val] : [];
  };

  // Derive initial value
  const getInitialValue = (): string[] => {
    return normalizeValue(defaultValue);
  };

  // State management (controlled vs uncontrolled)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(getInitialValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? normalizeValue(controlledValue) : uncontrolledValue;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleItemToggle = React.useCallback(
    (itemValue: string) => {
      let newValue: string[];

      if (type === 'single') {
        if (value.includes(itemValue)) {
          // Closing the open item
          newValue = collapsible ? [] : [itemValue];
        } else {
          // Opening a new item
          newValue = [itemValue];
        }
      } else {
        // Multiple mode: toggle the item
        if (value.includes(itemValue)) {
          newValue = value.filter((v) => v !== itemValue);
        } else {
          newValue = [...value, itemValue];
        }
      }

      if (!isControlled) {
        setUncontrolledValue(newValue);
      }

      // Return value in expected format based on type
      if (type === 'single') {
        onValueChange?.(newValue[0] ?? '');
      } else {
        onValueChange?.(newValue);
      }
    },
    [type, value, isControlled, collapsible, onValueChange],
  );

  // Keyboard navigation between items
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]:not([disabled])'),
    );

    const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = triggers.length - 1;
        break;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      triggers[nextIndex]?.focus();
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({
      type,
      value,
      onItemToggle: handleItemToggle,
      collapsible,
    }),
    [type, value, handleItemToggle, collapsible],
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard event delegation for arrow key navigation between accordion items */}
      <div ref={containerRef} className={classy(className)} onKeyDown={handleKeyDown} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

Accordion.displayName = 'Accordion';

// ==================== AccordionItem ====================

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value that identifies this item */
  value: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export function AccordionItem({
  value,
  disabled = false,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { value: openValues } = useAccordionContext();
  const baseId = React.useId();

  const isOpen = openValues.includes(value);
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const itemContextValue = React.useMemo(
    () => ({
      value,
      triggerId,
      contentId,
      isOpen,
      disabled,
    }),
    [value, triggerId, contentId, isOpen, disabled],
  );

  return (
    <AccordionItemContext.Provider value={itemContextValue}>
      <div
        data-state={isOpen ? 'open' : 'closed'}
        data-disabled={disabled ? '' : undefined}
        className={classy(accordionItemClasses, className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

AccordionItem.displayName = 'AccordionItem';

// ==================== AccordionTrigger ====================

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function AccordionTrigger({
  className,
  children,
  disabled: propDisabled,
  ...props
}: AccordionTriggerProps) {
  const { onItemToggle } = useAccordionContext();
  const { value, triggerId, contentId, isOpen, disabled: itemDisabled } = useAccordionItemContext();

  const disabled = propDisabled ?? itemDisabled;

  const handleClick = React.useCallback(() => {
    if (!disabled) {
      onItemToggle(value);
    }
  }, [disabled, onItemToggle, value]);

  return (
    <h3 className={accordionTriggerHeadingClasses}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        data-state={isOpen ? 'open' : 'closed'}
        data-accordion-trigger
        disabled={disabled}
        className={classy(accordionTriggerClasses, className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={classy(accordionTriggerIconClasses)}
          data-state={isOpen ? 'open' : 'closed'}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </h3>
  );
}

AccordionTrigger.displayName = 'AccordionTrigger';

// ==================== AccordionContent ====================

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Force mount content even when closed */
  forceMount?: boolean;
}

export function AccordionContent({
  forceMount,
  className,
  children,
  ...props
}: AccordionContentProps) {
  const { triggerId, contentId, isOpen } = useAccordionItemContext();

  // Use grid-rows trick for smooth height animation
  if (!forceMount && !isOpen) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: div with role="region" is the WAI-ARIA pattern for accordion content
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      data-state={isOpen ? 'open' : 'closed'}
      hidden={!isOpen}
      className={classy(accordionContentClasses, className)}
      {...props}
    >
      <div className={accordionContentInnerClasses}>{children}</div>
    </div>
  );
}

AccordionContent.displayName = 'AccordionContent';

// ==================== Namespaced Export ====================

Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

export default Accordion;
