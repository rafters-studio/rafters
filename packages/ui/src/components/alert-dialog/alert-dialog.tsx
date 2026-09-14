/**
 * Alert dialog component for destructive or important confirmation actions
 *
 * @cognitive-load 7/10 - Requires immediate decision, interrupts workflow with high stakes
 * @attention-economics Full attention capture: blocks all other interactions until resolved
 * @trust-building Focus defaults to Cancel (safer choice), clear action consequences, escape allows safe exit
 * @accessibility role="alertdialog" for screen readers, focus trap, keyboard dismissal via Escape
 * @semantic-meaning Confirmation patterns: Action=proceed with consequence, Cancel=safe exit without changes
 *
 * @usage-patterns
 * DO: Use for destructive actions (delete, remove, discard)
 * DO: Use for irreversible operations requiring explicit confirmation
 * DO: Make consequences clear in description text
 * DO: Default focus to Cancel for safety
 * NEVER: Routine confirmations, non-destructive actions, information-only dialogs
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal and Overlay are included automatically, no close X button
 * <AlertDialog>
 *   <AlertDialogTrigger>Delete</AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 *       <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Cancel</AlertDialogCancel>
 *       <AlertDialogAction>Delete</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 *
 * // Or with namespace syntax
 * <AlertDialog>
 *   <AlertDialog.Trigger asChild>
 *     <Button variant="destructive">Delete</Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Header>
 *       <AlertDialog.Title>Are you sure?</AlertDialog.Title>
 *       <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
 *     </AlertDialog.Header>
 *     <AlertDialog.Footer>
 *       <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
 *       <AlertDialog.Action>Delete</AlertDialog.Action>
 *     </AlertDialog.Footer>
 *   </AlertDialog.Content>
 * </AlertDialog>
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
  alertDialog,
  isOpen,
  startAlertDialogModalEffects,
  type AlertDialogActions,
  type AlertDialogConfig,
  type AlertDialogPart,
  type AlertDialogState,
} from './alert-dialog.behavior';
import { alertDialogClasses, type AlertDialogClassSet } from './alert-dialog.classes';

interface AlertDialogContextValue {
  state: AlertDialogState;
  ids: PartIds<AlertDialogPart>;
  aria: Partial<Record<AlertDialogPart, AriaAttrs>>;
  request: (action: keyof AlertDialogActions) => boolean;
  setPart: (part: AlertDialogPart) => (element: HTMLElement | null) => void;
  getPart: (part: string) => HTMLElement | null;
  config: AlertDialogConfig;
  effectiveOpen: boolean;
  /** Presence, held at the PROVIDER. Every part gates on this, never on
   *  `effectiveOpen`: the portal is the content's ancestor, so a portal that
   *  unmounts on the raw flag takes the content's own exit with it. */
  present: boolean;
  presenceRef: (node: HTMLElement | null) => void;
  classes: AlertDialogClassSet;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext(component: string): AlertDialogContextValue {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error(`${component} must be used within <AlertDialog>`);
  }
  return context;
}

/** True when rendering inside an explicit <AlertDialogPortal> (Radix-style
 *  composition); AlertDialogContent then skips its automatic portal + overlay. */
