/**
 * Contextual tooltip: a hover/focus hint that shows a label after a delay and
 * is never itself focusable.
 *
 * @cognitive-load 2/10 - Contextual help without interrupting user workflow
 * @attention-economics Non-intrusive assistance: smart delays prevent accidental triggers while ensuring help availability
 * @trust-building Reliable contextual guidance that builds user confidence through progressive disclosure
 * @accessibility role=tooltip content, aria-describedby link from the trigger, keyboard-triggerable via focus, Escape dismiss; the tip itself never takes focus
 *
 * The React performance decorates the tooltip score (tooltip.behavior.ts) with
 * the view (tooltip.classes.ts) and the framework wiring only: hover-intent
 * timing via the shared hover-delay primitive, and anchored positioning via the
 * shared positionTooltipContent composer. Every decision -- reducers, aria,
 * keymap -- stays in the score.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger asChild>
 *     <button type="button">Hover me</button>
 *   </TooltipTrigger>
 *   <TooltipContent>Helpful tooltip text</TooltipContent>
 * </Tooltip>
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
  isOpen,
  positionTooltipContent,
  tooltip,
  tooltipOpenDelay,
  tooltipSkipDelay,
  type TooltipActions,
  type TooltipConfig,
  type TooltipPart,
  type TooltipState,
} from './tooltip.behavior';
import { tooltipClasses, type TooltipClassSet } from './tooltip.classes';

type HoverDelay = ReturnType<typeof createControlledHoverDelay>;

// ==================== Provider (delay defaults) ====================

/**
 * The delays are OPTIONAL here, and deliberately so: an unset delay means "read
 * the token", and the token can only be read once there is a document. Baking a
 * number into the context default at module scope would be a second source for
 * a value the accessor already owns -- so absence travels, and the resolution
 * happens where the DOM exists.
 */
interface TooltipProviderContextValue {
  delayDuration: number | undefined;
  skipDelayDuration: number | undefined;
  disableHoverableContent: boolean;
}

const TooltipProviderContext = React.createContext<TooltipProviderContextValue>({
  delayDuration: undefined,
  skipDelayDuration: undefined,
  disableHoverableContent: false,
});

export interface TooltipProviderProps {
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  children: React.ReactNode;
}

export function TooltipProvider({
  delayDuration,
  skipDelayDuration,
  disableHoverableContent = false,
  children,
}: TooltipProviderProps) {
  const value = React.useMemo(
    () => ({ delayDuration, skipDelayDuration, disableHoverableContent }),
    [delayDuration, skipDelayDuration, disableHoverableContent],
  );
  return (
    <TooltipProviderContext.Provider value={value}>{children}</TooltipProviderContext.Provider>
  );
}

// ==================== Root context ====================

