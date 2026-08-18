/**
 * HoverCard component for rich preview content on hover
 *
 * @cognitive-load 3/10 - Contextual preview that supplements rather than replaces visible content
 * @attention-economics Glanceable enrichment: provides additional context without requiring action
 * @trust-building Predictable reveal timing, stable positioning, non-disruptive appearance
 * @accessibility Focus management, keyboard triggerable via focus, escape to dismiss, role="dialog" with aria-describedby
 * @semantic-meaning Rich preview: profile cards, link previews, contextual details that enhance understanding
 *
 * @usage-patterns
 * DO: Show supplementary information like user profiles, link previews, or contextual details
 * DO: Use appropriate delays to prevent accidental triggers (openDelay >= 500ms recommended)
 * DO: Keep content focused and scannable - users glance, not read
 * DO: Position intelligently to avoid viewport edges
 * NEVER: Essential information that should always be visible
 * NEVER: Interactive forms or multi-step workflows (use Popover instead)
 * NEVER: Time-sensitive content that disappears before user can read it
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCard.Trigger asChild>
 *     <a href="/user/john">@john</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <div className="flex gap-4">
 *       <Avatar src="/john.jpg" />
 *       <div>
 *         <h4>John Doe</h4>
 *         <p>Software Engineer</p>
 *       </div>
 *     </div>
 *   </HoverCard.Content>
 * </HoverCard>
 * ```
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createControlledHoverDelay } from '../../primitives/hover-delay';
import { getPortalContainer } from '../../primitives/portal';
import { mergeProps } from '../../primitives/slot';
import type { Align, Side } from '../../primitives/types';
import { createBehavior, type AriaAttrs, type PartIds } from '../../lib/contract';
import {
  DEFAULT_CLOSE_DELAY,
  DEFAULT_OPEN_DELAY,
  hoverCard,
  isOpen,
  positionHoverCardContent,
  type HoverCardActions,
  type HoverCardConfig,
  type HoverCardPart,
  type HoverCardState,
} from './hover-card.behavior';
import { hoverCardClasses, type HoverCardClassSet } from './hover-card.classes';

type HoverDelay = ReturnType<typeof createControlledHoverDelay>;

// ==================== Root context ====================

interface HoverCardContextValue {
  state: HoverCardState;
  config: HoverCardConfig;
  effectiveOpen: boolean;
  ids: PartIds<HoverCardPart>;
  aria: Partial<Record<HoverCardPart, AriaAttrs>>;
  classes: HoverCardClassSet;
  request: (action: keyof HoverCardActions) => boolean;
  hover: HoverDelay;
  triggerRef: React.RefObject<HTMLElement | null>;
  disableHoverableContent: boolean;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCardContext(component: string): HoverCardContextValue {
  const context = React.useContext(HoverCardContext);
  if (!context) {
    throw new Error(`${component} must be used within <HoverCard>`);
  }
  return context;
}

/** True when rendering inside an explicit <HoverCardPortal> (Radix-style
 *  composition); HoverCardContent then skips its automatic portal. */
const HoverCardPortalContext = React.createContext(false);

export interface HoverCardProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Delay before a hovered/focused trigger opens the card. Default 700ms. */
  openDelay?: number;
  /** Delay before an un-hovered trigger closes the card. Default 300ms. */
  closeDelay?: number;
  /** When true, the pointer cannot travel onto the content to hold it open. */
  disableHoverableContent?: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
}

export function HoverCardRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = DEFAULT_OPEN_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  disableHoverableContent = false,
  side,
  align,
  sideOffset,
}: HoverCardProps) {
  const config: HoverCardConfig = {
    open,
    defaultOpen,
    openDelay,
    closeDelay,
    disableHoverableContent,
    side,
    align,
    sideOffset,
  };

  const { memory, dispatch } = React.useMemo(() => createBehavior(hoverCard, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<HoverCardPart>;
    for (const part of Object.keys(hoverCard.parts) as HoverCardPart[])
      out[part] = `${uid}-${part}`;
    return out;
  }, [uid]);

  const triggerRef = React.useRef<HTMLElement | null>(null);

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof HoverCardActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // The hover-intent primitive: one instance per card, its callbacks flow
  // through the idempotent request so the score stays the single truth.
  const hover = React.useMemo<HoverDelay>(
    () =>
      createControlledHoverDelay({
        openDelay,
        closeDelay,
        onOpen: () => request('open'),
        onClose: () => request('close'),
      }),
    // request is stable; delays are read at open time by the primitive.
    [request, openDelay, closeDelay],
  );
  React.useEffect(() => () => hover.destroy(), [hover]);

  const aria = hoverCard.aria(state, config, ids);

  const contextValue: HoverCardContextValue = {
    state,
    config,
    effectiveOpen,
    ids,
    aria,
    classes: hoverCardClasses(config, state),
    request,
    hover,
    triggerRef,
    disableHoverableContent,
  };

  return <HoverCardContext.Provider value={contextValue}>{children}</HoverCardContext.Provider>;
}