const AlertDialogPortalContext = React.createContext(false);

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: AlertDialogProps) {
  const config: AlertDialogConfig = { open, defaultOpen };

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(alertDialog, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const uid = React.useId();

  // Content portals to document.body with a unique id, so getPart resolves by
  // id -- no ref registry. Optional parts still need a mount signal (setPart)
  // purely so an omitted description projects no dangling aria-describedby.
  const [presentParts, setPresentParts] = React.useState<ReadonlySet<string>>(new Set());
  const partCallbacks = React.useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());
  const setPart = React.useCallback((part: AlertDialogPart) => {
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
    const out = {} as PartIds<AlertDialogPart>;
    for (const part of Object.keys(alertDialog.parts) as AlertDialogPart[]) {
      const crossRefSource = part === 'title' || part === 'description';
      out[part] = crossRefSource && !presentParts.has(part) ? '' : `${uid}-${part}`;
    }
    return out;
  }, [uid, presentParts]);

  const latest = React.useRef({ config, onOpenChange });
  latest.current = { config, onOpenChange };
  const request = React.useCallback(
    (action: keyof AlertDialogActions): boolean => {
      const { config: cfg, onOpenChange: cb } = latest.current;
      if (!dispatch(action, cfg)) return false;
      cb?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  const aria = alertDialog.aria(state, config, ids);

  // Presence, at the provider. `data-state` is NOT set from here --
  // disclosable already contributes it from the same value that feeds
  // presence. One attribute, one writer.
  const { present, ref: presenceRef } = usePresence(effectiveOpen);

  const contextValue: AlertDialogContextValue = {
    state,
    ids,
    aria,
    request,
    setPart,
    getPart,
    config,
    effectiveOpen,
    present,
    presenceRef,
    classes: alertDialogClasses(config, state),
  };

  return <AlertDialogContext.Provider value={contextValue}>{children}</AlertDialogContext.Provider>;
}

export interface AlertDialogPortalProps {
  children: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export function AlertDialogPortal({ children, container, forceMount }: AlertDialogPortalProps) {
  const { present } = useAlertDialogContext('AlertDialogPortal');
  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AlertDialogPortalContext.Provider value={true}>{children}</AlertDialogPortalContext.Provider>,
    container ?? document.body,
  );
}

export interface AlertDialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean | undefined;
}

export function AlertDialogOverlay({ forceMount, className, ...props }: AlertDialogOverlayProps) {
  const { effectiveOpen, present, ids, aria, classes, setPart } =
    useAlertDialogContext('AlertDialogOverlay');
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

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  /** Portal target for the automatic portal; defaults to document.body. */
  container?: HTMLElement | null;
  /** Consumer veto: called before Escape closes; preventDefault to keep open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

export function AlertDialogContent({
  forceMount,
  container,
  onEscapeKeyDown,
  className,
  children,
  onKeyDown,
  ...props
}: AlertDialogContentProps) {
  const {
    config,
    state,
    effectiveOpen,
    present,
    presenceRef,
    ids,
    aria,
    classes,
    request,
    getPart,
  } = useAlertDialogContext('AlertDialogContent');
  const isInsidePortal = React.useContext(AlertDialogPortalContext);
  // Presence (wave 0-B): keep the content mounted through its exit animation.
  // With no exit animation it releases immediately, so behavior is unchanged.

  // The modal overlay pair, composed directly on the open transition (replacing
  // the effects runner). Level-triggered via the dependency array; the cleanup
  // tears the pair down (focus restore rides the trap teardown). Always modal.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const content = getPart('content');
    if (!content) return;
    return startAlertDialogModalEffects({
      content,
      getCancel: () => getPart('cancel'),
    });
  }, [effectiveOpen, getPart]);

  if (!(forceMount || present)) return null;
  if (typeof document === 'undefined') return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = alertDialog.keymap(keyInputOf(event), state, 'content', config);
    if (!action) return;
    if (action === 'close') {
      onEscapeKeyDown?.(event.nativeEvent);
      if (event.nativeEvent.defaultPrevented) return;
    }
    event.preventDefault();
    request(action);
  };

  const content = (
    // forceMount keeps the nodes for animation tooling; a closed modal must
    // still be invisible to AT, untabbable, and must not block the page --
    // hidden on the fixed-position container covers all three.
    <div className={classes.container} hidden={present ? undefined : true}>
      <div
        data-part="content"
        id={ids.content || undefined}
        ref={presenceRef}
        tabIndex={-1}
        className={classy(classes.content, className)}
        {...aria.content}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </div>
  );

  // Inside an explicit <AlertDialogPortal>: the consumer owns portal + overlay.
  if (isInsidePortal) return content;

  // shadcn-style: Content brings its own portal and overlay (always modal).
  return createPortal(
    <>
      <AlertDialogOverlay forceMount={forceMount} />
      {content}
    </>,
    container ?? document.body,
  );
}

export type AlertDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  const { classes } = useAlertDialogContext('AlertDialogHeader');
  return <div className={classy(classes.header, className)} {...props} />;
}

export type AlertDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  const { classes } = useAlertDialogContext('AlertDialogFooter');
  return <div className={classy(classes.footer, className)} {...props} />;
}

export type AlertDialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  const { ids, classes, setPart } = useAlertDialogContext('AlertDialogTitle');
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

export type AlertDialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  const { ids, classes, setPart } = useAlertDialogContext('AlertDialogDescription');
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

export interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogAction({
  asChild,
  onClick,
  className,
  children,
  ...props
}: AlertDialogActionProps) {
  const { ids, classes, request, setPart } = useAlertDialogContext('AlertDialogAction');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request('close');
  };

  const partProps = {
    'data-part': 'action',
    id: ids.action,
    ref: setPart('action'),
    className: classy(classes.action, className),
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

export interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogCancel({
  asChild,
  onClick,
  className,
  children,
  ...props
}: AlertDialogCancelProps) {
  const { ids, classes, request, setPart } = useAlertDialogContext('AlertDialogCancel');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    request('close');
  };

  const partProps = {
    'data-part': 'cancel',
    id: ids.cancel,
    ref: setPart('cancel'),
    className: classy(classes.cancel, className),
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

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogTrigger({
  asChild,
  onClick,
  children,
  ...props
}: AlertDialogTriggerProps) {
  const { effectiveOpen, ids, aria, request, setPart } =
    useAlertDialogContext('AlertDialogTrigger');

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
