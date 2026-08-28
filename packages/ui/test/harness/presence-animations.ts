/**
 * presence-animations.ts -- a hand-settled Web Animations surface for the
 * presence suites (#2157).
 *
 * `usePresence` OBSERVES animations: it calls `getAnimations()` on the node and
 * awaits the returned animations' `finished` promises. The test DOM has no Web
 * Animations API at all -- no `Element.prototype.getAnimations`, no `Animation`,
 * no timeline -- so a suite that wants to exercise the wait has to install the
 * animation itself and settle it by hand. Both presence suites need exactly
 * that, so the fake lives here rather than being written twice.
 *
 * What this pins is the WIRING -- held until settled, released once, never
 * released against a reopened node. It cannot pin the browser semantics
 * underneath (whether a cancelled enter is still returned, whether
 * `getAnimations()` flushes the pending exit rule into view); those live in
 * `test/presence/presence-race.e2e.ts`, in three real engines.
 */

/** One pending animation, plus the handles a spec settles it with. */
export interface FakeAnimation {
  animation: Animation;
  /** Complete it, the way a healthy exit ends. */
  finish: () => void;
  /** Reject it, the way a cancelled or replaced animation ends. */
  cancel: () => void;
}

function fakeAnimation(): FakeAnimation {
  let finish = (): void => {};
  let cancel = (): void => {};
  const finished = new Promise<Animation>((resolve, reject) => {
    finish = () => resolve(animation);
    cancel = () => reject(new Error('cancelled'));
  });
  const animation = { finished } as unknown as Animation;
  return { animation, finish, cancel };
}

/**
 * Give the node a Web Animations surface the hook can read. `count: 0` is the
 * "nothing is attached" shape -- a transition declared on a property that never
 * changed, which creates no animation object at all.
 */
export function attachAnimations(node: HTMLElement, count: number): FakeAnimation[] {
  const fakes = Array.from({ length: count }, () => fakeAnimation());
  Object.defineProperty(node, 'getAnimations', {
    configurable: true,
    value: () => fakes.map((fake) => fake.animation),
  });
  return fakes;
}

/**
 * The single-animation case, which is most of them. Returning the one fake
 * directly saves every caller the `[0]` plus its `undefined` guard.
 */
export function attachAnimation(node: HTMLElement): FakeAnimation {
  const [fake] = attachAnimations(node, 1);
  if (fake === undefined) throw new Error('attachAnimation: no fake animation was created');
  return fake;
}