// ==================== Trigger ====================

export interface HoverCardTriggerProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
}

export function HoverCardTrigger({
  asChild,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  children,
  ...props
}: HoverCardTriggerProps) {
  const { config, effectiveOpen, ids, aria, classes, hover, triggerRef, request } =
    useHoverCardContext('HoverCardTrigger');

  const setRef = React.useCallback(
    (element: HTMLElement | null) => {
      triggerRef.current = element;
    },
    [triggerRef],
  );

  const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseEnter?.(event);
    hover.onTriggerEnter();
  };
  const handleMouseLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(event);
    hover.onTriggerLeave();
  };
  const handleFocus = (event: React.FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event);
    hover.onTriggerFocus();
  };
  const handleBlur = (event: React.FocusEvent<HTMLAnchorElement>) => {
    onBlur?.(event);
    hover.onTriggerBlur();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // The score claims Escape. Dismiss through the score directly (see
    // bindHoverCard): a defaultOpen card with no prior hover has no pending state
    // in the hover primitive, so hover.close() alone would not close it. Dispatch
    // close, then reset the primitive so a re-hover reopens.
    if (
      hoverCard.keymap(keyInputOf(event), { open: effectiveOpen }, 'trigger', config) === 'close'
    ) {
      event.preventDefault();
      request('close');
      hover.close();
    }
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    ...aria.trigger,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(
      children,
      mergeProps({ ...partProps, ref: setRef }, childProps) as React.Attributes,
    );
  }

  return (
    <a
      ref={setRef as React.Ref<HTMLAnchorElement>}
      className={classy(classes.trigger, props.className)}
      {...partProps}
      {...props}
    >
      {children}
    </a>
  );
}

// ==================== Portal ====================

export interface HoverCardPortalProps {
  children: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
  forceMount?: boolean;
}

/** Radix-style explicit portal. When present, the nested HoverCardContent skips
 *  its own automatic portal and the consumer owns placement in the tree. */
export function HoverCardPortal({ children, container, forceMount }: HoverCardPortalProps) {
  const { effectiveOpen } = useHoverCardContext('HoverCardPortal');
  if (!(forceMount || effectiveOpen)) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <HoverCardPortalContext.Provider value={true}>{children}</HoverCardPortalContext.Provider>,
    container ?? document.body,
  );
}

// ==================== Content ====================

export interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  forceMount?: boolean;
  /** Portal target for the floating card; defaults to document.body. */
  container?: HTMLElement | null;
}

export function HoverCardContent({
  side,
  align,
  sideOffset,
  forceMount,
  container,
  className,
  onMouseEnter,
  onMouseLeave,
  children,
  ...props
}: HoverCardContentProps) {
  const { config, effectiveOpen, ids, aria, classes, triggerRef, hover, disableHoverableContent } =
    useHoverCardContext('HoverCardContent');
  const isInsidePortal = React.useContext(HoverCardPortalContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Positioning is a DOM side-effect: wire it here, but the placement decision
  // lives in the shared positionHoverCardContent composer over collision-detector.
  const placementConfig: HoverCardConfig = {
    ...config,
    side: side ?? config.side,
    align: align ?? config.align,
    sideOffset: sideOffset ?? config.sideOffset,
  };
  React.useEffect(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!effectiveOpen || !trigger || !content) return;
    const update = () => positionHoverCardContent(trigger, content, placementConfig);
    update();
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  });

  if (!(forceMount || effectiveOpen)) return null;
  if (typeof document === 'undefined') return null;

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    onMouseEnter?.(event);
    if (!disableHoverableContent) hover.onContentEnter();
  };
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(event);
    if (!disableHoverableContent) hover.onContentLeave();
  };

  const dataState = effectiveOpen ? 'open' : 'closed';
  const node = (
    <div
      data-part="content"
      id={ids.content}
      ref={contentRef}
      data-state={dataState}
      className={classy(classes.content, className)}
      {...aria.content}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );

  // Inside an explicit <HoverCardPortal> the consumer owns the portal.
  if (isInsidePortal) return node;

  const portalTarget = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );
  return portalTarget ? createPortal(node, portalTarget) : node;
}

// ==================== Display names + namespaced (shadcn) surface ====================

HoverCardRoot.displayName = 'HoverCard';
HoverCardTrigger.displayName = 'HoverCardTrigger';
HoverCardPortal.displayName = 'HoverCardPortal';
HoverCardContent.displayName = 'HoverCardContent';

/** shadcn drop-in surface: `HoverCard.Trigger` / `.Portal` / `.Content`, plus
 *  the named exports above for direct import. */
export const HoverCard = Object.assign(HoverCardRoot, {
  Trigger: HoverCardTrigger,
  Portal: HoverCardPortal,
  Content: HoverCardContent,
});
