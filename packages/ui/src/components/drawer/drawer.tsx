/**
 * Mobile-friendly drawer component with touch gestures and drag-to-dismiss
 *
 * @cognitive-load 4/10 - Lower cognitive load than dialogs; familiar mobile pattern
 * @attention-economics Partial attention capture: content slides up from edge, main context preserved
 * @trust-building Easy dismissal via drag gesture, overlay tap, or escape; natural mobile interaction
 * @accessibility Focus trap within drawer, escape key closes, proper ARIA dialog role, touch-friendly targets
 * @semantic-meaning Supplementary content: action sheets, bottom menus, quick selections on mobile
 *
 * @usage-patterns
 * DO: Use for mobile action sheets, quick selections, confirmations
 * DO: Use bottom side for mobile-first experiences
 * DO: Keep content minimal and action-focused
 * DO: Provide visible drag handle for touch affordance
 * DO: Support both touch drag and click dismissal
 * NEVER: Complex multi-step forms (use full page or Dialog)
 * NEVER: Primary navigation (use Sheet with side="left")
 * NEVER: Content requiring sustained attention
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Drawer>
 *   <DrawerTrigger>Open</DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Title</DrawerTitle>
 *       <DrawerDescription>Description</DrawerDescription>
 *     </DrawerHeader>
 *     Content here
 *     <DrawerFooter>
 *       <DrawerClose>Cancel</DrawerClose>
 *     </DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 *
 * // Or with namespace syntax
 * <Drawer>
 *   <Drawer.Trigger asChild>
 *     <Button>Open Drawer</Button>
 *   </Drawer.Trigger>
 *   <Drawer.Content>
 *     <Drawer.Header>
 *       <Drawer.Title>Actions</Drawer.Title>
 *       <Drawer.Description>Select an action</Drawer.Description>
 *     </Drawer.Header>
 *     <div>Drawer content here</div>
 *     <Drawer.Footer>
 *       <Drawer.Close asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </Drawer.Close>
 *     </Drawer.Footer>
 *   </Drawer.Content>
 * </Drawer>
 *
 * // Hide close button if needed
 * <DrawerContent showCloseButton={false}>...</DrawerContent>
 * ```
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { createBehavior, type AriaAttrs, type PartIds } from '../../lib/contract';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import { usePresence } from '../../hooks/use-presence';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  drawer,
  isOpen,
  startDrawerModalEffects,
  type DrawerActions,
  type DrawerConfig,
  type DrawerPart,
  type DrawerSide,
  type DrawerState,
} from './drawer.behavior';
import { drawerClasses, type DrawerClassSet } from './drawer.classes';

/** The oracle-compatible dismissal veto surface on DrawerContent. */
interface DismissVetoCallbacks {
  onPointerDownOutside?: ((event: Event) => void) | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
}

interface DrawerContextValue {
  state: DrawerState;
  ids: PartIds<DrawerPart>;
  aria: Partial<Record<DrawerPart, AriaAttrs>>;
  request: (action: keyof DrawerActions) => boolean;
  setPart: (part: DrawerPart) => (element: HTMLElement | null) => void;
  getPart: (part: string) => HTMLElement | null;
  config: DrawerConfig;
  side: DrawerSide;
  effectiveOpen: boolean;
  /** Presence, held at the PROVIDER. Every part gates on this, never on
   *  `effectiveOpen`: the portal is the content's ancestor, so a portal that
   *  unmounts on the raw flag takes the content's own exit with it. */
  present: boolean;
  presenceRef: (node: HTMLElement | null) => void;
  classes: DrawerClassSet;
  dismissVetoRef: React.RefObject<DismissVetoCallbacks | null>;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext(component: string): DrawerContextValue {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error(`${component} must be used within <Drawer>`);
  }
  return context;
}

/** True when rendering inside an explicit <DrawerPortal> (Radix-style
 *  composition); DrawerContent then skips its automatic portal + overlay. */
const DrawerPortalContext = React.createContext(false);

export interface DrawerProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  /** The edge the drawer slides in from. Defaults to "bottom" (touch). */
  side?: DrawerSide;
}

