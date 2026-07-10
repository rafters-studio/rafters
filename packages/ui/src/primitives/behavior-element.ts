/**
 * BehaviorElement -- the WC adapter (Spec 00 boundary 3: one per framework,
 * system-wide). The custom-element counterpart to hooks/use-behavior.ts:
 * instance memory, id supply, aria application, the accepted-dispatch
 * protocol, and the effects runner are handled here so a component's
 * `.element.ts` file holds only its idiomatic surface -- attribute
 * names/parsing and part structure -- over this class. A `.element.ts` file
 * that imports createBehavior, createEffectRunner, or primitives/memory
 * directly is re-expressing the adapter (boundary 3 violation test).
 *
 * Attribute-driven changes ride RaftersElement's lifecycle unchanged:
 * `attributeChangedCallback` calls `update()` -> `render()`, replacing the
 * shadow-root content wholesale -- the host node itself, and any slotted
 * light-DOM children, are never torn down. Dispatch-driven changes (a
 * performance's part listener calling `request()`) do NOT rebuild: they
 * patch the aria projection onto the ALREADY-MOUNTED DOM in place
 * (`patchAria`), because a rebuild would detach whatever element the user
 * just interacted with mid-gesture (focus lost between an Enter and the
 * Space that follows it). This is boundary 3's "patch-in-place" earned by
 * the first component with a test that requires it (button): ARIA-only,
 * not full part-structure diffing -- a component whose state DOES change
 * part presence earns that machinery next.
 *
 * The effects runner (lib/effects.ts, already framework-agnostic) applies
 * after every patch and stops on disconnect, per Spec 03's WC row. One-shot
 * effects (`announce`) are exercised end to end by button; ongoing effects
 * (`focus-trap`, `scroll-lock`, `dismiss-on-outside`, ...) are structurally
 * supported by the same runner but unexercised until the first WC port that
 * needs one -- that port validates the path, not rewires it.
 */
import {
  createBehavior,
  type ActionPayloads,
  type BehaviorSpec,
  type PartIds,
  type PayloadArgs,
} from '../lib/contract';
import { createEffectRunner, type EffectHost, type EffectRunner } from '../lib/effects';
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
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    this.effectRunner?.stop();
    this.effectRunner = null;
    super.disconnectedCallback();
  }

  /** Attribute-driven re-render: full rebuild via RaftersElement's
   *  `update()` -> `render()`, then the effects seam. Dispatch-driven
   *  changes go through `request()` -> `patchAria()` instead (no rebuild). */
  override update(): void {
    super.update();
    this.runEffects();
  }

  override render(): Node {
    const config = this.readConfig();
    const state = this.behaviorInstance?.memory.get() ?? this.spec.initialState(config);
    const ids = this.partIds();
    const root = this.buildParts(state, config, ids);
    this.applyAria(root, state, config, ids);
    return root;
  }

  /**
   * The accepted-dispatch protocol (Spec 01): applies the reducer iff
   * `canDispatch` allows it under the CURRENT config, then re-renders. A
   * performance's part event listeners (e.g. a click handler built in
   * `buildParts`) call this instead of touching memory or createBehavior
   * directly -- the WC counterpart to useBehavior's `request`.
   */
  protected request<K extends keyof Actions>(
    action: K,
    ...payload: PayloadArgs<Actions[K]>
  ): boolean {
    if (!this.behaviorInstance) return false;
    const accepted = this.behaviorInstance.dispatch(action, this.readConfig(), ...payload);
    if (accepted) {
      this.patchAria();
      this.runEffects();
    }
    return accepted;
  }

  /** Resolve a declared part to its live shadow-DOM element -- the
   *  EffectHost half of the effects seam (Spec 03), and the WC counterpart
   *  to useBehavior's getPart. */
  protected getPart(part: string): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null;
  }

  /** Re-apply the aria projection onto the CURRENTLY MOUNTED shadow content
   *  without rebuilding it. Dispatch never changes button's part presence
   *  (press flips `pressed`, nothing else); a component whose state DOES
   *  change part presence needs real structural patching, not this. */
  private patchAria(): void {
    const rootNode = this.shadowRoot?.firstChild;
    if (!rootNode) return;
    const config = this.readConfig();
    const state = this.behaviorInstance?.memory.get() ?? this.spec.initialState(config);
    this.applyAria(rootNode, state, config, this.partIds());
  }

  /** Reconcile the behavior's declarative effect list against the live
   *  runner (Spec 03): starts what appeared, stops what disappeared. Called
   *  after every patch (attribute rebuild or dispatch) so one-shot effects
   *  fire on the transition that requests them, never on the baseline
   *  apply that merely reflects already-true config. */
  private runEffects(): void {
    const config = this.readConfig();
    const state = this.behaviorInstance?.memory.get() ?? this.spec.initialState(config);
    this.effectRunner ??= createEffectRunner();
    const host: EffectHost = {
      getPart: (part) => this.getPart(part),
      dispatch: (action, payload) => {
        this.request(
          action as keyof Actions,
          ...([payload] as PayloadArgs<Actions[keyof Actions]>),
        );
      },
    };
    this.effectRunner.apply(this.spec.effects(state, config), host);
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
