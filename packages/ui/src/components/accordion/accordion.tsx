import * as React from 'react';
import { useMemory } from '../../hooks/use-memory';
import { createBehavior, type PartIds } from '../../lib/contract';
import classy from '../../primitives/classy';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  accordion,
  accordionInstanceAria,
  emitValue,
  expandedValues,
  type AccordionConfig,
  type AccordionPart,
  type AccordionState,
} from './accordion.behavior';
import { accordionClasses, type AccordionClassSet } from './accordion.classes';

interface AccordionContextValue {
  state: AccordionState;
  config: AccordionConfig;
  classes: AccordionClassSet;
  groupDisabled: boolean;
  instanceId: (part: AccordionPart, value: string) => string;
  request: (value: string) => boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext(component: string): AccordionContextValue {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error(`${component} must be used within <Accordion>`);
  }
  return context;
}

interface AccordionItemContextValue {
  value: string;
  triggerId: string;
  contentId: string;
  disabled: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext(component: string): AccordionItemContextValue {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error(`${component} must be used within <AccordionItem>`);
  }
  return context;
}

/** Order-insensitive set equality: expansion is by value, order is not state. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

export interface AccordionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Disclosure mode: single holds at most one open section, multiple any number. */
  type?: 'single' | 'multiple';
  /** Controlled value: string for single, string[] for multiple. */
  value?: string | string[];
  /** Default value for uncontrolled usage. */
  defaultValue?: string | string[];
  /** Callback when the expanded set changes via user interaction. */
  onValueChange?: (value: string | string[]) => void;
  /** In single mode, allow closing the open section (default false). */
  collapsible?: boolean;
  /** Whether every section is disabled. */
  disabled?: boolean;
  /** Heading level of the wrapper around each header button (default 3). */
  headingLevel?: number;
}

/**
 * Stacked expandable sections: header buttons that disclose regions, one open
 * at a time (`single`) or any number (`multiple`). ArrowUp/ArrowDown and
 * Home/End move focus across the headers via a roving tabindex; Enter, Space, or
 * click toggles the focused section. Panels stay in the DOM hidden when
 * collapsed, so their content is crawlable and the height transition runs on the
 * same node.
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 1, disruption 0,
 * learning 0. One decision at a time (which section to open) over a visible list
 * of labelled headers; collapsed panels hold information out of view until it is
 * asked for, so nothing must be held in memory. The expand/collapse affordance
 * is universally learned and the page never moves under the reader.
 * @attention-economics Progressive disclosure spends attention only where it is
 * requested: headers are the scannable index, the open panel is the single
 * focus. Single mode enforces one demand at a time; multiple mode trades that
 * focus for comparison across sections. Beyond roughly ten sections the header
 * list itself becomes the scanning cost and a Tabs or navigation surface is the
 * cheaper structure.
 * @trust-building Reversible and predictable: every section reopens exactly as
 * it was, nothing is destroyed by collapsing, and the chevron plus data-state
 * keep the current shape visible at a glance. Content is never removed from the
 * document, so find-in-page and assistive tooling can still reach it.
 * @accessibility Each header button is contained by a role="heading" wrapper
 * carrying aria-level (the WAI-ARIA accordion pattern), and projects
 * aria-expanded plus aria-controls pointing at its panel; each panel is a
 * role="region" named by aria-labelledby back to its header. Roving tabindex
 * keeps exactly one header in the tab order; ArrowUp/ArrowDown/Home/End move
 * focus; Enter/Space activate natively. Disabled sections leave the tab order
 * (native disabled) and are skipped by roving.
 */
