import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import type { AriaAttrs, BehaviorSpec } from '../../lib/contract';
import type { EffectSpec } from '../../lib/effects';

/**
 * Navigation menu: a bar of triggers, each disclosing a content panel, one
 * open at a time (or none). Replaces the imperative
 * old/ui/navigation-menu.controller.ts wholesale.
 *
 * Focus movement across triggers is NOT state here -- it is ephemeral DOM
 * state owned by the roving-focus effect. The score's only state axis is
 * which item is open.
 */
export interface NavigationMenuConfig {
  /** Controlled open item ('' = none). */
  value?: string | undefined;
  /** Uncontrolled seed. */
  defaultValue?: string | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** Hover-intent delay in ms. */
  delayDuration?: number | undefined;
}

export interface NavigationMenuState {
  active: string | null;
  /** The open item was opened by hover. The click that lands right after a
   *  hover-open (pointerenter precedes pointerdown in the same gesture)
   *  must not close what the hover just opened; toggle absorbs exactly one
   *  such click. The oracle closed on that click -- a live defect. */
  pointerOpened: boolean;
}

export type NavigationMenuActions = {
  /** Open or switch to an item deliberately (payload: item value). */
  open: string;
  /** Open or switch via hover intent (payload: item value). */
  hoverOpen: string;
  /** Toggle an item (payload: item value). */
  toggle: string;
  /** Close whatever is open. */
  close: undefined;
};

export type NavigationMenuPart = 'root' | 'list' | 'trigger' | 'content' | 'viewport' | 'indicator';

/** The effective open item: controlled value shadows intrinsic state. */
export function activeItem(
  state: NavigationMenuState,
  config: NavigationMenuConfig,
): string | null {
  if (config.value !== undefined) return config.value === '' ? null : config.value;
  return state.active;
}

function orientationOf(config: NavigationMenuConfig): 'horizontal' | 'vertical' {
  return config.orientation ?? 'horizontal';
}

const navigation: Slice<
  NavigationMenuConfig,
  NavigationMenuState,
  NavigationMenuActions,
  NavigationMenuPart
> = {
  name: 'navigation',
  parts: {
    root: {},
    list: {},
    trigger: { many: true },
    // Content stays in the DOM hidden when closed: navigation links must be
    // crawlable and SSR-stable. Presence is constant; visibility is state.
    content: { many: true },
    // Decorative chrome (shadcn surface); present while open.
    viewport: { optional: true },
    indicator: { optional: true },
  },
  initialState: (config) => {
    const seed = config.value ?? config.defaultValue ?? '';
    return { active: seed === '' ? null : seed, pointerOpened: false };
  },
  actions: {
    open: (state, value) => ({ ...state, active: value, pointerOpened: false }),
    hoverOpen: (state, value) => ({ ...state, active: value, pointerOpened: true }),
    toggle: (state, value) => {
      if (state.active === value && state.pointerOpened) {
        return { ...state, pointerOpened: false };
      }
      return { ...state, active: state.active === value ? null : value, pointerOpened: false };
    },
    close: (state) => ({ ...state, active: null, pointerOpened: false }),
  },
  canDispatch: (state, action, config) =>
    action === 'close' ? activeItem(state, config) !== null : true,
  aria: (state, config, _ids) => {
    const open = activeItem(state, config) !== null;
    return {
      root: {
        'aria-label': 'Main navigation',
        'data-orientation': orientationOf(config),
        'data-state': open ? 'open' : 'closed',
      },
      list: {
        'data-orientation': orientationOf(config),
      },
      viewport: {
        'data-state': open ? 'open' : 'closed',
        'aria-hidden': open ? undefined : 'true',
      },
      indicator: {
        'data-state': open ? 'visible' : 'hidden',
        'aria-hidden': 'true',
      },
    };
  },
  keymap: (event, _state, part, config) => {
    if (event.key === 'Escape') return 'close';
    // ArrowDown opens the focused trigger only when the roving axis is
    // horizontal; on a vertical axis the roving-focus effect owns ArrowDown.
    if (part === 'trigger' && event.key === 'ArrowDown' && orientationOf(config) !== 'vertical') {
      return 'open';
    }
    // Enter/Space -> toggle is the contract; native <button> triggers
    // fulfill it via click (Spec 01 rule 5).
    if (part === 'trigger' && (event.key === 'Enter' || event.key === ' ')) return 'toggle';
    return null;
  },
};

const navigationGlue: GlueSlice<
  NavigationMenuConfig,
  NavigationMenuState,
  Record<never, never>,
  NavigationMenuPart
> = {
  kind: 'glue',
  name: 'navigation-menu',
  effects: (state, config): EffectSpec[] => {
    const open = activeItem(state, config) !== null;
    const effects: EffectSpec[] = [
      { type: 'roving-focus', part: 'list', orientation: orientationOf(config) },
      {
        type: 'hover-intent',
        part: 'root',
        triggerPart: 'trigger',
        contentPart: 'content',
        delay: config.delayDuration ?? 200,
        immediate: open,
        openAction: 'hoverOpen',
        closeAction: 'close',
      },
    ];
    if (open) {
      effects.push({ type: 'dismiss-on-outside', part: 'root', action: 'close' });
    }
    return effects;
  },
};

export const navigationMenu: BehaviorSpec<
  NavigationMenuConfig,
  NavigationMenuState,
  NavigationMenuActions,
  NavigationMenuPart
> = compose('navigation-menu', navigation, navigationGlue);

/**
 * Per-instance projections for the many-instance parts. Spec 01's aria()
 * projects one AriaAttrs per part NAME; trigger/content occur once per item
 * value, so their projections take the instance value. (Contract amendment
 * candidate: instance projection for `many` parts.)
 */
export function navTriggerAria(
  value: string,
  state: NavigationMenuState,
  config: NavigationMenuConfig,
  ids: { contentId: string },
): AriaAttrs {
  const open = activeItem(state, config) === value;
  return {
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': ids.contentId,
    'data-state': open ? 'open' : 'closed',
  };
}

export function navContentAria(
  value: string,
  state: NavigationMenuState,
  config: NavigationMenuConfig,
  ids: { triggerId: string },
): AriaAttrs {
  const open = activeItem(state, config) === value;
  return {
    'aria-labelledby': ids.triggerId,
    'data-state': open ? 'open' : 'closed',
    hidden: open ? undefined : true,
  };
}
