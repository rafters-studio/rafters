# Spec 04 — Motion

Status: FROZEN 2026-07-09 (ruled 2026-07-08, Sean).

Motion is behavior. A state transition without temporal shape is an incomplete
behavior description. `open: false -> true` is not specified until you know it
arrives rather than teleports.

## What a component declares

Per (part, transition), three fields. Nothing else.

```ts
interface MotionDecl {
  intent: 'enter' | 'exit' | 'emphasis' | 'transition';
  axis?: 'x' | 'y';          // axis-aligned only. Never diagonal.
  sizeClass?: 'control' | 'panel' | 'surface';  // what is moving, by size
}
```

Example — dialog:

```ts
motion: {
  open:  { overlay: { intent: 'enter' }, content: { intent: 'enter', sizeClass: 'panel' } },
  close: { overlay: { intent: 'exit' },  content: { intent: 'exit',  sizeClass: 'panel' } },
}
```

## What the system derives

Components never name durations, easings, or beziers.

- **Duration**: intent + sizeClass select a step on the motion token scale.
  Larger elements moving farther get longer durations. The scale walks the
  workspace temperament ratio.
- **Easing**: intent resolves through the workspace personality curve.
  Defaults: enter = ease-out (arrive, settle), exit = ease-in (leave quickly).
  Exits run faster than entrances — checkable, not advisory.
- **Reduced motion**: derived, never declared. Spatial motion becomes a
  cross-fade. Hover/focus/press acknowledgments survive — removing them leaves
  the user unsure their input landed.

## Constraints (schema-enforced)

From the Audi CI analysis (vault: motion-as-emotional-safety):

1. Direction is one axis. Diagonal movement does not exist.
2. Rotation is isolated: small elements only, never combined with translation.
3. Sequential, not simultaneous. Staggered elements tell a story; simultaneous
   elements are noise.
4. An animation in flight yields the moment the user acts.
5. Nothing moves without answering: what happened, where am I, what's next.
   Decorative animation is load without information (Stokes 2020).

## Statics

No transitions, no motion block. Container and Grid declare nothing.

## Execution

The declaration lives in the score. Execution is per-framework:

- React: the Presence adapter (wave 0-B) defers unmount through exit animation.
- WC: same contract via the element base.
- Astro: CSS-only. No exit animation; enter via data-state classes.

Until 0-B lands, ported components ship enter-only.

## Metadata

The motion declaration is the source. Component JSDoc motion notes, docs pages,
and token guidance render from it. Nothing motion-related is hand-authored
twice.
