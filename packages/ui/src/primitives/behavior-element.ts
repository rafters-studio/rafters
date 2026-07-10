/**
 * BehaviorElement -- the WC adapter (Spec 00 boundary 3: one per framework,
 * system-wide). The custom-element counterpart to hooks/use-behavior.ts:
 * instance memory, id supply, aria application, and the accepted-dispatch
 * protocol are handled here so a component's `.element.ts` file holds only
 * its idiomatic surface -- attribute names/parsing and part structure --
 * over this class. A `.element.ts` file that imports createBehavior or
 * primitives/memory directly is re-expressing the adapter (boundary 3
 * violation test).
 *
 * Lifecycle and patch-in-place ride RaftersElement unchanged: attribute
 * changes already call `update()` -> `render()`, replacing only the
 * shadow-root content -- the host node itself, and any slotted light-DOM
 * children, are never torn down. That is boundary 3's "patch-in-place" for
 * a component with no part-level diffing need; a component that needs
 * finer-grained patching earns that machinery when it has a test that
 * requires it. A component whose parts must stay reachable to
 * document-level listeners (dismiss-on-outside's `.contains()`,
 * focus-trap's `document.activeElement`, both of which are retargeted or
 * blind across a shadow boundary) renders those parts in LIGHT DOM instead
 * and overrides `update()` wholesale (Dialog is the first: see
 * dialog.element.ts) -- `render()`/`buildParts()` stay unused for it, not
 * a second adapter code path.
 *
 * The effects runner is wired here (Spec 03: "WC: apply after each patch,
 * stop on disconnect"), earned by Grid's conditional grid-roving effect --
 * the first WC performance whose score returns anything from `effects()`.
 *
 * The accepted-dispatch protocol (`request`) and a real `EffectHost.dispatch`
 * are wired here too, earned by Dialog -- the first WC performance with a
 * REACHABLE action (Container's canDispatch was unreachable; Grid's
 * grid-roving effect moves focus without dispatching). `getPart` resolves
 * shadow content first, then falls back to the host's own light-DOM
 * children, so both structural styles (Container/Grid's shadow parts,
 * Dialog's light-DOM parts) share the one lookup.
 */
import {
  createBehavior,
  type ActionPayloads,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
  type PayloadArgs,
} from '../lib/contract';
import {
  createEffectRunner,
  type EffectHost,
  type EffectRunner,
  type EffectSpec,
} from '../lib/effects';
import { RaftersElement } from './rafters-element';

export abstract class BehaviorElement<
  Config,
  State,
  Actions extends ActionPayloads,
  Part extends string,
