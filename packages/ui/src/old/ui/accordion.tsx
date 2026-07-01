/**
 * Accordion component for progressive disclosure of content sections
 *
 * Behavior (expansion state, ArrowUp/Down/Home/End navigation, roving tabindex, ARIA
 * and visibility reflection) lives in the framework-agnostic createAccordion controller,
 * which composes the shared primitives (selection-group + roving-focus). React renders
 * markup and delegates via a callback ref - the same controller the Astro and
 * web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * @cognitive-load 3/10 - Progressive disclosure reduces information overload
 * @attention-economics Content hierarchy: headers compete for scanning attention, expanded content demands focus
 * @trust-building Predictable expand/collapse behavior, persistent state for user control
 * @accessibility Keyboard navigation (arrow keys, Enter/Space), proper ARIA expanded states, focus management
 * @semantic-meaning Structure: single=mutually exclusive, multiple=independent sections, collapsible=fully closeable
 *
 * @usage-patterns
 * DO: Use for FAQs, settings groups, or long-form content organization
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
import { type AccordionController, createAccordion } from './accordion.controller';

function normalizeValue(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ==================== Item context (value + ARIA ids only) ====================

interface AccordionItemContextValue {
  value: string;
  triggerId: string;
  contentId: string;
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
  const isControlled = controlledValue !== undefined;

  const initialRef = React.useRef(normalizeValue(isControlled ? controlledValue : defaultValue));
  const onChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onChangeRef.current = onValueChange;
  });

  const controllerRef = React.useRef<AccordionController | null>(null);

  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const controller = createAccordion(node, {
        type,
        collapsible,
        initial: initialRef.current,
        onChange: (values) => {
          onChangeRef.current?.(type === 'single' ? (values[0] ?? '') : values);
        },
      });
      controllerRef.current = controller;
      return () => {
        controller.destroy();
        controllerRef.current = null;
      };
    },
    [type, collapsible],
  );

  // Controlled mode: mirror the prop into the controller.
  React.useEffect(() => {
    if (isControlled) {
      controllerRef.current?.setValue(normalizeValue(controlledValue));
    }
  }, [isControlled, controlledValue]);

  return (
    <div ref={setRoot} className={classy(className)} {...props}>
      {children}
    </div>
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
  const baseId = React.useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const itemContextValue = React.useMemo(
    () => ({ value, triggerId, contentId, disabled }),
    [value, triggerId, contentId, disabled],
  );

  return (
    <AccordionItemContext.Provider value={itemContextValue}>
      <div
        data-accordion-item
        data-value={value}
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
  const { value, triggerId, contentId, disabled: itemDisabled } = useAccordionItemContext();
  const disabled = propDisabled ?? itemDisabled;

  // No aria-expanded / data-state / onClick here: the controller reflects state and
  // handles toggling (click delegation) + roving focus on the root. The heading uses
  // role/aria-level rather than a raw h-tag (the system owns typography components).
  return (
    // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA heading wrapper; the system typography rule disallows a raw <h3 className>, so role/aria-level is used
    <div role="heading" aria-level={3} className={accordionTriggerHeadingClasses}>
      <button
        type="button"
        id={triggerId}
        aria-controls={contentId}
        data-accordion-trigger
        data-roving-item
        data-value={value}
        disabled={disabled}
        className={classy(accordionTriggerClasses, className)}
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
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

AccordionTrigger.displayName = 'AccordionTrigger';

// ==================== AccordionContent ====================

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  const { value, triggerId, contentId } = useAccordionItemContext();

  // Always mounted; the controller toggles hidden + data-state. (No forceMount/null.)
  return (
    // biome-ignore lint/a11y/useSemanticElements: div with role="region" is the WAI-ARIA pattern for accordion content
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      data-accordion-content
      data-value={value}
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
