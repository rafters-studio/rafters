/**
 * Tabbed interface component with keyboard navigation and ARIA compliance
 *
 * Behavior (selection state, arrow/Home/End navigation, roving tabindex, ARIA and
 * visibility reflection) lives in the framework-agnostic createTabs controller, which
 * composes the shared primitives (selection-group + roving-focus). React renders the
 * markup and delegates to the controller via a callback ref - the same controller the
 * Astro and web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * @cognitive-load 4/10 - Content organization with state management requires cognitive processing
 * @attention-economics Content organization: visible=current context, hidden=available contexts, active=user focus
 * @trust-building Persistent selection, clear active indication, predictable navigation patterns
 * @accessibility Arrow key navigation, tab focus management, panel association, screen reader support
 * @semantic-meaning Structure: tablist=navigation, tab=option, tabpanel=content, selected=current view
 *
 * @usage-patterns
 * DO: Use for related content showing different views of same data/context
 * DO: Provide clear, descriptive, scannable tab names (7±2 maximum)
 * NEVER: More than 7 tabs, unrelated content sections, unclear active state
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <Tabs.List>
 *     <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *     <Tabs.Trigger value="details">Details</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="overview">Overview content</Tabs.Content>
 *   <Tabs.Content value="details">Details content</Tabs.Content>
 * </Tabs>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';
import {
  tabsContentClasses,
  tabsListClasses,
  tabsTriggerBaseClasses,
  tabsTriggerStateClasses,
} from './tabs.classes';
import { createTabs, type TabsController } from './tabs.controller';

// Context carries only the stable base id for ARIA relationships. All behavior
// lives in the controller, so there is no value/dispatch threaded through context.
interface TabsContextValue {
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs');
  }
  return context;
}

// ==================== Tabs (Root) ====================

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled value */
  value?: string;
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = controlledValue !== undefined;
  const baseId = React.useId();

  // Capture the initial active value once; the controller owns state thereafter.
  const initialRef = React.useRef(isControlled ? controlledValue : defaultValue);
  // Keep the latest onValueChange reachable without re-mounting the controller.
  const onChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onChangeRef.current = onValueChange;
  });

  const controllerRef = React.useRef<TabsController | null>(null);

  // Mount the controller via a callback ref: runs during commit (before paint),
  // so initial selection is reflected with no flash, and React renders no
  // selection-derived attributes, so re-renders cannot clobber the controller.
  const setRoot = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const controller = createTabs(node, {
      initial: initialRef.current,
      onChange: (value) => onChangeRef.current?.(value),
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Controlled mode: mirror the prop into the controller.
  React.useEffect(() => {
    if (isControlled && controlledValue !== undefined) {
      controllerRef.current?.setValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  return (
    <TabsContext.Provider value={{ baseId }}>
      <div ref={setRoot} className={classy(className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

Tabs.displayName = 'Tabs';

// ==================== TabsList ====================

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className, children, ...props }: TabsListProps) {
  // Keyboard navigation is owned by the controller's roving-focus; this is markup only.
  return (
    <div role="tablist" className={classy(tabsListClasses, className)} {...props}>
      {children}
    </div>
  );
}

TabsList.displayName = 'TabsList';

// ==================== TabsTrigger ====================

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Value that identifies this tab */
  value: string;
}

export function TabsTrigger({ value, className, children, disabled, ...props }: TabsTriggerProps) {
  const { baseId } = useTabsContext();
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  // No aria-selected / tabindex / onClick here: the controller reflects selection
  // state and handles activation (click delegation + roving focus) on the root.
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-controls={panelId}
      disabled={disabled}
      data-value={value}
      className={classy(tabsTriggerBaseClasses, tabsTriggerStateClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
}

TabsTrigger.displayName = 'TabsTrigger';

// ==================== TabsContent ====================

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value that identifies this panel */
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { baseId } = useTabsContext();
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  // Visibility (hidden) and data-state are set by the controller before paint.
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: tabpanels are focusable per WAI-ARIA authoring practices
      tabIndex={0}
      data-value={value}
      className={classy(tabsContentClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}

TabsContent.displayName = 'TabsContent';

// ==================== Namespaced Export ====================

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export default Tabs;
