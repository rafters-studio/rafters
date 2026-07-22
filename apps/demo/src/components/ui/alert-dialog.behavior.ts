import { compose, type GlueSlice, type Slice } from '@/lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import { createFocusTrap, preventBodyScroll } from '@/lib/primitives/focus-trap';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '@/lib/disclosable';

/**
 * Alert dialog: a consequence-gated confirm dialog. It is dialog with three
 * fixed differences -- ALWAYS modal (no `modal` prop), `role="alertdialog"`,
 * and NO outside-pointerdown dismiss. The user must choose Cancel or the
 * action; the layer never closes from an errant click outside it.
 */
export type AlertDialogConfig = DisclosableConfig;

export type AlertDialogState = DisclosableState;
export type AlertDialogActions = DisclosableActions;

export type AlertDialogSurfacePart = 'overlay' | 'title' | 'description' | 'cancel' | 'action';
export type AlertDialogPart = DisclosablePart | AlertDialogSurfacePart;

export { isOpen };

/** Structure-only slice: the parts an alert dialog has beyond the disclosable
 *  trigger/content pair. Contributes no state and no actions. cancel and action
 *  are the two decision buttons (there is no close affordance). */
const alertDialogSurface: Slice<
  AlertDialogConfig,
  Record<never, never>,
  Record<never, never>,
  AlertDialogSurfacePart
> = {
  name: 'alert-dialog-surface',
  parts: {
    overlay: { optional: true },
    title: { optional: true },
    description: { optional: true },
    cancel: { optional: true },
    action: { optional: true },
  },
  initialState: () => ({}),
};

/** The alert-dialog glue: ARIA identity and the Escape contract, written over
 *  the merged state. `role="alertdialog"` and the forced `aria-modal="true"`
 *  are the fixed divergences from dialog. The modal overlay concerns
 *  (focus-trap, scroll-lock) are composed directly by the bindings; there is
 *  deliberately no outside-dismiss. */
const alertDialogGlue: GlueSlice<
  AlertDialogConfig,
  AlertDialogState,
  { close: undefined },
  AlertDialogPart
> = {
  kind: 'glue',
  name: 'alert-dialog',
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    return {
      trigger: {
        // No `alertdialog` haspopup token exists; `dialog` is the closest and
        // is what the oracle projected.
        'aria-haspopup': 'dialog',
      },
      content: {
        role: 'alertdialog',
        // Always modal -- an alert dialog has no non-modal mode.
        'aria-modal': 'true',
        // An empty id means the binding did not render that part; a reference
        // to a missing id is an axe violation, so project absence.
        'aria-labelledby': ids.title || undefined,
        'aria-describedby': ids.description || undefined,
      },
      overlay: {
        'aria-hidden': 'true',
        'data-state': open ? 'open' : 'closed',
      },
    };
  },
  // Escape dismisses from anywhere inside the surface. Focus defaults to Cancel
  // (a part-bearing button), so the DOM-native bind resolves the innermost part
  // as `cancel`/`action`, not `content`; mapping all three keeps Escape working
  // whichever focusable holds focus. The trigger sits outside the surface and is
  // deliberately excluded.
  keymap: (event, _state, part) =>
    event.key === 'Escape' && (part === 'content' || part === 'cancel' || part === 'action')
      ? 'close'
      : null,
};

/** The parts the modal overlay pair composes against. */
export interface AlertDialogModalPorts {
  /** The dialog surface: focus is trapped inside it. */
  content: HTMLElement;
  /** Resolves the Cancel button so initial focus lands on the safer choice
   *  (the earned alert-dialog semantic) rather than the first focusable. */
  getCancel: () => HTMLElement | null;
}

