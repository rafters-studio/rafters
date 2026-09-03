import { type AvatarConfig, type AvatarSize, resolveAvatar } from './avatar.behavior';

/**
 * The view: class strings, no logic. Ported verbatim from the oracle's settled
 * composition. The size map is the only config-dependent piece (root sizing +
 * fallback text scale); the image and fallback structure classes are literals
 * the performances import directly. Semantic colour tokens only
 * (`bg-muted`/`text-muted-foreground`), never a raw colour.
 */

export const avatarBaseClasses = 'relative flex shrink-0 overflow-hidden rounded-full';

export const avatarSizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

/**
 * THE CELL IS THE SPEC. `animate-fade-in-moderate-enter` is the generated
 * consumption of `avatar / image / load` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` -- keyframe `fade-in`, tier
 * `moderate`, curve role `enter`. A load is an arrival, so it is a keyframe,
 * not a transition.
 *
 * KEYED OFF THE MOUNT, not a state attribute. The image is absent from the DOM
 * until it loads (`resolveAvatar(...).imageHidden`), so the element's first
 * paint IS the load moment and the animation is unconditional on the part.
 *
 * The row is marked `proposed` -- a starting position, never reviewed.
 */
export const avatarImageClasses =
  'aspect-square h-full w-full object-cover animate-fade-in-moderate-enter';

/**
 * NO MOTION ON THE SWAP, AND THE ROW SAYS WHY. `avatar / image -> fallback /
 * error` assigns tier `fast` and curve role `standard` (provenance
 * `proposed`) to a `swap (crossfade)` whose declared property is
 * `discrete state change` -- nothing CSS can interpolate. The image does not
 * fade out, it unmounts; the fallback does not cross-fade in, it takes the
 * slot, and it takes that same slot while merely LOADING, a case the row does
 * not cover. Naming a fade here would assert a motion the row never assigned.
 * The matrix agrees at the token layer: the row sits in `noIntersectingProperty`
 * in `packages/design-tokens/test/motion-cells.test.ts`, so no cell and no
 * utility exists for it. Reported rather than approximated.
 */
export const avatarFallbackClasses =
  'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground';

export interface AvatarClassSet {
  root: string;
  image: string;
  fallback: string;
}

export function avatarClasses(config: AvatarConfig): AvatarClassSet {
  const { size } = resolveAvatar(config);
  return {
    root: `${avatarBaseClasses} ${avatarSizeClasses[size]}`,
    image: avatarImageClasses,
    fallback: avatarFallbackClasses,
  };
}
