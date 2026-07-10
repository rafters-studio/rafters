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
 * Dispatch-and-callback and the effects runner (navigation-menu, the first
 * stateful WC port) plug in here: `connectedCallback` creates the
 * instance's memory+dispatch pair and subscribes so an accepted action
 * re-renders; `request` is the accepted-dispatch protocol; `reconcileEffects`
 * hands the current effect list to a runner this class owns. A subclass
 * whose interactive parts must live in light DOM (Spec 03's
 * dismiss-on-outside listens on `document` and reads `event.target`, which
 * retargets to the shadow HOST for shadow-rooted content -- roving-focus and
 * hover-intent likewise assume one un-shadowed subtree) overrides `update()`
 * entirely instead of relying on `render()`/`buildParts()`; `request`,
 * `currentState`, `reconcileEffects`, and `findPart` stay available either
 * way, since dispatch and the effects runner are adapter concerns
 * independent of where the DOM lives.
 */
import {
  createBehavior,
  type ActionPayloads,
  type BehaviorSpec,
  type PartIds,
  type PayloadArgs,
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
  private behaviorDispatch:
    | (<K extends keyof Actions>(
        action: K,
        config: Config,
        ...payload: PayloadArgs<Actions[K]>
      ) => boolean)
    | null = null;
  private memoryUnsubscribe: (() => void) | null = null;
  private effectRunner: EffectRunner | null = null;

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
    if (!this.behaviorMemory) {
      const behavior = createBehavior(this.spec, this.readConfig());
      this.behaviorMemory = behavior.memory;
      this.behaviorDispatch = behavior.dispatch;
    }
    super.connectedCallback();
    // Fires immediately with the current value (nanostores semantics), so
    // the first subscribe causes one harmless extra render; every action
    // accepted after that re-renders through this listener alone.
    this.memoryUnsubscribe ??= this.behaviorMemory.subscribe(() => this.update());
  }

  override disconnectedCallback(): void {
    this.memoryUnsubscribe?.();
    this.memoryUnsubscribe = null;
    this.effectRunner?.stop();
    this.effectRunner = null;
    super.disconnectedCallback();
  }

  /** The accepted-dispatch protocol (mirrors useBehavior's `request`):
   *  applies the reducer iff canDispatch allows it under the CURRENT
   *  config. Returns acceptance. */
  protected request<K extends keyof Actions>(
    action: K,
    ...payload: PayloadArgs<Actions[K]>
  ): boolean {
    if (!this.behaviorDispatch) return false;
    return this.behaviorDispatch(action, this.readConfig(), ...payload);
  }

  /** The current intrinsic state, falling back to the spec's initial state
   *  before the instance's memory exists (e.g. a render forced before
   *  connectedCallback). */
  protected currentState(): State {
    return this.behaviorMemory?.get() ?? this.spec.initialState(this.readConfig());
  }

  /** Reconcile the spec's declared effects for the current state/config
   *  against the given host. One runner per instance, created lazily. */
  protected reconcileEffects(host: EffectHost): void {
    this.effectRunner ??= createEffectRunner();
    this.effectRunner.apply(this.spec.effects(this.currentState(), this.readConfig()), host);
  }

  override render(): Node {
    const config = this.readConfig();
    const state = this.currentState();
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

  /** Resolve a declared part to its live element under `root` -- `root`
   *  itself when it carries the part's data-part, otherwise the first
   *  descendant that does. Shared by shadow-DOM performances (via
   *  applyAria) and light-DOM performances (as their EffectHost.getPart). */
  protected findPart(root: Node, part: string): HTMLElement | null {
    if (!(root instanceof Element)) return null;
    if (root.getAttribute('data-part') === part) return root as HTMLElement;
    return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  }
}
