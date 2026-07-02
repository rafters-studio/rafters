import * as React from 'react';
import { createPortal } from 'react-dom';
import { keyInputOf, useBehavior, type BehaviorBinding } from '../../hooks/use-behavior';
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

interface DialogContextValue extends BehaviorBinding<DialogState, DialogActions, DialogPart> {
  config: DialogConfig;
  effectiveOpen: boolean;
  classes: DialogClassSet;
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

  const binding = useBehavior(dialog, config, {
    onAccepted: (action) => onOpenChange?.(action === 'open'),
  });

  const contextValue: DialogContextValue = {
    ...binding,
    config,
    effectiveOpen: isOpen(binding.state, config),
    classes: dialogClasses(config, binding.state),
  };

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DialogTrigger({ asChild, onClick, children, ...props }: DialogTriggerProps) {
  const { effectiveOpen, ids, aria, request, setPart } = useDialogContext('DialogTrigger');

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
  const { config, state, effectiveOpen, ids, aria, classes, request, setPart } =
    useDialogContext('DialogContent');

  if (!effectiveOpen) return null;
  if (typeof document === 'undefined') return null;

  const modal = config.modal !== false;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const action = dialog.keymap(keyInputOf(event), state, 'content', config);
    if (action) {
      event.preventDefault();
      request(action);
    }
  };

  return createPortal(
    <>
      {modal ? (
        <div
          data-part="overlay"
          id={ids.overlay || undefined}
          ref={setPart('overlay')}
          className={classes.overlay}
          {...aria.overlay}
        />
      ) : null}
      <div className={classes.container}>
        <div
          data-part="content"
          id={ids.content || undefined}
          ref={setPart('content')}
          tabIndex={-1}
          className={classy(classes.content, className)}
          {...aria.content}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
          {showCloseButton ? (
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
  const { ids, classes, setPart } = useDialogContext('DialogTitle');
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
  const { ids, classes, setPart } = useDialogContext('DialogDescription');
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
  const { request } = useDialogContext('DialogClose');

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
