import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { createEffectRunner, type EffectHost, type EffectSpec } from '../../lib/effects';
import { updateAriaAttribute } from '../../primitives/aria-manager';

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

/**
 * The DOM-native binding of the score -- the client. The Web Component and
 * the Astro <script> both import THIS; only React (retained-mode) reads the
 * projections above declaratively instead. Composes the substrate the same
 * way the React controller does: createBehavior is the model, the effect
 * runner drives the roving/hover/dismiss primitives, aria-manager applies the
 * projection, and the DOM is the part registry. Living here keeps one binding
 * for every DOM-native performance -- no per-framework copy, no drift.
 */
export function bindNavigationMenu(root: HTMLElement): () => void {
  const config: NavigationMenuConfig = {
    orientation: root.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal',
    delayDuration: Number.parseInt(root.getAttribute('delay-duration') ?? '', 10) || 200,
    defaultValue:
      root.querySelector<HTMLElement>('[data-part="trigger"][data-state="open"]')?.dataset[
        'value'
      ] ?? '',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(navigationMenu, config);
  const runner = createEffectRunner();

  const request = (action: keyof NavigationMenuActions, payload?: string): boolean =>
    dispatch(action, config, ...((payload === undefined ? [] : [payload]) as [string]));

  const host: EffectHost = {
    getPart,
    dispatch: (action, payload) =>
      void request(action as keyof NavigationMenuActions, payload as string | undefined),
  };

  // ids are READ from the markup (server- or author-minted), never generated.
  const ids = {} as PartIds<NavigationMenuPart>;
  for (const part of Object.keys(navigationMenu.parts) as NavigationMenuPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The score's projection is already resolved (final strings, undefined =
  // absent), so apply it raw: validate:false skips aria-manager's author-input
  // coercion, which would re-interpret the string 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  // Project every instance of a `many` part, resolving its sibling's id.
  const projectInstances = (
    part: 'trigger' | 'content',
    sibling: 'trigger' | 'content',
    project: (value: string, siblingId: string) => AriaAttrs,
  ) => {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
      const value = el.dataset['value'];
      if (value === undefined) continue;
      const siblingId =
        root.querySelector<HTMLElement>(`[data-part="${sibling}"][data-value="${value}"]`)?.id ??
        '';
      applyProjection(el, project(value, siblingId));
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = navigationMenu.aria(state, config, ids);
    for (const part of Object.keys(projection) as NavigationMenuPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    projectInstances('trigger', 'content', (value, contentId) =>
      navTriggerAria(value, state, config, { contentId }),
    );
    projectInstances('content', 'trigger', (value, triggerId) =>
      navContentAria(value, state, config, { triggerId }),
    );
    runner.apply(navigationMenu.effects(state, config), host);
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-part="trigger"]');
    const value = trigger?.dataset['value'];
    if (value && root.contains(trigger)) request('toggle', value);
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-part="trigger"]');
    const action = navigationMenu.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      trigger ? 'trigger' : 'root',
      config,
    );
    if (!action || action === 'toggle') return; // native button click dispatches toggle
    if (action === 'open') {
      const value = trigger?.dataset['value'];
      if (!value) return;
      event.preventDefault();
      request('open', value);
      return;
    }
    if (action === 'close') {
      const active = activeItem(memory.get(), config);
      if (active === null) return;
      event.preventDefault();
      const openTrigger = root.querySelector<HTMLElement>(
        `[data-part="trigger"][data-value="${active}"]`,
      );
      request('close');
      openTrigger?.focus();
    }
  };
  root.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribe();
    runner.stop();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
