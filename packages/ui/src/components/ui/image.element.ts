/**
 * <rafters-image> -- Web Component for static image display.
 *
 * Framework-target for the Image component, parallel to image.tsx (React).
 * Scope is intentionally REDUCED relative to the React target: the WC
 * covers the static display path only -- a figure with an img and an
 * optional figcaption. The editable mode (upload, drag-drop, paste,
 * alignment toolbar, loading/error overlays, contentEditable caption) is a
 * React-only concern and is NOT in this file.
 *
 * The inner figure/img/caption carry the SAME utility class strings the
 * React/Astro targets use -- imported from image.classes.ts -- rather than a
 * parallel hand-written CSS map. Presentation resolves from the shared
 * compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus the
 * token custom properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * shim (block layout, full width).
 *
 * Shadow DOM structure (src present): a figure carrying the composed image
 * utility classes wrapping an img. With a caption, a figcaption follows.
 * Without src, an empty figure.
 *
 * Attributes:
 *   src        Image URL. When absent, render an empty figure (no img) and
 *              NEVER throw.
 *   alt        Alt text forwarded to the inner img. Defaults to "" when
 *              absent, matching the HTML spec for decorative images.
 *   size       xs | sm | md | lg | xl | 2xl | full. Unknown or missing
 *              values fall back to 'full' silently.
 *   alignment  left | center | right. Unknown or missing values fall
 *              back to 'center' silently.
 *   caption    Optional text below the image, assigned via textContent.
 *              Never innerHTML.
 *
 * Behaviour:
 *   - Auto-registers on import, idempotent via customElements.get guard.
 *   - On size / alignment change, recompute the figure class string in place.
 *   - On src / alt / caption change, update the inner DOM (img.src, img.alt,
 *     figcaption.textContent) WITHOUT rebuilding the whole subtree.
 *   - DOM APIs only (document.createElement + setAttribute + appendChild);
 *     NEVER innerHTML.
 *
 * @cognitive-load 2/10
 * @accessibility The img always carries an alt attribute; defaults to ""
 *   when absent to match the HTML spec for decorative images.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  imageAlignmentClasses,
  imageBaseClasses,
  imageCaptionClasses,
  imageImgClasses,
  imageSizeClasses,
} from './image.classes';

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export type ImageAlignment = 'left' | 'center' | 'right';

const ALLOWED_SIZES: ReadonlyArray<ImageSize> = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];

const ALLOWED_ALIGNMENTS: ReadonlyArray<ImageAlignment> = ['left', 'center', 'right'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'src',
  'alt',
  'size',
  'alignment',
  'caption',
] as const;

function parseSize(value: string | null): ImageSize {
  if (value && (ALLOWED_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as ImageSize;
  }
  return 'full';
}

function parseAlignment(value: string | null): ImageAlignment {
  if (value && (ALLOWED_ALIGNMENTS as ReadonlyArray<string>).includes(value)) {
    return value as ImageAlignment;
  }
  return 'center';
}

/**
 * Compose the outer figure's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeImageClasses(size: ImageSize, alignment: ImageAlignment): string {
  return `${imageBaseClasses} ${imageSizeClasses[size]} ${imageAlignmentClasses[alignment]}`;
}

export class RaftersImage extends RaftersElement {
  static override styles = ':host { display: block; width: 100%; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Stable reference to the rendered figure wrapper. */
  private _figure: HTMLElement | null = null;

  /** Stable reference to the rendered img (when src is present). */
  private _img: HTMLImageElement | null = null;

  /** Stable reference to the rendered figcaption (when caption present). */
  private _caption: HTMLElement | null = null;

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    // size / alignment map onto the figure class string only; the DOM shape
    // is unchanged so no re-render is needed.
    if (name === 'size' || name === 'alignment') {
      if (this._figure) {
        this._figure.className = composeImageClasses(
          parseSize(this.getAttribute('size')),
          parseAlignment(this.getAttribute('alignment')),
        );
      }
      return;
    }

    // src, alt, caption map onto inner DOM state. Prefer the surgical
    // update path when the figure exists and the transition does not
    // require adding/removing a child element. Otherwise re-render.
    if (name === 'alt' && this._img) {
      this._img.alt = newValue ?? '';
      return;
    }

    if (name === 'src' && this._figure && this._img && newValue) {
      this._img.src = newValue;
      return;
    }

    if (name === 'caption' && this._figure) {
      if (newValue == null) {
        if (this._caption) {
          this._caption.remove();
          this._caption = null;
        }
        return;
      }
      if (this._caption) {
        this._caption.textContent = newValue;
        return;
      }
      this._caption = document.createElement('figcaption');
      this._caption.className = imageCaptionClasses;
      this._caption.textContent = newValue;
      this._figure.appendChild(this._caption);
      return;
    }

    // Fall back to a full re-render for transitions that change the DOM
    // shape (e.g. src toggling between absent/present).
    this.update();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._figure = null;
    this._img = null;
    this._caption = null;
  }

  /**
   * Render the inner semantic figure with an optional img and an optional
   * figcaption. DOM APIs only -- never innerHTML.
   *
   * The figure carries the composed base + size + alignment utility classes.
   * The img (when present) carries the shared img utility classes. The
   * caption (when present) carries the shared caption utility classes.
   */
  override render(): Node {
    const figure = document.createElement('figure');
    figure.className = composeImageClasses(
      parseSize(this.getAttribute('size')),
      parseAlignment(this.getAttribute('alignment')),
    );
    this._figure = figure;
    this._img = null;
    this._caption = null;

    const src = this.getAttribute('src');
    if (src) {
      const img = document.createElement('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', this.getAttribute('alt') ?? '');
      img.className = imageImgClasses;
      figure.appendChild(img);
      this._img = img;
    }

    const caption = this.getAttribute('caption');
    if (caption != null) {
      const captionEl = document.createElement('figcaption');
      captionEl.className = imageCaptionClasses;
      captionEl.textContent = caption;
      figure.appendChild(captionEl);
      this._caption = captionEl;
    }

    return figure;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-image')) {
  customElements.define('rafters-image', RaftersImage);
}
