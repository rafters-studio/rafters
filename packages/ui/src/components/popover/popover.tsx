/**
 * Popover -- an anchored, non-modal floating panel.
 *
 * The React performance of the popover score. The score AND the DOM-native
 * binding (bindPopover) live in popover.behavior.ts, shared with the WC and
 * Astro performances; this file only adapts that score to React (reading
 * projections via useMemory) and paints on popover.classes. Positioning and
 * focus-first are framework-affordances driven by the same helpers the bind
 * uses. Portal is included automatically -- no need to wrap content in
 * Popover.Portal.
 *
 * @cognitive-load 4/10 - Contextual content requiring focus but not blocking workflow
 * @attention-economics Partial attention: appears on trigger, dismisses on outside click or escape
 * @trust-building Predictable positioning, easy dismissal, non-blocking interaction
 * @accessibility Focus management, escape key dismissal, outside click closes, screen reader announcements
 * @semantic-meaning Contextual enhancement: additional info, controls, or options related to trigger
 *
 * @usage-patterns
 * DO: Use for contextual actions or information related to trigger element
 * DO: Position intelligently to avoid viewport edges
 * DO: Allow dismissal via escape key and outside click
 * DO: Keep content focused and relevant to trigger
 * NEVER: Critical information, primary navigation, complex multi-step forms
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal is included automatically
 * <Popover>
 *   <Popover.Trigger>Open</Popover.Trigger>
 *   <Popover.Content>Popover content here</Popover.Content>
 * </Popover>
 * ```
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { createBehavior, type AriaAttrs, type PartIds } from '../../lib/contract';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import { usePresence } from '../../hooks/use-presence';
import classy from '../../primitives/classy';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { mergeProps } from '../../primitives/slot';
import type { Align, Side } from '../../primitives/types';
import {
  focusFirst,
  isOpen,
  popover,
  positionPopover,
  type PopoverActions,
  type PopoverConfig,
  type PopoverPart,
  type PopoverPositionOptions,
  type PopoverState,
} from './popover.behavior';
import { popoverClasses, type PopoverClassSet } from './popover.classes';

/** The oracle-compatible dismissal veto surface on PopoverContent. */
interface DismissVetoCallbacks {
  onPointerDownOutside?: ((event: Event) => void) | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
}

interface PopoverContextValue {
  state: PopoverState;
  ids: PartIds<PopoverPart>;
  aria: Partial<Record<PopoverPart, AriaAttrs>>;
  request: (action: keyof PopoverActions) => boolean;
  getPart: (part: string) => HTMLElement | null;
  config: PopoverConfig;
  effectiveOpen: boolean;
  classes: PopoverClassSet;
  dismissVetoRef: React.RefObject<DismissVetoCallbacks | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string): PopoverContextValue {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error(`${component} must be used within <Popover>`);
  }
  return context;
}

/** True when rendering inside an explicit <PopoverPortal> (Radix-style
 *  composition); PopoverContent then skips its automatic portal. */
const PopoverPortalContext = React.createContext(false);

export interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, defaultOpen = false, onOpenChange }: PopoverProps) {
  const config: PopoverConfig = { open, defaultOpen };
  const dismissVetoRef = React.useRef<DismissVetoCallbacks | null>(null);

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(popover, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();

  // Content portals to document.body with a unique id, so getPart resolves by
  // id -- no ref registry. Popover projects no cross-ref aria, so every part
  // keeps a stable id (aria-controls is already open-guarded in disclosable).
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      typeof document === 'undefined' ? null : document.getElementById(`${uid}-${part}`),
    [uid],
  );

  const ids = React.useMemo(() => {
    const out = {} as PartIds<PopoverPart>;
    for (const part of Object.keys(popover.parts) as PopoverPart[]) out[part] = `${uid}-${part}`;
    return out;
  }, [uid]);

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof PopoverActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // The light-dismiss, composed directly on the open edge (replacing the
  // effects runner): dismiss on a pointerdown outside the content, sparing the
  // trigger and anchor. Level-triggered via the dependency array; the cleanup
  // tears the listener down on close/unmount. Runs at the parent level after
  // PopoverContent has mounted its portaled content, so getPart resolves it.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (!content) return;
    return onPointerDownOutside(content, (event) => {
      const target = event.target as Node;
      if (getPart('trigger')?.contains(target)) return;
      if (getPart('anchor')?.contains(target)) return;
      // Outside-pointerdown dismissals offer the consumer veto first (oracle
      // protocol: callbacks run, close proceeds unless defaultPrevented).
      const veto = dismissVetoRef.current;
      if (veto) {
        veto.onPointerDownOutside?.(event);
        veto.onInteractOutside?.(event);
        if (event.defaultPrevented) return;
      }
      request('close');
    });
  }, [effectiveOpen, getPart, request]);

  const aria = popover.aria(state, config, ids);

  const contextValue: PopoverContextValue = {
    state,
    ids,
    aria,
    request,
    getPart,
    config,
    effectiveOpen,
    classes: popoverClasses(config, state),
    dismissVetoRef,
  };

  return <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>;
}

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function PopoverTrigger({ asChild, onClick, children, ...props }: PopoverTriggerProps) {
  const { effectiveOpen, ids, aria, request } = usePopoverContext('PopoverTrigger');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request(effectiveOpen ? 'close' : 'open');
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
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

export interface PopoverAnchorProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function PopoverAnchor({ asChild, children, ...props }: PopoverAnchorProps) {
  const { ids } = usePopoverContext('PopoverAnchor');

  const partProps = {
    'data-part': 'anchor',
    id: ids.anchor,
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

export interface PopoverPortalProps {
  children: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function PopoverPortal({ children, container, forceMount }: PopoverPortalProps) {
  const { effectiveOpen } = usePopoverContext('PopoverPortal');
  if (!(forceMount || effectiveOpen)) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <PopoverPortalContext.Provider value={true}>{children}</PopoverPortalContext.Provider>,
    container ?? document.body,
  );
}

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  /** Portal target for the automatic portal; defaults to document.body. */
  container?: HTMLElement | null;
  /** Consumer veto: called before Escape closes; preventDefault to keep open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Consumer veto: called before an outside pointerdown closes. */
  onPointerDownOutside?: (event: Event) => void;
  /** Consumer veto: called alongside onPointerDownOutside (oracle surface). */
  onInteractOutside?: (event: Event) => void;
}

export function PopoverContent({
  forceMount,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  container,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  className,
  children,
  onKeyDown,
  ...props
}: PopoverContentProps) {
  const { config, state, effectiveOpen, ids, aria, classes, request, getPart, dismissVetoRef } =
    usePopoverContext('PopoverContent');
  const isInsidePortal = React.useContext(PopoverPortalContext);
  // Presence: keep the content mounted through its exit animation. `data-state`
  // is NOT set here -- disclosable already contributes it through `aria.content`,
  // from the same effective-open value presence is given. One writer per
  // attribute; see the ownership note in use-presence.ts.
  const { present, ref: presenceRef } = usePresence(effectiveOpen);

  React.useEffect(() => {
    dismissVetoRef.current = { onPointerDownOutside, onInteractOutside };
    return () => {
      dismissVetoRef.current = null;
    };
  });

  // Framework-affordances: position + focus on open, reposition while open.
  const positionOptions = React.useMemo<PopoverPositionOptions>(
    () => ({ side, align, sideOffset, alignOffset }),
    [side, align, sideOffset, alignOffset],
  );
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    const anchor = getPart('anchor') ?? getPart('trigger');
    positionPopover(anchor, content, positionOptions);
    focusFirst(content);
    const reposition = () => positionPopover(anchor, content, positionOptions);
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', reposition);
    };
  }, [effectiveOpen, positionOptions, getPart]);

  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = popover.keymap(keyInputOf(event), state, 'content', config);
    if (!action) return;
    if (action === 'close') {
      onEscapeKeyDown?.(event.nativeEvent);
      if (event.nativeEvent.defaultPrevented) return;
    }
    event.preventDefault();
    request(action);
  };

  const content = (
    <div
      data-part="content"
      id={ids.content || undefined}
      ref={presenceRef}
      // Inert, not hidden, for the exit window (the ratified ruling). The node
      // keeps rendering so the exit keyframe paints, while inert takes the
      // closing panel out of the a11y tree, the tab order, and hit-testing. It
      // lifts the moment the popover reopens.
      inert={effectiveOpen ? undefined : true}
      tabIndex={-1}
      // The REQUESTED placement, published for consumer styling and for the
      // positioning affordance to reconcile against at runtime. It no longer
      // seeds an enter direction: presence dropped slide-on-enter along with the
      // tailwindcss-animate vocabulary (see popover.classes.ts).
      data-side={side}
      data-align={align}
      className={classy(classes.content, className)}
      hidden={present ? undefined : true}
      {...aria.content}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );

  // Inside an explicit <PopoverPortal>: the consumer owns the portal.
  if (isInsidePortal) return content;

  // shadcn-style: Content brings its own portal.
  return createPortal(content, container ?? document.body);
}

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function PopoverClose({ asChild, onClick, children, ...props }: PopoverCloseProps) {
  const { request } = usePopoverContext('PopoverClose');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request('close');
  };

  const partProps = {
    'data-part': 'close',
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

Popover.displayName = 'Popover';
PopoverTrigger.displayName = 'PopoverTrigger';
PopoverAnchor.displayName = 'PopoverAnchor';
PopoverPortal.displayName = 'PopoverPortal';
PopoverContent.displayName = 'PopoverContent';
PopoverClose.displayName = 'PopoverClose';

// Namespaced export (shadcn style).
Popover.Trigger = PopoverTrigger;
Popover.Anchor = PopoverAnchor;
Popover.Portal = PopoverPortal;
Popover.Content = PopoverContent;
Popover.Close = PopoverClose;

// Re-export root as PopoverRoot alias for shadcn compatibility.
export { Popover as PopoverRoot };
