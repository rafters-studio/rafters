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
import { createBehavior, type AriaAttrs, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import { mergeProps } from '@/lib/primitives/slot';
import {
  collapsible,
  isOpen,
  type CollapsibleActions,
  type CollapsibleConfig,
  type CollapsiblePart,
  type CollapsibleState,
} from '@/components/ui/collapsible.behavior';
import { collapsibleClasses, type CollapsibleClassSet } from '@/components/ui/collapsible.classes';

interface CollapsibleContextValue {
  state: CollapsibleState;
  config: CollapsibleConfig;
  ids: PartIds<CollapsiblePart>;
  aria: Partial<Record<CollapsiblePart, AriaAttrs>>;
  classes: CollapsibleClassSet;
  effectiveOpen: boolean;
  disabled: boolean;
  request: (action: keyof CollapsibleActions) => boolean;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext(component: string): CollapsibleContextValue {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error(`${component} must be used within <Collapsible>`);
  }
  return context;
}

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled open state. */
  open?: boolean;
  /** Default open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Callback when the open state changes via user interaction. */
  onOpenChange?: (open: boolean) => void;
  /** Whether the collapsible is disabled (gates the toggle). */
  disabled?: boolean;
}

/**
 * A single expandable region. The trigger toggles one content region open and
 * closed; a native `<button>` fulfils Enter/Space, so there is no custom keymap.
 *
 * @cognitive-load 2/10 - decision 0, information 1, interaction 1, disruption 0,
 * learning 0. No decision (the reveal is reversible and consequence-free); one
 * unit of information behind one universally-learned expand/collapse affordance,
 * with no workflow disruption.
 * @attention-economics Progressive disclosure: the hidden content does not
 * compete for attention until the user chooses to expand it, so the collapsed
 * state keeps the initial scan cheap. Best for a single optional or secondary
 * region; multiple related regions belong in an Accordion.
 * @trust-building Immediate visual feedback on the trigger's expanded state, a
 * fully reversible action, and an always-clear open/closed indicator. The region
 * never collapses on its own, so the user is never surprised by vanishing content.
 * @accessibility The trigger is a native button carrying aria-expanded and, while
 * open, aria-controls wired to the content's real DOM id -- the complete WAI-ARIA
 * disclosure pattern, asserted against rendered DOM by the harness. A disabled
 * collapsible sets the native disabled attribute and refuses to toggle.
 */
export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
  ...props
}: CollapsibleProps) {
  const config: CollapsibleConfig = { open, defaultOpen, disabled };

  // The controller composes the score with the substrate -- no useBehavior.
  // createBehavior is the model; useMemory subscribes React to it. There is no
  // impure primitive to compose, so no useEffect: a plain disclosure.
  const { memory, dispatch } = React.useMemo(() => createBehavior(collapsible, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<CollapsiblePart>;
    for (const part of Object.keys(collapsible.parts) as CollapsiblePart[]) {
      // Only trigger/content need ids (aria-controls targets content); root
      // carries none, matching the oracle wrapper.
      out[part] = part === 'root' ? '' : `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  // Gotcha #1: report the value to set even when a controlled group's effective
  // value cannot move. canDispatch already gates disabled + idempotence, so the
  // callback fires once per real transition and never while disabled.
  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof CollapsibleActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  const aria = collapsible.aria(state, config, ids);
  const classes = collapsibleClasses(config, state);

  const contextValue: CollapsibleContextValue = {
    state,
    config,
    ids,
    aria,
    classes,
    effectiveOpen,
    disabled,
    request,
  };

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div data-part="root" className={classy(classes.root, className)} {...aria.root} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

Collapsible.displayName = 'Collapsible';

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render as the child element (polymorphic). */
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
  const { effectiveOpen, ids, aria, classes, disabled, request } =
    useCollapsibleContext('CollapsibleTrigger');
  const isTriggerDisabled = disabledProp ?? disabled;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    request(effectiveOpen ? 'close' : 'open');
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    disabled: isTriggerDisabled,
    className: classy(classes.trigger, className),
    ...aria.trigger,
    onClick: handleClick,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  return (
    <button type="button" {...partProps} {...props}>
      {children}
    </button>
  );
}

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Keep the content mounted while closed (hidden + data-state=closed). */
  forceMount?: boolean;
  /** Render as the child element (polymorphic). */
  asChild?: boolean;
}

export function CollapsibleContent({
  forceMount,
  asChild,
  className,
  children,
  ...props
}: CollapsibleContentProps) {
  const { effectiveOpen, ids, aria, classes } = useCollapsibleContext('CollapsibleContent');

  if (!(forceMount || effectiveOpen)) return null;

  const partProps = {
    'data-part': 'content',
    id: ids.content || undefined,
    // A force-mounted closed region must stay inert and out of the tab order.
    hidden: effectiveOpen ? undefined : true,
    className: classy(classes.content, className),
    ...aria.content,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, mergeProps(partProps, childProps) as React.Attributes);
  }

  return (
    <div {...partProps} {...props}>
      {children}
    </div>
  );
}

CollapsibleContent.displayName = 'CollapsibleContent';

Collapsible.Trigger = CollapsibleTrigger;
Collapsible.Content = CollapsibleContent;

export default Collapsible;
