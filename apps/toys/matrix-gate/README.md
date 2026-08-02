# toy 10 -- the matrix as data, gated against behaviour

Run: `pnpm exec tsx apps/toys/matrix-gate/toy.mts`

Prototypes #1990's two-direction validation gate and audits the REAL matrix
(`motion.fixture.md` is a snapshot of `packages/ui/docs/spec/matrix/motion.md`
from `wip/motion-intent-matrix`, 2026-08-02).

## Results

- Parsed 142 cells out of the markdown grid (the md is machine-recoverable;
  the future jsonl form remains the right target, but nothing blocks on it).
- VOCABULARY AUDIT CLEAN: every duration tier, curve role, delay generic,
  extent generic, and period named across all 142 cells exists in the
  five-namespace vocabulary. No typos in the hand-authored artifact.
- Gate direction (a): an assignment for a moment behaviour never declares
  fails loud (INVENTED MOMENT).
- Gate direction (b): a declared moment with no assignment fails loud
  (UNDECIDED MOMENT -- zero must be given, not absent).
- The gate caught its own author during construction: the first stub declared
  tooltip's hover intent as a separate `root|hover -> open` moment while the
  matrix models it as the delay column of the content open row. Exactly the
  representation drift the gate exists to catch.

Behaviour declarations here are hand stubs for dialog / checkbox / tooltip;
the real source is `BehaviorSpec.motion?: MotionMap<Part>` once #1990 lands.
