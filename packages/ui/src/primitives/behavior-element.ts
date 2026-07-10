/**
 * BehaviorElement -- the WC adapter (Spec 00 boundary 3: one per framework,
 * system-wide). The custom-element counterpart to hooks/use-behavior.ts:
 * instance memory, id supply, and aria application are handled here so a
 * component's `.element.ts` file holds only its idiomatic surface --
 * attribute names/parsing and part structure -- over this class. A
 * `.element.ts` file that imports createBehavior or primitives/memory
 * directly is re-expressing the adapter (boundary 3 violation test).
 *
 * Lifecycle and patch-in-place ride RaftersElement unchanged: attribute
 * changes already call `update()` -> `render()`, replacing only the
 * shadow-root content -- the host node itself, and any slotted light-DOM
 * children, are never torn down. That is boundary 3's "patch-in-place" for
 * a component with no part-level diffing need; a component that needs
 * finer-grained patching earns that machinery when it has a test that
 * requires it.
 *
 * The effects runner is wired here (Spec 03: "WC: apply after each patch,
 * stop on disconnect"), earned by Grid's conditional grid-roving effect --
 * the first WC performance whose score returns anything from `effects()`.
 * Dispatch-and-callback is still NOT wired: no shipped WC performance has a
 * REACHABLE action yet (Container's canDispatch is unreachable; Grid's
 * grid-roving effect moves focus without dispatching). `EffectHost.dispatch`
 * is a documented no-op seam -- the first WC with a reachable action fills
 * it in against lib/effects.ts's already framework-agnostic protocol.
 */
import {
  createBehavior,
  type ActionPayloads,
  type BehaviorSpec,
  type PartIds,
} from '../lib/contract';
import { createEffectRunner, type EffectHost, type EffectRunner } from '../lib/effects';
import type { Memory } from './memory';
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
  private behaviorMemory: Memory<State> | null = null;
  private effectRunner: EffectRunner | null = null;
  private readonly effectHost: EffectHost = {
    getPart: (part) => this.shadowRoot?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null,
    dispatch: () => {
      // No shipped WC performance dispatches from an effect yet (Spec 03
      // seam, see class docblock).
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
    this.behaviorMemory ??= createBehavior(this.spec, this.readConfig()).memory;
    this.effectRunner ??= createEffectRunner();
    super.connectedCallback();
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
    const state = this.behaviorMemory?.get() ?? this.spec.initialState(config);
    this.effectRunner?.apply(this.spec.effects(state, config), this.effectHost);
  }

  override render(): Node {
    const config = this.readConfig();
    const state = this.behaviorMemory?.get() ?? this.spec.initialState(config);
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
      for (const [attr, value] of Object.entries(attrs)) {
        if (value === undefined) {
          element.removeAttribute(attr);
        } else {
          element.setAttribute(attr, String(value));
        }
      }
    }
  }

  private findPart(root: Node, part: string): Element | null {
    if (!(root instanceof Element)) return null;
    if (root.getAttribute('data-part') === part) return root;
    return root.querySelector(`[data-part="${part}"]`);
  }
}