> extends RaftersElement {
  /** The behavior score this performance carries. Static per class. */
  protected abstract readonly spec: BehaviorSpec<Config, State, Actions, Part>;

  private static instanceCounter = 0;
  private readonly instanceId = `rf-${++BehaviorElement.instanceCounter}`;
  private behaviorInstance: ReturnType<typeof createBehavior<Config, State, Actions, Part>> | null =
    null;
  private effectRunner: EffectRunner | null = null;
  private readonly effectHost: EffectHost = {
    getPart: (part) => this.getPart(part),
    dispatch: (action, payload) => {
      this.request(action as keyof Actions, ...([payload] as PayloadArgs<Actions[keyof Actions]>));
    },
  };

  /**
   * Config assembly's component-specific half: read the current attributes
   * into the behavior's Config shape. Attribute NAMES and parsing are the
   * component's framework-idiomatic surface (boundary 3); the adapter
   * calls this at every lifecycle point the config can change.
   */
  protected abstract readConfig(): Config;

  /**
   * Build the part DOM for the given state/config/ids. Structure only --
   * the adapter applies the aria projection over whatever this returns.
   */
  protected abstract buildParts(state: State, config: Config, ids: PartIds<Part>): Node;

  /** Id supply: SSR-stable ids for every declared part, scoped to this
   *  instance -- the single sanctioned derivation (mirrors useBehavior). */
  protected partIds(): PartIds<Part> {
    const ids = {} as PartIds<Part>;
    for (const part of Object.keys(this.spec.parts) as Part[]) {
      ids[part] = `${this.instanceId}-${part}`;
    }
    return ids;
  }

  override connectedCallback(): void {
    this.behaviorInstance ??= createBehavior(this.spec, this.readConfig());
    this.effectRunner ??= createEffectRunner();
    super.connectedCallback();
  }

  /** State assembly's component-specific-free half: the current intrinsic
   *  state, or the config-derived baseline before the instance exists. The
   *  single sanctioned read, mirrored from render()/update() into a method
   *  a light-DOM performance's own update() override can share. */
  protected currentState(config: Config): State {
    return this.behaviorInstance?.memory.get() ?? this.spec.initialState(config);
  }

  /**
   * The accepted-dispatch protocol (Spec 01): applies the reducer iff
   * `canDispatch` allows it under the CURRENT config, then re-renders. A
   * performance's part event listeners (click, keydown) call this instead
   * of touching memory or createBehavior directly -- the WC counterpart to
   * useBehavior's `request`. No consumer-callback/veto layer: a custom
   * element has no prop channel to report through (Spec 03 seam, unfilled
   * until a WC performance needs it).
   */
  protected request<K extends keyof Actions>(
    action: K,
    ...payload: PayloadArgs<Actions[K]>
  ): boolean {
    if (!this.behaviorInstance) return false;
    const accepted = this.behaviorInstance.dispatch(action, this.readConfig(), ...payload);
    if (accepted) this.update();
    return accepted;
  }

  /** Resolve a declared part to its live element: shadow content first
   *  (Container/Grid's structural style), then the host's own light-DOM
   *  children (Dialog's -- parts that document-level effect executors must
   *  reach without crossing a shadow boundary). The one lookup both
   *  structural styles share. */
  protected getPart(part: string): HTMLElement | null {
    return (
      this.shadowRoot?.querySelector<HTMLElement>(`[data-part="${part}"]`) ??
      this.querySelector<HTMLElement>(`[data-part="${part}"]`)
    );
  }

  /** Reconcile the behavior's declarative effect list against the live
   *  runner (Spec 03). Exposed so a performance whose update() bypasses
   *  the base render()/replaceChildren path (light-DOM structure) still
   *  drives the shared runner rather than re-deriving one. */
  protected runEffects(effects: EffectSpec[]): void {
    this.effectRunner?.apply(effects, this.effectHost);
  }

  override disconnectedCallback(): void {
    this.effectRunner?.stop();
    this.effectRunner = null;
    super.disconnectedCallback();
  }

  /** Patch-in-place (shadow content only) plus the effects reconcile --
   *  "apply after each patch" (Spec 03). Ridden by every attribute change
   *  via RaftersElement.attributeChangedCallback -> update().
   *
   *  KNOWN LIMITATION: RaftersElement.update() replaces the ENTIRE shadow
   *  subtree every call (no part-level patching yet). An ONGOING effect
   *  whose requested key is unchanged across two renders (e.g. grid-roving
   *  with the same column count) is left bound to the now-detached PREVIOUS
   *  root by the runner's key-identity diff -- the runner sees "still
   *  requested" and does not rebind. Mount-time behavior is correct; an
   *  attribute change that keeps the same effect key while swapping the
   *  live DOM is not yet. Not fixed here: full-replace is the whole of
   *  today's "patch-in-place", and reconciling it needs the part-level
   *  diffing this class already defers ("a component that needs
   *  finer-grained patching earns that machinery when it has a test that
   *  requires it") -- not a scope this port grows into. */
  override update(): void {
    super.update();
    const config = this.readConfig();
    const state = this.currentState(config);
    this.runEffects(this.spec.effects(state, config));
  }

  override render(): Node {
    const config = this.readConfig();
    const state = this.currentState(config);
    const ids = this.partIds();
    const root = this.buildParts(state, config, ids);
    this.applyAria(root, state, config, ids);
    return root;
  }

  /** Aria/classes application's aria half: walk the declared parts, project,
   *  and write attributes -- absence (`undefined`) removes the attribute
   *  rather than rendering it, matching the contract harness. Classes are a
   *  buildParts concern (component-specific selection, boundary 6). */
  private applyAria(root: Node, state: State, config: Config, ids: PartIds<Part>): void {
    const projection = this.spec.aria(state, config, ids);
    for (const part of Object.keys(this.spec.parts) as Part[]) {
      const attrs = projection[part];
      if (!attrs) continue;
      const element = this.findPart(root, part);
      if (!element) continue;
      this.applyAttrs(element, attrs);
    }
  }

  /** Write an aria projection onto one element -- absence (`undefined`)
   *  removes the attribute rather than rendering it. The one attribute-
   *  writing loop every performance's aria application goes through,
   *  shared/light-DOM structural styles alike. */
  protected applyAttrs(element: Element, attrs: AriaAttrs): void {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  }

  private findPart(root: Node, part: string): Element | null {
    if (!(root instanceof Element)) return null;
    if (root.getAttribute('data-part') === part) return root;
    return root.querySelector(`[data-part="${part}"]`);
  }
}
