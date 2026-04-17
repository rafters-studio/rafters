/**
 * <rafters-image> -- Web Component for static image display.
 *
 * Framework-target for the Image component, parallel to image.tsx (React).
 * Scope is intentionally REDUCED relative to the React target: the WC
 * covers the static display path only -- a `<figure>` with `<img>` and
 * an optional `<figcaption>`. The editable mode (upload, drag-drop, paste,
 * alignment toolbar, loading/error overlays, contentEditable caption) is a
 * React-only concern and is NOT in this file.
 *
 * Shadow DOM structure (src present):
 *   <figure class="image"><img src alt /></figure>
 *
 * Shadow DOM structure (src present, caption present):
 *   <figure class="image">
 *     <img src alt />
 *     <figcaption class="image-caption">{caption}</figcaption>
 *   </figure>
 *
 * Shadow DOM structure (src absent):
 *   <figure class="image"></figure>
 *
 * Attributes:
 *   src        Image URL. When absent, render an empty `<figure>` (no
 *              `<img>`) and NEVER throw.
 *   alt        Alt text forwarded to the inner `<img>`. Defaults to ""
 *              when absent, matching the HTML spec for decorative images.
 *   size       xs | sm | md | lg | xl | 2xl | full. Unknown or missing
 *              values fall back to 'full' silently.
 *   alignment  left | center | right. Unknown or missing values fall
 *              back to 'center' silently.
 *   caption    Optional text below the image. When present, render a
 *              `<figcaption>` with the text assigned via `textContent`.
 *              Never `innerHTML`.
 *
 * Behaviour:
 *   - Auto-registers on import, idempotent via customElements.get guard.
 *   - Per-instance CSSStyleSheet pattern: connectedCallback creates one
 *     sheet, replaceSync(imageStylesheet(...)), adoptedStyleSheets = [sheet].
 *     On `size` / `alignment` change, replaceSync the SAME sheet.
 *   - On `src` / `alt` / `caption` change, update the inner DOM
 *     (img.src, img.alt, figcaption.textContent) WITHOUT rebuilding the
 *     whole subtree.
 *   - DOM APIs only (document.createElement + setAttribute + appendChild);
 *     NEVER innerHTML.
 *   - NEVER raw CSS custom-property literal in this file; token references
 *     live in image.styles.ts.
 *   - Motion tokens use --motion-duration-* / --motion-ease-* only.
 *
 * @cognitive-load 2/10
 * @accessibility `<img>` always carries an `alt` attribute; defaults to ""
 *   when absent to match the HTML spec for decorative images.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type ImageAlignment, type ImageSize, imageStylesheet } from './image.styles';

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

export class RaftersImage extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt when size or alignment changes. */
  private _instanceSheet: CSSStyleSheet | null = null;

  /** Stable reference to the rendered `<figure>` wrapper. */
  private _figure: HTMLElement | null = null;

  /** Stable reference to the rendered `<img>` (when src is present). */
  private _img: HTMLImageElement | null = null;

  /** Stable reference to the rendered `<figcaption>` (when caption present). */
  private _caption: HTMLElement | null = null;

  override connectedCallback(): void {
    if (!this.shadowRoot) return;
    this._instanceSheet = new CSSStyleSheet();
    this._instanceSheet.replaceSync(this.composeCss());
    this.shadowRoot.adoptedStyleSheets = [this._instanceSheet];
    this.update();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    // size / alignment map onto the adopted stylesheet only; the DOM shape
    // is unchanged so no re-render is needed.
    if (name === 'size' || name === 'alignment') {
      if (this._instanceSheet) {
        this._instanceSheet.replaceSync(this.composeCss());
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
      this._caption.className = 'image-caption';
      this._caption.textContent = newValue;
      this._figure.appendChild(this._caption);
      return;
    }

    // Fall back to a full re-render for transitions that change the DOM
    // shape (e.g. src toggling between absent/present).
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
    this._figure = null;
    this._img = null;
    this._caption = null;
  }

  /**
   * Build the CSS string for the current size / alignment attributes.
   */
  private composeCss(): string {
    return imageStylesheet({
      size: parseSize(this.getAttribute('size')),
      alignment: parseAlignment(this.getAttribute('alignment')),
    });
  }

  /**
   * Render the inner semantic `<figure>` with an optional `<img>` and an
   * optional `<figcaption>`. DOM APIs only -- never innerHTML.
   *
   * The figure always gets `.image`. The img (when present) carries no
   * classes; styling comes from the adopted stylesheet via `.image img`.
   * The caption (when present) gets `.image-caption`.
   */
  override render(): Node {
    const figure = document.createElement('figure');
    figure.className = 'image';
    this._figure = figure;
    this._img = null;
    this._caption = null;

    const src = this.getAttribute('src');
    if (src) {
      const img = document.createElement('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', this.getAttribute('alt') ?? '');
      figure.appendChild(img);
      this._img = img;
    }

    const caption = this.getAttribute('caption');
    if (caption != null) {
      const captionEl = document.createElement('figcaption');
      captionEl.className = 'image-caption';
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
