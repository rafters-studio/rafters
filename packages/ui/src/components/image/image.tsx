/**
 * Image component with upload, editing, and responsive display support
 *
 * @cognitive-load 3/10 - Familiar image pattern with clear interaction points
 * @attention-economics Content-driven: Image is primary focus, controls secondary
 * @trust-building Predictable resize handles, clear loading/error states
 * @accessibility Alt text required, focus indicators for editable mode
 * @semantic-meaning figure/figcaption for proper image semantics
 *
 * @usage-patterns
 * DO: Always provide meaningful alt text
 * DO: Use alignment to create visual rhythm with text
 * DO: Size images appropriately for their context
 * NEVER: Use images without alt text
 * NEVER: Use decorative alignment that breaks reading flow
 *
 * @example
 * ```tsx
 * // Static image
 * <Image src="/photo.jpg" alt="A sunset over the ocean" />
 *
 * // Editable image with caption
 * <Image
 *   src={imageUrl}
 *   alt={altText}
 *   caption="Photo by John Doe"
 *   editable
 *   onChange={(props) => updateImage(props)}
 *   onUpload={async (file) => uploadFile(file)}
 * />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  image,
  resolveImage,
  type ImageAlignment,
  type ImageConfig,
  type ImagePart,
  type ImageRadius,
  type ImageSize,
  type ImageStatus,
} from './image.behavior';
import { imageClasses } from './image.classes';
import type { PartIds } from '../../lib/contract';

export type { ImageAlignment, ImageRadius, ImageSize, ImageStatus };

/**
 * Token-aware image with figure/figcaption semantics.
 *
 * A static score's projection is a pure function of config, so this decorator
 * computes `image.aria(...)` and `imageClasses(...)` inline (exactly
 * progress.tsx). The one live surface React owns is the load lifecycle: `status`
 * starts 'loaded' (a clean image, matching the oracle's `isLoading=false`
 * start), the img's `onError` flips it to 'error', and a later `onLoad`
 * recovers it -- the flipped status feeds straight back into config, so the ONE
 * projection formats the busy/alert semantics. Alt text is required at the type
 * level; the editable/upload surface is out of scope.
 *
 * @cognitive-load 3/10 - decision 0, information 1 (read the image; loading and
 * error add a little state to parse), interaction 0, disruption 1 (an error
 * overlay interrupts), learning 1. A familiar, content-driven pattern with no
 * control to activate.
 * @attention-economics Content-driven: the image is the primary focus and
 * pulls the eye; the caption and any status overlay are secondary. Alignment
 * sets the reading rhythm against surrounding text rather than competing for
 * attention.
 * @trust-building Predictable, honest load states -- an explicit error message
 * instead of a broken-image glyph, an accessible loading label instead of a
 * silent gap. The image never shifts silently under the reader.
 * @accessibility Alt text is required (a type-level obligation); figure/
 * figcaption give proper image semantics. While loading the img carries
 * `aria-busy` and the overlay is a polite `role="status"`; on error the overlay
 * is an assertive `role="alert"`. No keyboard interaction (not a widget).
 * @semantic-meaning figure/figcaption for a self-contained image with an
 * optional caption, referenced from the surrounding flow.
 *
 * @usage-patterns
 * DO: Always provide meaningful alt text
 * DO: Use alignment to create visual rhythm with text
 * DO: Size images appropriately for their context
 * NEVER: Use images without alt text
 * NEVER: Use decorative alignment that breaks reading flow
 *
 * @example
 * ```tsx
 * <Image src="/photo.jpg" alt="A sunset over the ocean" />
 * <Image src="/hero.jpg" alt="Product hero" size="lg" radius="2xl" caption="Photo by John Doe" />
 * ```
 */
export interface ImageProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onLoad' | 'onError'> {
  /** Image source URL. */
  src: string;
  /** Alt text for accessibility (required). */
  alt: string;
  /** Size preset -- token-based max-width. */
  size?: ImageSize;
  /** Horizontal alignment. Default 'center'. */
  alignment?: ImageAlignment;
  /** Corner radius token. Default 'lg'. */
  radius?: ImageRadius;
  /** Fill signature painted behind the image (the frame placeholder). */
  fill?: string;
  /** Initial load status. Seeds the state React owns; the img's load/error
   *  events flip it from there. Default 'loaded'. */
  status?: ImageStatus;
  /** Caption text below the image. */
  caption?: string;
  /** Message shown when the image fails to load. */
  errorMessage?: string;
  /** Accessible label shown while the image is loading. */
  loadingLabel?: string;
  /** Native `loading` attribute forwarded to the img. Default 'lazy'. */
  loading?: 'lazy' | 'eager';
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export const Image = React.forwardRef<HTMLElement, ImageProps>(function Image(
  {
    src,
    alt,
    size,
    alignment = 'center',
    radius = 'lg',
    fill,
    status: initialStatus = 'loaded',
    caption,
    errorMessage,
    loadingLabel,
    loading = 'lazy',
    className,
    onLoad,
    onError,
    ...props
  },
  ref,
) {
  const [status, setStatus] = React.useState<ImageStatus>(initialStatus);

  const config: ImageConfig = { size, alignment, radius, fill, status, errorMessage, loadingLabel };
  const classes = imageClasses(config, {});
  const resolved = resolveImage(config);

  const ids = {} as PartIds<ImagePart>;
  const aria = image.aria({}, config, ids);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setStatus('loaded');
    onLoad?.(event);
  };
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setStatus('error');
    onError?.(event);
  };

  return (
    <figure
      ref={ref}
      data-part="root"
      className={classy(classes.root, className)}
      {...aria.root}
      {...props}
    >
      <div data-part="frame" className={classes.frame} {...aria.frame}>
        <img
          data-part="img"
          src={src}
          alt={alt}
          loading={loading}
          className={classes.img}
          onLoad={handleLoad}
          onError={handleError}
          {...aria.img}
        />
        {resolved.hasOverlay ? (
          <div data-part="status" className={classes.status} {...aria.status}>
            {resolved.message}
          </div>
        ) : null}
      </div>
      {caption !== undefined ? (
        <figcaption data-part="caption" className={classes.caption} {...aria.caption}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
});

Image.displayName = 'Image';

export default Image;
