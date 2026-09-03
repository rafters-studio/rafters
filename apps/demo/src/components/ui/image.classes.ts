import { resolveFillName } from '@/lib/primitives/fill-resolver';
import {
  resolveImage,
  type ImageAlignment,
  type ImageConfig,
  type ImageRadius,
  type ImageSize,
  type ImageState,
} from '@/components/ui/image.behavior';

/**
 * The view: class strings, no logic. The figure (root) carries size +
 * alignment, the frame clips the image with a radius token and paints the
 * optional fill behind it, the img fills the frame, the status overlay covers
 * it while loading or in error, and the caption sits below. The three
 * performances all compose their className through imageClasses so there is
 * zero drift.
 *
 * Fill, not background: the frame's placeholder resolves through fill-resolver
 * (a role token or gradient), never a raw colour utility. The overlay itself is
 * a static token surface -- no spinner, no transition; the matrix gives Image
 * one animated moment, the img's load fade, and it lives on the img part.
 */

/** Size preset to token-based max-width. */
export const imageSizeClasses: Record<ImageSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'w-full',
};

/** Horizontal alignment via auto margins. */
export const imageAlignmentClasses: Record<ImageAlignment, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
};

/** Corner radius token applied to the clipping frame. */
export const imageRadiusClasses: Record<ImageRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

/** Base classes always applied to the figure wrapper. */
export const imageBaseClasses = 'relative';

/** The clipping frame: a positioning context that hides overflow so the
 *  radius rounds the image corners (not the figure, which also holds the
 *  caption). */
export const imageFrameClasses = 'relative overflow-hidden';

/** The inner image element -- block flow, fills the frame width. */
export const imageImgClasses = 'block w-full h-auto';

/**
 * THE CELL IS THE SPEC. `animate-fade-in-moderate-enter` is the generated
 * consumption of `image / img / load` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` -- keyframe `fade-in`, tier
 * `moderate`, curve role `enter`. A load is an arrival, so it is a keyframe,
 * not a transition, and it carries no literal duration or easing.
 *
 * KEYED OFF THE STATUS, which is the only place the load moment is legible:
 * the img stays mounted under the status overlay while `loading`, so a mount
 * animation would run behind the overlay instead of at the moment the image
 * arrives. `imageClasses` adds this the instant status resolves to `loaded`
 * -- on first render for the default clean image, and on the load event that
 * clears a `loading` or `error` overlay. All three performances route their
 * img className through `imageClasses`, so the moment is identical in each.
 *
 * The row is marked `proposed` -- a starting position, never reviewed.
 */
export const imageLoadedClasses = 'animate-fade-in-moderate-enter';

/** The optional caption below the frame. */
export const imageCaptionClasses = 'mt-2 text-center text-sm text-muted-foreground';

/** The overlay live region -- centred over the frame. */
export const imageStatusBaseClasses =
  'absolute inset-0 flex flex-col items-center justify-center text-center text-sm';

/** Loading overlay surface (a muted placeholder; no motion). */
export const imageLoadingClasses = 'bg-muted/80 text-muted-foreground';

/** Error overlay surface (a destructive-tinted alert). */
export const imageErrorClasses = 'bg-destructive/10 text-destructive';

export interface ImageClassSet {
  root: string;
  frame: string;
  img: string;
  status: string;
  caption: string;
}

export function imageClasses(config: ImageConfig, _state: ImageState): ImageClassSet {
  const alignment = config.alignment ?? 'center';
  const radius = config.radius ?? 'lg';
  const { isError, hasOverlay } = resolveImage(config);

  const root = [
    imageBaseClasses,
    config.size ? imageSizeClasses[config.size] : '',
    imageAlignmentClasses[alignment],
  ]
    .filter(Boolean)
    .join(' ');

  const frame = [
    imageFrameClasses,
    imageRadiusClasses[radius],
    resolveFillName(config.fill, 'surface'),
  ]
    .filter(Boolean)
    .join(' ');

  const status = [imageStatusBaseClasses, isError ? imageErrorClasses : imageLoadingClasses]
    .filter(Boolean)
    .join(' ');

  // `hasOverlay` is false exactly when status is `loaded` -- the load moment.
  const img = hasOverlay ? imageImgClasses : `${imageImgClasses} ${imageLoadedClasses}`;

  return { root, frame, img, status, caption: imageCaptionClasses };
}
