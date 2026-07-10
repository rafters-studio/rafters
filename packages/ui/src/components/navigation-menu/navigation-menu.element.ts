import type { AriaAttrs, KeyInput, PartIds } from '../../lib/contract';
import type { EffectHost } from '../../lib/effects';
import classy from '../../primitives/classy';
import { BehaviorElement } from '../../primitives/behavior-element';
import {
  activeItem,
  navContentAria,
  navigationMenu,
  navTriggerAria,
  type NavigationMenuActions,
  type NavigationMenuConfig,
  type NavigationMenuPart,
  type NavigationMenuState,
} from './navigation-menu.behavior';
import { navigationMenuClasses } from './navigation-menu.classes';

/**
 * <rafters-navigation-menu> -- the WC performance (Spec 00 boundary 2/3: no
 * decisions here, mechanical execution over navigation-menu.behavior.ts +
 * navigation-menu.classes.ts, exactly like navigation-menu.tsx).
 *
 * LIGHT DOM, not shadow DOM content -- the one deliberate structural
 * departure from container.element.ts. Spec 03's executors assume a single
 * un-shadowed subtree: dismiss-on-outside listens on `document` and reads
 * `event.target`, which retargets to the shadow HOST for anything rendered
 * inside a shadow root, so `element.contains(target)` reads a genuine inside
 * click as outside and closes on it; hover-intent and roving-focus likewise
 * walk the live DOM with `querySelectorAll`/`closest`, which do not cross
 * into slotted content the way `.contains()` does. Building the interactive
 * parts inside shadow DOM (Container's pattern) breaks all three silently.
 *
 * So this custom element carries `data-part="root"` on itself (the host,
 * not shadow content) and the shadow root holds nothing but a single
 * passthrough `<slot>` -- required simply so the host's own light-DOM
 * children render at all once a shadow root exists. Everything the score
 * declares (list/trigger/content/viewport/indicator) is real, consumer-
 * authored light-DOM markup, discovered by `data-part`/`data-value` and
 * enhanced in place: aria projected on, classes merged on, dispatch and the
 * effects runner wired on top. No part DOM is built or replaced here --
 * boundary 5 structure is entirely the consumer's, this performance never
 * invents or moves it beyond the one-time slot.
 *
 * Consequence worth stating plainly: because content lives in light DOM,
 * the RaftersElement adopted-utility-stylesheet trick (Container's route to
 * scoped Tailwind) does not reach it -- style rules adopted into a shadow
 * root style that root's own contents and `:host`, never the host's own
 * light-DOM children. This performance's utility classes therefore depend
 * on the consuming page having the compiled Tailwind output loaded
 * globally, same as any other light-DOM Tailwind consumer.
 */

const ORIENTATIONS: ReadonlySet<string> = new Set(['horizontal', 'vertical']);

function parseOrientation(value: string | null): NavigationMenuConfig['orientation'] {
  return value && ORIENTATIONS.has(value)
    ? (value as NavigationMenuConfig['orientation'])
    : undefined;
}