/**
 * An edge-anchored dialog: the modal-overlay archetype, positioned against a
 * screen edge (bottom by default -- a touch drawer that slides up) instead of
 * centered. The behavior is dialog's exactly -- disclosable open/close, a
 * focus-trap + scroll-lock + outside-dismiss trio while open+modal, Escape
 * closes and restores focus to the trigger -- so this decorator is dialog's
 * decorator with a `side` position variant and a decorative grab handle. Enter
 * only; the slide and drag-to-dismiss motion wait on Presence (wave 0-B).
 *
 * @cognitive-load 4/10 - decision 1, information 1, interaction 1, disruption 1,
 * learning 0. A single decision (act or dismiss) over content that arrives from
 * a familiar edge; the disruption point is real because a modal drawer seizes
 * the whole surface and locks the page behind it, but the slide-from-edge and
 * grab handle are universally learned mobile idioms that cost no new learning.
 * @attention-economics Full capture, spent deliberately: the overlay dims the
 * page and the trap holds focus, so the drawer owns attention until dismissed.
 * That is the correct price for an action sheet or a quick selection and the
 * wrong one for sustained work -- reach for a dialog or a full page then. The
 * edge anchoring preserves spatial context the page had, softening the seizure.
 * @trust-building Dismissal is cheap and plural: tap the dimmed overlay, press
 * Escape, or use the close button, and focus returns to the trigger exactly
 * where it left. Nothing is destroyed by closing, the panel reopens as it was,
 * and the visible handle signals the surface is transient, not a new location.
 * @accessibility content is role="dialog" with aria-modal while modal, named by
 * aria-labelledby/aria-describedby only when those parts render (no dangling
 * references), and the trigger carries aria-haspopup="dialog", aria-expanded and
 * aria-controls. Focus is trapped inside while open, Escape closes and restores
 * focus to the trigger, and the close button carries an aria-label. The grab
 * handle is decorative (aria-hidden) since its drag gesture is not yet wired.
 */
export function Drawer({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  side = 'bottom',
}: DrawerProps) {
  const config: DrawerConfig = { open, defaultOpen, modal, side };
  const dismissVetoRef = React.useRef<DismissVetoCallbacks | null>(null);

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(drawer, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();

  // Content portals to document.body with a unique id, so getPart resolves by
  // id -- no ref registry. Optional parts still need a mount signal (setPart)
  // purely so an omitted description projects no dangling aria-describedby.
  const [presentParts, setPresentParts] = React.useState<ReadonlySet<string>>(new Set());
  const partCallbacks = React.useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());
  const setPart = React.useCallback((part: DrawerPart) => {
    let callback = partCallbacks.current.get(part);
    if (!callback) {
      callback = (element: HTMLElement | null) =>
        setPresentParts((previous) => {
          const present = element !== null;
          if (previous.has(part) === present) return previous;
          const next = new Set(previous);
          if (present) next.add(part);
          else next.delete(part);
          return next;
        });
      partCallbacks.current.set(part, callback);
    }
    return callback;
  }, []);
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      typeof document === 'undefined' ? null : document.getElementById(`${uid}-${part}`),
    [uid],
  );

  // title and description are the UNGUARDED cross-ref sources (labelledby/
  // describedby have no `open` guard, unlike aria-controls), so an absent one
  // must resolve to an empty id. Every other part keeps a stable id -- content
  // especially, since the focus-trap effect finds it by id.
  const ids = React.useMemo(() => {
    const out = {} as PartIds<DrawerPart>;
    for (const part of Object.keys(drawer.parts) as DrawerPart[]) {
      const crossRefSource = part === 'title' || part === 'description';
      out[part] = crossRefSource && !presentParts.has(part) ? '' : `${uid}-${part}`;
    }
    return out;
  }, [uid, presentParts]);

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof DrawerActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // The modal overlay trio, composed directly on the open+modal transition.
  // Level-triggered via the dependency array; the cleanup tears the trio down
  // (focus restore rides the trap teardown).
  React.useEffect(() => {
    if (!effectiveOpen || !modal) return;
    const content = getPart('content');
    if (!content) return;
    return startDrawerModalEffects({
      content,
      getTrigger: () => getPart('trigger'),
      // Outside-pointerdown dismissals offer the consumer veto first (oracle
      // protocol: callbacks run, close proceeds unless defaultPrevented).
      onDismiss: (event) => {
        const veto = dismissVetoRef.current;
        if (veto) {
          veto.onPointerDownOutside?.(event);
          veto.onInteractOutside?.(event);
          if (event.defaultPrevented) return;
        }
        request('close');
      },
    });
  }, [effectiveOpen, modal, getPart, request]);

  const aria = drawer.aria(state, config, ids);

  // Presence, at the provider. `data-state` is NOT set from here --
  // disclosable already contributes it from the same value that feeds
  // presence. One attribute, one writer.
  const { present, ref: presenceRef } = usePresence(effectiveOpen);

  const contextValue: DrawerContextValue = {
    state,
    ids,
    aria,
    request,
    setPart,
    getPart,
    config,
    side,
    effectiveOpen,
    present,
    presenceRef,
    classes: drawerClasses(config, state),
    dismissVetoRef,
  };

  return <DrawerContext.Provider value={contextValue}>{children}</DrawerContext.Provider>;
}

export interface DrawerPortalProps {
  children: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function DrawerPortal({ children, container, forceMount }: DrawerPortalProps) {
  const { present } = useDrawerContext('DrawerPortal');
  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <DrawerPortalContext.Provider value={true}>{children}</DrawerPortalContext.Provider>,
    container ?? document.body,
  );
}

