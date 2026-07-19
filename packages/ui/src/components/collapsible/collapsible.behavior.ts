import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '../../lib/disclosable';
import { updateAriaAttribute } from '../../primitives/aria-manager';

/**
 * Collapsible: a single expandable region. It shares the disclosable open/close
 * axis with dialog and popover, but it is the SIMPLEST member of the family --
 * a plain disclosure with no overlay, no focus trap, no scroll lock, and no
 * light-dismiss. A native `<button>` trigger toggles one content region; Enter
 * and Space are fulfilled by the button element itself, so the score declares no
 * keymap. The only concern beyond the disclosable axis is `disabled`, which
 * gates the toggle so a disabled region can never open or close.
 */
export interface CollapsibleConfig extends DisclosableConfig {
  /** A disabled collapsible refuses to toggle (gates open/close). */
  disabled?: boolean | undefined;
}

export type CollapsibleState = DisclosableState;
export type CollapsibleActions = DisclosableActions;

/** The wrapper part, beyond the disclosable trigger/content pair. It carries
 *  the open/disabled data-state for styling the region as a whole. */
export type CollapsibleSurfacePart = 'root';
export type CollapsiblePart = DisclosablePart | CollapsibleSurfacePart;

export { isOpen };

function isDisabled(config: CollapsibleConfig): boolean {
  return config.disabled === true;
}

/** Structure-only slice: the wrapper root part. Contributes no state and no
 *  actions -- its ARIA is written by the glue over the merged state. */
const collapsibleSurface: Slice<
  CollapsibleConfig,
  Record<never, never>,
  Record<never, never>,
  CollapsibleSurfacePart
> = {
  name: 'collapsible-surface',
  parts: {
    root: {},
  },
  initialState: () => ({}),
};

/** The collapsible glue: the disabled gate and the data-state styling hooks.
 *  No aria-labelledby on content -- name-from-author is prohibited on a
 *  role-less region, and the trigger's aria-expanded + aria-controls is the
 *  complete WAI-ARIA disclosure wiring (see collapsible.md dispositions). */
const collapsibleGlue: GlueSlice<
  CollapsibleConfig,
  CollapsibleState,
  CollapsibleActions,
  CollapsiblePart
> = {
  kind: 'glue',
  name: 'collapsible',
  // A disabled collapsible rejects both open and close, so a controlled
  // consumer's callback never fires for an edit it would refuse (oracle:
  // `if (disabled) return` before onOpenChange). ANDs with the disclosable
  // idempotence gate.
  canDispatch: (_state, _action, config) => !isDisabled(config),
  aria: (state, config) => {
    const open = isOpen(state, config);
    const disabled = isDisabled(config);
    const disabledAttr = disabled ? '' : undefined;
    return {
      root: {
        'data-state': open ? 'open' : 'closed',
        'data-disabled': disabledAttr,
      },
      trigger: {
        'data-disabled': disabledAttr,
      },
      content: {
        'data-disabled': disabledAttr,
      },
    };
  },
};

export const collapsible: BehaviorSpec<
  CollapsibleConfig,
  CollapsibleState,
  CollapsibleActions,
  CollapsiblePart
> = compose('collapsible', disclosable<CollapsibleConfig>(), collapsibleSurface, collapsibleGlue);

/**
 * The DOM-native binding of the collapsible score -- the client the Web
 * Component and the Astro <script> both import. Only React reads the
 * projections declaratively. There is no impure work to compose: no primitive
 * (no trap, no dismiss, no announce) -- just the aria projection, the content
 * presence toggle, and the native-button click. The trigger is a real
 * `<button>`, so Enter/Space arrive as click; a disabled button suppresses both
 * natively and the canDispatch gate is the belt-and-suspenders.
 */
export function bindCollapsible(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]');
  const contentAtMount = root.querySelector<HTMLElement>('[data-part="content"]');
  const config: CollapsibleConfig = {
    disabled: trigger?.hasAttribute('disabled') ?? false,
    // Seed the intrinsic open from the server-rendered markup. WC/Astro are
    // uncontrolled (no reactive prop), so config.open stays undefined.
    defaultOpen:
      root.getAttribute('default-open') === 'true' || contentAtMount?.dataset['state'] === 'open',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(collapsible, config);

  const request = (action: keyof CollapsibleActions): boolean => dispatch(action, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<CollapsiblePart>;
  for (const part of Object.keys(collapsible.parts) as CollapsiblePart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved, so apply it raw: validate:false skips
  // aria-manager's author-input coercion that flips the resolved string 'false'.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = collapsible.aria(state, config, ids);
    for (const part of Object.keys(projection) as CollapsiblePart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: the content is present-but-hidden, toggled on the open axis. It
    // stays in light DOM so the exit transition runs on the same node.
    const content = getPart('content');
    if (content) content.hidden = !open;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-part="trigger"]')) {
      request(isOpen(memory.get(), config) ? 'close' : 'open');
    }
  };
  root.addEventListener('click', onClick);

  return () => {
    unsubscribe();
    root.removeEventListener('click', onClick);
  };
}
