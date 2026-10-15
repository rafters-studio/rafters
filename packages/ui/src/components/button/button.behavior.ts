import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import {
  pressable,
  type PressableActions,
  type PressableConfig,
  type PressablePart,
  type PressableState,
} from '../../lib/pressable';

/**
 * The variant and size vocabularies, in runtime form so nothing has to restate
 * them. DOM-native performances take these as `string | null` and must narrow
 * before they can call `buttonClasses`, and the test lanes enumerate them to
 * build one scene per value. Deriving each type from its array rather than
 * declaring both keeps them structurally impossible to desync.
 */
export const BUTTON_VARIANTS = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
] as const;

/**
 * Sizes, declared as the two groups that actually differ and concatenated into
 * the full list, so there is one ordered source and no way for a group to fall
 * out of step with the whole. Order is load-bearing: the registry serves this
 * vocabulary to consumers as an enum in declaration order.
 */
export const BUTTON_TEXT_SIZES = ['default', 'xs', 'sm', 'lg'] as const;
export const BUTTON_ICON_SIZES = ['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const;
export const BUTTON_SIZES = [...BUTTON_TEXT_SIZES, ...BUTTON_ICON_SIZES] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];

export function isButtonVariant(value: string | null | undefined): value is ButtonVariant {
  return value != null && (BUTTON_VARIANTS as ReadonlyArray<string>).includes(value);
}

export function isButtonSize(value: string | null | undefined): value is ButtonSize {
  return value != null && (BUTTON_SIZES as ReadonlyArray<string>).includes(value);
}

/** A size that shapes a square icon-only button. */
export type ButtonIconSize = (typeof BUTTON_ICON_SIZES)[number];
/** A size that shapes a button with a text label. */
export type ButtonTextSize = (typeof BUTTON_TEXT_SIZES)[number];

export interface ButtonConfig extends PressableConfig {
  variant: ButtonVariant;
  size: ButtonSize;
}

export type ButtonState = PressableState;
export type ButtonActions = PressableActions;
export type ButtonIconPart = 'startIcon' | 'endIcon';
export type ButtonPart = PressablePart | ButtonIconPart;

/**
 * The decorative icon wrappers. Each is present only when the author gives an
 * icon, and each projects aria-hidden="true" so the label alone is the
 * accessible name on every target, with or without JavaScript. The wrapper
 * carries the hiding because a child the author writes cannot be guaranteed to.
 */
function buttonIcons(): Slice<
  ButtonConfig,
  Record<never, never>,
  Record<never, never>,
  ButtonIconPart
> {
  return {
    name: 'button-icons',
    parts: { startIcon: { optional: true }, endIcon: { optional: true } },
    initialState: () => ({}),
    aria: () => ({
      startIcon: { 'aria-hidden': 'true' },
      endIcon: { 'aria-hidden': 'true' },
    }),
  };
}

export const button: BehaviorSpec<ButtonConfig, ButtonState, ButtonActions, ButtonPart> = compose(
  'button',
  pressable<ButtonConfig>(),
  buttonIcons(),
);

/**
 * Config as the projected markup carries it: what an Astro-rendered root holds.
 * Variant and size are not projected (they only choose classes, which the server
 * already rendered), so a markup-only bind reads them as the defaults; a
 * performance that owns its classes (the Web Component) passes its own config.
 */
export function buttonConfigFromMarkup(root: HTMLElement): ButtonConfig {
  return {
    variant: 'default',
    size: 'default',
    toggle: root.hasAttribute('aria-pressed'),
    defaultPressed: root.getAttribute('aria-pressed') === 'true',
    disabled: root.hasAttribute('disabled'),
    softDisabled: root.getAttribute('aria-disabled') === 'true',
    loading: root.getAttribute('aria-busy') === 'true',
    loadingAnnouncement: root.getAttribute('data-loading-announcement') ?? undefined,
  };
}

/** What a DOM-native bind hands back: re-project after config changed, or tear down. */
export interface ButtonBinding {
  refresh: () => void;
  teardown: () => void;
}

/**
 * The DOM-native binding of the button score -- the client the Web Component and
 * the Astro <script> both call. createBehavior is the model, the render composes
 * the sr-announcer primitive directly, aria-manager applies the projection, and
 * the DOM is the part registry.
 *
 * Config is read FRESH on every render through `readConfig` (Spec 00 section 4:
 * reflected inputs are never stored). Astro passes nothing and gets the markup
 * reading; the Web Component passes its attributes. `refresh` re-projects after
 * config changed, which also lets the loading announcement fire on a real
 * false->true edge.
 *
 * Archetype notes (simple-interactive):
 * - The `root` is a native <button>, so Enter/Space are fulfilled by the
 *   browser as a click (Spec 01 rule 5). The bind wires click -> press ONLY.
 *   A suppressed press (disabled/loading/soft-disabled, gated by canDispatch)
 *   also prevents the click's default so a form is not submitted.
 * - The loading announcement is edge-triggered: it fires once on a loading
 *   false->true transition, never on a baseline mount.
 */
export function bindButton(
  root: HTMLElement,
  readConfig: () => ButtonConfig = () => buttonConfigFromMarkup(root),
): ButtonBinding {
  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(button, readConfig());

  const request = (action: keyof ButtonActions): boolean => dispatch(action, readConfig());

  let prevLoading = readConfig().loading ?? false;
  const announceLoadingEdge = (config: ButtonConfig) => {
    const loading = config.loading ?? false;
    if (loading && !prevLoading) {
      announceToScreenReader(config.loadingAnnouncement ?? 'Loading', 'polite');
    }
    prevLoading = loading;
  };

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion,
  // which would re-interpret the resolved string 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const config = readConfig();
    const ids = {} as PartIds<ButtonPart>;
    for (const part of Object.keys(button.parts) as ButtonPart[]) {
      ids[part] = getPart(part)?.id ?? '';
    }
    const projection = button.aria(memory.get(), config, ids);
    for (const part of Object.keys(projection) as ButtonPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    announceLoadingEdge(config);
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint (baseline)

  const onClick = (event: Event) => {
    if (!request('press')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  root.addEventListener('click', onClick);

  return {
    refresh: render,
    teardown: () => {
      unsubscribe();
      root.removeEventListener('click', onClick);
    },
  };
}