/**
 * The modal overlay pair, composed directly: trap Tab focus inside `content`
 * and lock body scroll. Then default focus to Cancel -- the trap focuses the
 * first focusable on entry, and this override moves it to the safer choice.
 * There is NO outside-dismiss: an alert dialog closes only through an explicit
 * decision. Level-triggered: BOTH the DOM-native bindAlertDialog and the React
 * AlertDialogContent start this on the open transition and call the returned
 * cleanup on close/unmount. Focus restore rides the trap teardown (the trap
 * captured the previously-focused element before the Cancel override), so the
 * cleanup releases LIFO.
 */
export function startAlertDialogModalEffects({
  content,
  getCancel,
}: AlertDialogModalPorts): () => void {
  const releaseTrap = createFocusTrap(content);
  const releaseScroll = preventBodyScroll();
  // Earned semantic: focus defaults to Cancel, the non-destructive choice.
  getCancel()?.focus();
  return () => {
    releaseScroll();
    releaseTrap();
  };
}

export const alertDialog: BehaviorSpec<
  AlertDialogConfig,
  AlertDialogState,
  AlertDialogActions,
  AlertDialogPart
> = compose('alert-dialog', disclosable<AlertDialogConfig>(), alertDialogSurface, alertDialogGlue);

/**
 * The DOM-native binding of the alert-dialog score -- the client the Web
 * Component and the Astro <script> both import; only React reads the
 * projections declaratively. Same shape as bindDialog, minus the `modal`
 * axis (always modal) and minus outside-dismiss: PRESENCE (content/overlay are
 * present-but-hidden, toggled on the open axis so the trap's activeElement read
 * works) plus the modal overlay pair (focus-trap, scroll-lock), composed
 * directly and level-triggered -- started on the open transition and torn down
 * on close/unbind. Enter-only; exit animation waits on Presence.
 */
export function bindAlertDialog(root: HTMLElement): () => void {
  const config: AlertDialogConfig = {
    defaultOpen:
      root.getAttribute('default-open') === 'true' ||
      root.querySelector<HTMLElement>('[data-part="content"]')?.dataset['state'] === 'open',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(alertDialog, config);

  const request = (action: keyof AlertDialogActions): boolean => dispatch(action, config);

  // The modal overlay pair is level-triggered: present only while open.
  // render() starts it on the transition and this cleanup stops it on close.
  let modalCleanup: (() => void) | null = null;

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<AlertDialogPart>;
  for (const part of Object.keys(alertDialog.parts) as AlertDialogPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved, so apply it raw (validate:false skips
  // aria-manager's author-input coercion that flips the string 'false').
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = alertDialog.aria(state, config, ids);
    for (const part of Object.keys(projection) as AlertDialogPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: the overlay and the content container hide off the open axis.
    // The parts stay in light DOM (crawlable, and the trap can read them).
    for (const part of ['overlay', 'content'] as const) {
      const el = getPart(part);
      if (el) el.hidden = !open;
    }
    // Compose the modal overlay pair directly, level-triggered: start it once
    // on the open transition (content is now un-hidden above so the trap can
    // read its focusables), tear it down when it should no longer be present.
    if (open && !modalCleanup) {
      const content = getPart('content');
      if (content) {
        modalCleanup = startAlertDialogModalEffects({
          content,
          getCancel: () => getPart('cancel'),
        });
      }
    } else if (!open && modalCleanup) {
      modalCleanup();
      modalCleanup = null;
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    // Both decision buttons close; there is no separate close affordance.
    if (target.closest('[data-part="cancel"]') || target.closest('[data-part="action"]')) {
      request('close');
      return;
    }
    if (target.closest('[data-part="trigger"]')) {
      request(isOpen(memory.get(), config) ? 'close' : 'open');
    }
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as AlertDialogPart | undefined;
    if (!part) return;
    const action = alertDialog.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      part,
      config,
    );
    if (!action) return;
    event.preventDefault();
    const trigger = getPart('trigger');
    request(action);
    if (action === 'close') trigger?.focus();
  };
  root.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribe();
    modalCleanup?.();
    modalCleanup = null;
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