interface TooltipContextValue {
  state: TooltipState;
  config: TooltipConfig;
  effectiveOpen: boolean;
  ids: PartIds<TooltipPart>;
  aria: Partial<Record<TooltipPart, AriaAttrs>>;
  classes: TooltipClassSet;
  request: (action: keyof TooltipActions) => boolean;
  hover: HoverDelay;
  triggerRef: React.RefObject<HTMLElement | null>;
  disableHoverableContent: boolean;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tooltip>`);
  }
  return context;
}

/** True when rendering inside an explicit <TooltipPortal> (Radix-style
 *  composition); TooltipContent then skips its automatic portal. */
const TooltipPortalContext = React.createContext(false);

export interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  side?: Side;
  align?: Align;
  sideOffset?: number;
}

export function TooltipRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
  side,
  align,
  sideOffset,
}: TooltipProps) {
  const provider = React.useContext(TooltipProviderContext);
  const config: TooltipConfig = {
    open,
    defaultOpen,
    delayDuration: delayDuration ?? provider.delayDuration,
    skipDelayDuration: provider.skipDelayDuration,
    disableHoverableContent: provider.disableHoverableContent,
    side,
    align,
    sideOffset,
  };

  const { memory, dispatch } = React.useMemo(() => createBehavior(tooltip, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<TooltipPart>;
    for (const part of Object.keys(tooltip.parts) as TooltipPart[]) out[part] = `${uid}-${part}`;
    return out;
  }, [uid]);

  const triggerRef = React.useRef<HTMLElement | null>(null);

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof TooltipActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // The hover-intent primitive: one instance per tooltip, its callbacks flow
  // through the idempotent request so the score stays the single truth.
  const hover = React.useMemo<HoverDelay>(
    () =>
      createControlledHoverDelay({
        openDelay: config.delayDuration ?? tooltipOpenDelay(triggerRef.current),
        closeDelay: config.skipDelayDuration ?? tooltipSkipDelay(triggerRef.current),
        onOpen: () => request('open'),
        onClose: () => request('close'),
      }),
    // request is stable; delays are read at open time by the primitive.
    [request, config.delayDuration, config.skipDelayDuration],
  );
  React.useEffect(() => () => hover.destroy(), [hover]);

  const aria = tooltip.aria(state, config, ids);

  const contextValue: TooltipContextValue = {
    state,
    config,
    effectiveOpen,
    ids,
    aria,
    classes: tooltipClasses(config, state),
    request,
    hover,
    triggerRef,
    disableHoverableContent: config.disableHoverableContent ?? false,
  };

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
}

// ==================== Trigger ====================

export interface TooltipTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function TooltipTrigger({
  asChild,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  children,
  ...props
}: TooltipTriggerProps) {
  const { config, effectiveOpen, ids, aria, classes, hover, triggerRef, request } =
    useTooltipContext('TooltipTrigger');

  const setRef = React.useCallback(
    (element: HTMLElement | null) => {
      triggerRef.current = element;
    },
    [triggerRef],
  );

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(event);
    hover.onTriggerEnter();
  };
  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(event);
    hover.onTriggerLeave();
  };
  const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    hover.onTriggerFocus();
  };
  const handleBlur = (event: React.FocusEvent<HTMLButtonElement>) => {
    onBlur?.(event);
    hover.onTriggerBlur();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // The score claims Escape. Dismiss through the score directly (see
    // bindTooltip): a defaultOpen tip with no prior hover has no pending state in
    // the hover primitive, so hover.close() alone would not close it. Dispatch
    // close, then reset the primitive so a re-hover reopens.
    if (tooltip.keymap(keyInputOf(event), { open: effectiveOpen }, 'trigger', config) === 'close') {
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
    <button
      type="button"
      ref={setRef as React.Ref<HTMLButtonElement>}
      className={classy(classes.trigger, props.className)}
      {...partProps}
      {...props}
    >
      {children}
    </button>
  );
}

// ==================== Portal ====================

export interface TooltipPortalProps {
  children: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
  forceMount?: boolean;
}

/** Radix-style explicit portal (a rafters extension over the shadcn base). When
 *  present, the nested TooltipContent skips its own automatic portal and the
 *  consumer owns placement in the tree. */
export function TooltipPortal({ children, container, forceMount }: TooltipPortalProps) {
  const { effectiveOpen } = useTooltipContext('TooltipPortal');
  if (!(forceMount || effectiveOpen)) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <TooltipPortalContext.Provider value={true}>{children}</TooltipPortalContext.Provider>,
    container ?? document.body,
  );
}

// ==================== Content ====================

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  forceMount?: boolean;
  /** Portal target for the floating tip; defaults to document.body. */
  container?: HTMLElement | null;
}

export function TooltipContent({
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
}: TooltipContentProps) {
  const { config, effectiveOpen, ids, aria, classes, triggerRef, hover, disableHoverableContent } =
    useTooltipContext('TooltipContent');
  const isInsidePortal = React.useContext(TooltipPortalContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Positioning is a DOM side-effect: wire it here, but the placement decision
  // lives in the shared positionTooltipContent composer over collision-detector.
  const placementConfig: TooltipConfig = {
    ...config,
    side: side ?? config.side,
    align: align ?? config.align,
    sideOffset: sideOffset ?? config.sideOffset,
  };
  React.useEffect(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!effectiveOpen || !trigger || !content) return;
    const update = () => positionTooltipContent(trigger, content, placementConfig);
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

  // Inside an explicit <TooltipPortal> the consumer owns the portal.
  if (isInsidePortal) return node;

  const portalTarget = getPortalContainer(
    container !== undefined ? { container, enabled: true } : { enabled: true },
  );
  return portalTarget ? createPortal(node, portalTarget) : node;
}

// ==================== Display names + namespaced (shadcn) surface ====================

TooltipProvider.displayName = 'TooltipProvider';
TooltipRoot.displayName = 'Tooltip';
TooltipTrigger.displayName = 'TooltipTrigger';
TooltipPortal.displayName = 'TooltipPortal';
TooltipContent.displayName = 'TooltipContent';

/** shadcn drop-in surface: `Tooltip.Provider` / `.Trigger` / `.Portal` /
 *  `.Content`, plus the named exports above for direct import. */
export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Content: TooltipContent,
});