function parseDelay(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Translate a native KeyboardEvent into the contract's KeyInput -- the WC
 *  counterpart to use-behavior.ts's `keyInputOf`. */
function keyInputOf(event: KeyboardEvent): KeyInput {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

export class RaftersNavigationMenu extends BehaviorElement<
  NavigationMenuConfig,
  NavigationMenuState,
  NavigationMenuActions,
  NavigationMenuPart
> {
  static observedAttributes = ['value', 'default-value', 'orientation', 'delay-duration', 'class'];

  protected override readonly spec = navigationMenu;

  private slotted = false;
  private eventsWired = false;

  protected override readConfig(): NavigationMenuConfig {
    return {
      value: this.hasAttribute('value') ? (this.getAttribute('value') ?? '') : undefined,
      defaultValue: this.getAttribute('default-value') ?? undefined,
      orientation: parseOrientation(this.getAttribute('orientation')),
      delayDuration: parseDelay(this.getAttribute('delay-duration')),
    };
  }

  /** Unused -- this performance renders into light DOM, not the shadow
   *  root (see the class doc). Required by the adapter's abstract
   *  contract; `update()` below is overridden wholesale instead. */
  protected override buildParts(): Node {
    return document.createDocumentFragment();
  }

  override update(): void {
    this.ensureSlot();
    this.wireEvents();
    const config = this.readConfig();
    const state = this.currentState();
    this.applyParts(config, state);
    this.reconcileEffects(this.effectHost());
  }

  /** One-time passthrough slot: the only shadow-root content this
   *  performance ever has. Without it the host's light-DOM children --
   *  every declared part -- would not render at all. Also where the host
   *  first declares itself the "root" part: `findPart` (and so
   *  `EffectHost.getPart('root')`, used by dismiss-on-outside and
   *  hover-intent) resolves the root by that marker, never by tag name. */
  private ensureSlot(): void {
    if (this.slotted || !this.shadowRoot) return;
    this.shadowRoot.appendChild(document.createElement('slot'));
    this.setAttribute('data-part', 'root');
    this.slotted = true;
  }

  private effectHost(): EffectHost {
    return {
      getPart: (part) => this.findPart(this, part),
      dispatch: (action, payload) => {
        this.request(action as keyof NavigationMenuActions, payload as never);
      },
    };
  }

  /** Click/keydown delegation, wired once. Native `<button>` triggers
   *  convert Enter/Space to click (Spec 01 rule 5), so the click handler
   *  is toggle's only path; keydown carries everything the keymap claims
   *  that a native element does not already fulfill. */
  private wireEvents(): void {
    if (this.eventsWired) return;
    this.eventsWired = true;

    this.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
      const value = trigger?.dataset['value'];
      if (!value) return;
      this.request('toggle', value);
    });

    this.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
      const config = this.readConfig();
      const state = this.currentState();
      const action = navigationMenu.keymap(
        keyInputOf(event),
        state,
        trigger ? 'trigger' : 'root',
        config,
      );
      if (!action || action === 'toggle') return;
      if (action === 'open') {
        const value = trigger?.dataset['value'];
        if (!value) return;
        event.preventDefault();
        this.request('open', value);
        return;
      }
      if (action === 'close') {
        const active = activeItem(state, config);
        if (active === null) return;
        event.preventDefault();
        const openTrigger = this.querySelector<HTMLElement>(
          `[data-part="trigger"][data-value="${active}"]`,
        );
        this.request('close');
        openTrigger?.focus();
      }
    });
  }

  /** Aria/classes application over consumer-authored light-DOM markup:
   *  singleton parts (root/list/viewport/indicator) project once each;
   *  trigger/content are "many" -- one projection per distinct data-value
   *  found in the DOM, mirroring NavigationMenuTrigger/Content in the
   *  react performance. No structure is built or moved. */
  private applyParts(config: NavigationMenuConfig, state: NavigationMenuState): void {
    const ids = this.partIds();
    const classes = navigationMenuClasses(config, state);
    const projection = navigationMenu.aria(state, config, ids);

    this.applyAttrs(this, projection.root ?? {});
    this.className = classy(classes.root, this.className);
    if (!this.id) this.id = ids.root;

    this.applySingleton('list', projection.list, classes.list, ids);
    this.applySingleton('viewport', projection.viewport, classes.viewport, ids);
    this.applySingleton('indicator', projection.indicator, classes.indicator, ids);

    for (const trigger of this.querySelectorAll<HTMLElement>('[data-part="trigger"]')) {
      const value = trigger.dataset['value'];
      if (!value) continue;
      const contentId = `${ids.root}-content-${value}`;
      if (!trigger.id) trigger.id = `${ids.root}-trigger-${value}`;
      this.applyAttrs(trigger, navTriggerAria(value, state, config, { contentId }));
      trigger.className = classy(classes.trigger, trigger.className);
    }

    for (const content of this.querySelectorAll<HTMLElement>('[data-part="content"]')) {
      const value = content.dataset['value'];
      if (!value) continue;
      const triggerId = `${ids.root}-trigger-${value}`;
      if (!content.id) content.id = `${ids.root}-content-${value}`;
      this.applyAttrs(content, navContentAria(value, state, config, { triggerId }));
      content.className = classy(classes.content, content.className);
    }
  }

  private applySingleton(
    part: NavigationMenuPart,
    attrs: AriaAttrs | undefined,
    classNames: string,
    ids: PartIds<NavigationMenuPart>,
  ): void {
    const element = this.findPart(this, part);
    if (!element) return;
    if (!element.id) element.id = ids[part];
    if (attrs) this.applyAttrs(element, attrs);
    element.className = classy(classNames, element.className);
  }

  private applyAttrs(element: HTMLElement, attrs: AriaAttrs): void {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  }
}

if (!customElements.get('rafters-navigation-menu')) {
  customElements.define('rafters-navigation-menu', RaftersNavigationMenu);
}

export default RaftersNavigationMenu;