export interface DrawerOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean | undefined;
}

export function DrawerOverlay({ forceMount, className, ...props }: DrawerOverlayProps) {
  const { effectiveOpen, present, ids, aria, classes, setPart } = useDrawerContext('DrawerOverlay');
  if (!(forceMount || present)) return null;
  return (
    <div
      data-part="overlay"
      id={ids.overlay || undefined}
      ref={setPart('overlay')}
      // A force-mounted closed overlay must not cover the page.
      // `hidden` is `display: none`, which blocks animation outright, so an
      // overlay that is closed and STILL PRESENT is mid-exit and has to stay
      // paintable for its own fade to run.
      hidden={effectiveOpen || present ? undefined : true}
      className={classy(classes.overlay, className)}
      {...aria.overlay}
      {...props}
    />
  );
}

export interface DrawerTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DrawerTrigger({ asChild, onClick, children, ...props }: DrawerTriggerProps) {
  const { effectiveOpen, ids, aria, request, setPart } = useDrawerContext('DrawerTrigger');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request(effectiveOpen ? 'close' : 'open');
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    ref: setPart('trigger'),
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

export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Defaults to true, except inside an explicit <DrawerPortal>. */
  showCloseButton?: boolean;
  forceMount?: boolean;
  /** Portal target for the automatic portal; defaults to document.body. */
  container?: HTMLElement | null;
  /** Consumer veto: called before Escape closes; preventDefault to keep open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Consumer veto: called before an outside pointerdown closes. */
  onPointerDownOutside?: (event: Event) => void;
  /** Consumer veto: called alongside onPointerDownOutside (oracle surface). */
  onInteractOutside?: (event: Event) => void;
}

export function DrawerContent({
  showCloseButton,
  forceMount,
  container,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  className,
  children,
  onKeyDown,
  ...props
}: DrawerContentProps) {
  const {
    config,
    state,
    present,
    presenceRef,
    ids,
    aria,
    classes,
    request,
    setPart,
    dismissVetoRef,
  } = useDrawerContext('DrawerContent');
  const isInsidePortal = React.useContext(DrawerPortalContext);
  // Presence (wave 0-B): keep the content mounted through its exit animation.
  // With no exit animation it releases immediately, so behavior is unchanged.

  React.useEffect(() => {
    dismissVetoRef.current = { onPointerDownOutside, onInteractOutside };
    return () => {
      dismissVetoRef.current = null;
    };
  });

  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;

  const modal = config.modal !== false;
  const shouldShowCloseButton = showCloseButton ?? !isInsidePortal;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = drawer.keymap(keyInputOf(event), state, 'content', config);
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
      tabIndex={-1}
      // forceMount keeps the node for animation tooling; a closed modal must
      // still be invisible to AT, untabbable, and must not block the page --
      // hidden covers all three.
      hidden={present ? undefined : true}
      className={classy(classes.content, className)}
      {...aria.content}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {/* Decorative grab affordance; the drag-to-dismiss gesture is deferred. */}
      <div className={classes.handle} aria-hidden="true" />
      {children}
      {shouldShowCloseButton ? (
        <button
          type="button"
          data-part="close"
          id={ids.close || undefined}
          ref={setPart('close')}
          className={classes.close}
          {...aria.close}
          onClick={() => request('close')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={classes.closeIcon}
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  // Inside an explicit <DrawerPortal>: the consumer owns portal + overlay.
  if (isInsidePortal) return content;

  // shadcn-style: Content brings its own portal and overlay.
  return createPortal(
    <>
      {modal ? <DrawerOverlay forceMount={forceMount} /> : null}
      {content}
    </>,
    container ?? document.body,
  );
}

export type DrawerHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  const { classes } = useDrawerContext('DrawerHeader');
  return <div className={classy(classes.header, className)} {...props} />;
}

export type DrawerFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  const { classes } = useDrawerContext('DrawerFooter');
  return <div className={classy(classes.footer, className)} {...props} />;
}

export type DrawerTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  const { ids, classes, setPart } = useDrawerContext('DrawerTitle');
  return (
    <h2
      data-part="title"
      id={ids.title || undefined}
      ref={setPart('title')}
      className={classy(classes.title, className)}
      {...props}
    />
  );
}

export type DrawerDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  const { ids, classes, setPart } = useDrawerContext('DrawerDescription');
  return (
    <p
      data-part="description"
      id={ids.description || undefined}
      ref={setPart('description')}
      className={classy(classes.description, className)}
      {...props}
    />
  );
}

export interface DrawerCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DrawerClose({ asChild, onClick, children, ...props }: DrawerCloseProps) {
  const { request } = useDrawerContext('DrawerClose');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request('close');
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(
      children,
      mergeProps({ onClick: handleClick }, childProps) as React.Attributes,
    );
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
