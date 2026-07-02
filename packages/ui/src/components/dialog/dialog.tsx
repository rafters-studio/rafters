import * as React from 'react';
import { createPortal } from 'react-dom';
import { useBehaviorEffects } from '../../hooks/use-behavior-effects';
import { useMemory } from '../../hooks/use-memory';
import { createBehavior, type KeyInput, type PartIds } from '../../lib/contract';
import type { EffectHost } from '../../lib/effects';
import classy from '../../primitives/classy';
import { mergeProps } from '../../primitives/slot';
import {
  dialog,
  isOpen,
  type DialogActions,
  type DialogConfig,
  type DialogPart,
  type DialogState,
} from './dialog.behavior';
import { dialogClasses, type DialogClassSet } from './dialog.classes';

type DialogAction = keyof DialogActions;

interface DialogContextValue {
  config: DialogConfig;
  state: DialogState;
  effectiveOpen: boolean;
  ids: PartIds<DialogPart>;
  classes: DialogClassSet;
  requestAction: (action: DialogAction) => void;
  setPart: (part: DialogPart) => (element: HTMLElement | null) => void;
  registerTitle: () => () => void;
  registerDescription: () => () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within <Dialog>`);
  }
  return context;
}

export interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function Dialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
}: DialogProps) {
  const config: DialogConfig = { open, defaultOpen, modal };

  const { memory, dispatch } = React.useMemo(() => createBehavior(dialog, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);

  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDescription, setHasDescription] = React.useState(false);

  const uid = React.useId();
  const ids: PartIds<DialogPart> = {
    trigger: `${uid}-trigger`,
    content: `${uid}-content`,
    overlay: `${uid}-overlay`,
    close: `${uid}-close`,
    title: hasTitle ? `${uid}-title` : '',
    description: hasDescription ? `${uid}-description` : '',
  };

  const requestAction = (action: DialogAction) => {
    if (!dispatch(action, config)) return;
    onOpenChange?.(action === 'open');
  };

  const partsRef = React.useRef<Map<string, HTMLElement | null>>(new Map());
  const latestRequestAction = React.useRef(requestAction);
  React.useEffect(() => {
    latestRequestAction.current = requestAction;
  });
  const hostRef = React.useRef<EffectHost | null>(null);
  hostRef.current ??= {
    getPart: (part) => partsRef.current.get(part) ?? null,
    dispatch: (action) => latestRequestAction.current(action as DialogAction),
  };

  useBehaviorEffects(dialog.effects(state, config), hostRef.current);

  // Registration callbacks are identity-stable: they sit in layout-effect
  // dependency lists, where a fresh identity per render would loop
  // register/unregister forever.
  const setPart = React.useCallback(
    (part: DialogPart) => (element: HTMLElement | null) => {
      partsRef.current.set(part, element);
    },
    [],
  );
  const registerTitle = React.useCallback(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, []);
  const registerDescription = React.useCallback(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, []);

  const contextValue: DialogContextValue = {
    config,
    state,
    effectiveOpen,
    ids,
    classes: dialogClasses(config, state),
    requestAction,
    setPart,
    registerTitle,
    registerDescription,
  };

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DialogTrigger({ asChild, onClick, children, ...props }: DialogTriggerProps) {
  const { config, state, effectiveOpen, ids, requestAction, setPart } =
    useDialogContext('DialogTrigger');

  const aria = dialog.aria(state, config, ids).trigger;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    requestAction(effectiveOpen ? 'close' : 'open');
  };

  const partProps = {
    'data-part': 'trigger',
    id: ids.trigger,
    ref: setPart('trigger'),
    ...aria,
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

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
}

export function DialogContent({
  showCloseButton = true,
  className,
  children,
  onKeyDown,
  ...props
}: DialogContentProps) {
  const { config, state, effectiveOpen, ids, classes, requestAction, setPart } =
    useDialogContext('DialogContent');

  if (!effectiveOpen) return null;
  if (typeof document === 'undefined') return null;

  const projection = dialog.aria(state, config, ids);
  const modal = config.modal !== false;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const input: KeyInput = {
      key: event.key,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };
    const action = dialog.keymap(input, state, 'content', config);
    if (action) {
      event.preventDefault();
      requestAction(action);
    }
  };

  return createPortal(
    <>
      {modal ? (
        <div
          data-part="overlay"
          id={ids.overlay}
          ref={setPart('overlay')}
          className={classes.overlay}
          {...projection.overlay}
        />
      ) : null}
      <div className={classes.container}>
        <div
          data-part="content"
          id={ids.content}
          ref={setPart('content')}
          tabIndex={-1}
          className={classy(classes.content, className)}
          {...projection.content}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <button
              type="button"
              data-part="close"
              id={ids.close}
              ref={setPart('close')}
              className={classes.close}
              {...projection.close}
              onClick={() => requestAction('close')}
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
      </div>
    </>,
    document.body,
  );
}

export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  const { classes } = useDialogContext('DialogHeader');
  return <div className={classy(classes.header, className)} {...props} />;
}

export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  const { classes } = useDialogContext('DialogFooter');
  return <div className={classy(classes.footer, className)} {...props} />;
}

export type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  const { ids, classes, setPart, registerTitle } = useDialogContext('DialogTitle');
  React.useLayoutEffect(registerTitle, [registerTitle]);
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

export type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const { ids, classes, setPart, registerDescription } = useDialogContext('DialogDescription');
  React.useLayoutEffect(registerDescription, [registerDescription]);
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

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DialogClose({ asChild, onClick, children, ...props }: DialogCloseProps) {
  const { requestAction } = useDialogContext('DialogClose');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    requestAction('close');
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