export function Accordion({
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  collapsible = false,
  disabled = false,
  headingLevel = 3,
  className,
  children,
  ...props
}: AccordionProps) {
  const config: AccordionConfig = {
    type,
    value,
    defaultValue,
    collapsible,
    disabled,
    headingLevel,
  };

  // The decorator composes the score with the substrate -- no useBehavior.
  // createBehavior is the model; useMemory subscribes React to it; the effect
  // below composes the roving-focus primitive directly against the root.
  const { memory, dispatch } = React.useMemo(() => createBehavior(accordion, config), []);
  const state = useMemory(memory);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<AccordionPart>;
    for (const part of Object.keys(accordion.parts) as AccordionPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);
  // Instance ids derived from the root uid -- never hand-templated per call site.
  const instanceId = React.useCallback(
    (part: AccordionPart, itemValue: string) => `${uid}-${part}-${itemValue}`,
    [uid],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Gotcha #1: the controlled callback compares the EFFECTIVE set before
  // against the INTRINSIC set after the reducer -- a controlled accordion's
  // effective set never moves (config shadows it), but the callback must still
  // report the set to apply. canDispatch already gates accordion-disabled, and
  // single non-collapsible returns identical state on a re-activation, so the
  // set comparison also absorbs that no-op.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    (itemValue: string): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      const before = expandedValues(memory.get(), cfg);
      if (!dispatch('toggle', cfg, itemValue)) return false;
      const after = memory.get().value;
      if (!sameSet(before, after)) cb?.(emitValue(after, cfg));
      return true;
    },
    [memory, dispatch],
  );

  // Compose the roving-focus primitive directly against the root -- it owns the
  // roving tabindex and ArrowUp/ArrowDown/Home/End movement across the
  // [data-roving-item] header buttons. Expansion does NOT follow focus, so
  // there is no second keydown effect: activation flows through the header
  // <button>'s native click (Enter/Space included).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return createRovingFocus(root, { orientation: 'vertical' });
  }, []);

  const aria = accordion.aria(state, config, ids);
  const classes = accordionClasses(config, state);

  const contextValue: AccordionContextValue = {
    state,
    config,
    classes,
    groupDisabled: disabled,
    instanceId,
    request,
  };

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        id={ids.root}
        className={classy(classes.root, className)}
        {...aria.root}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

Accordion.displayName = 'Accordion';

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value that identifies this section. */
  value: string;
  /** Whether this section is disabled. */
  disabled?: boolean;
}

export function AccordionItem({
  value,
  disabled = false,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { state, config, classes, groupDisabled, instanceId } =
    useAccordionContext('AccordionItem');
  const itemContext: AccordionItemContextValue = {
    value,
    triggerId: instanceId('trigger', value),
    contentId: instanceId('content', value),
    disabled: groupDisabled || disabled,
  };
  const aria = accordionInstanceAria('item', value, state, config, {});

  return (
    <AccordionItemContext.Provider value={itemContext}>
      <div
        data-part="item"
        data-value={value}
        data-disabled={itemContext.disabled ? '' : undefined}
        className={classy(classes.item, className)}
        {...aria}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

AccordionItem.displayName = 'AccordionItem';

export type AccordionTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function AccordionTrigger({
  className,
  children,
  disabled: propDisabled,
  onClick,
  ...props
}: AccordionTriggerProps) {
  const { state, config, classes, request } = useAccordionContext('AccordionTrigger');
  const {
    value,
    triggerId,
    contentId,
    disabled: itemDisabled,
  } = useAccordionItemContext('AccordionTrigger');
  const disabled = propDisabled ?? itemDisabled;
  const headingAria = accordionInstanceAria('heading', value, state, config, {});
  const aria = accordionInstanceAria('trigger', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: role=heading is the projected part; a raw <h3 className> is disallowed by the typography rule, and the level is config-driven
    <div data-part="heading" data-value={value} className={classes.heading} {...headingAria}>
      <button
        type="button"
        id={triggerId}
        data-part="trigger"
        data-value={value}
        data-roving-item
        disabled={disabled}
        className={classy(classes.trigger, className)}
        {...aria}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          request(value);
        }}
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
          className={classes.triggerIcon}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

AccordionTrigger.displayName = 'AccordionTrigger';

export type AccordionContentProps = React.HTMLAttributes<HTMLDivElement>;

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  const { state, config, classes } = useAccordionContext('AccordionContent');
  const { value, triggerId, contentId } = useAccordionItemContext('AccordionContent');
  const aria = accordionInstanceAria('content', value, state, config, {
    trigger: triggerId,
    content: contentId,
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: role=region is the projected part -- the WAI-ARIA accordion panel; <section> would hard-code the role the score owns
    <div
      id={contentId}
      data-part="content"
      data-value={value}
      className={classy(classes.content, className)}
      {...aria}
      {...props}
    >
      <div className={classes.contentInner}>{children}</div>
    </div>
  );
}

AccordionContent.displayName = 'AccordionContent';

Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

export default Accordion;
