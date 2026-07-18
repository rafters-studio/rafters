/**
 * <rafters-image> -- the Web Component decorator of the Image score.
 *
 * Image has a LIVE ARIA projection (aria-busy while loading, an alert/status
 * role on the overlay), so this is a light-DOM ENHANCER, not a shadow static:
 * the host is a transparent wrapper (`display: contents`) and build() renders a
 * real `<figure data-part="root">` into the light DOM, carrying the config as
 * reflected attributes so bindImage -- the SAME DOM-native client the Astro
 * <script> uses -- reconstructs the identical config and applies the projection.
 * A real <figure>/<figcaption> (not a role shim) keeps the semantics identical
 * to the React and Astro targets.
 *
 * Scope is REDUCED relative to a full editor: upload, drag-drop, paste, the
 * alignment toolbar and the contentEditable caption are React-only concerns in
 * the oracle and are NOT here. The load/error surface is expressed through the
 * `status` attribute (default 'loaded' -- a clean image before any JS).
 *
 * Attributes:
 *   src            Image URL forwarded to the inner img.
 *   alt            Alt text; defaults to "" (the HTML spec for decorative
 *                  images) when absent.
 *   size           xs | sm | md | lg | xl | 2xl | full. Unknown values are
 *                  dropped (no max-width).
 *   alignment      left | center | right. Default 'center'.
 *   radius         none | sm | md | lg | xl | 2xl | 3xl | full. Default 'lg'.
 *   fill           Fill signature painted behind the image.
 *   status         loading | loaded | error. Default 'loaded'.
 *   caption        Optional text below the image, assigned via textContent.
 *   error-message  Overlay text when status='error'.
 *   loading-label  Overlay text when status='loading'.
 *
 * Gotcha 3: connectedCallback can fire before the light DOM is settled, so the
 * structure build + bind is deferred one microtask. Attribute changes after the
 * first bind rebuild the view and re-apply the projection.
 *
 * DOM APIs only -- never innerHTML.
 *
 * @cognitive-load 3/10
 * @accessibility The img always carries an alt attribute (defaults to "");
 *   aria-busy while loading; an assertive alert / polite status overlay role.
 */

import { bindImage, readImageConfig, resolveImage, type ImageConfig } from './image.behavior';
import { imageClasses } from './image.classes';

/** Config attributes reflected onto the rendered figure so bindImage
 *  reconstructs the identical config (the Astro figure carries the same). */
const REFLECTED_ATTRIBUTES: ReadonlyArray<string> = [
  'size',
  'alignment',
  'radius',
  'fill',
  'status',
  'error-message',
  'loading-label',
];

export class RaftersImage extends HTMLElement {
  static readonly observedAttributes: ReadonlyArray<string> = [
    'src',
    'alt',
    'size',
    'alignment',
    'radius',
    'fill',
    'status',
    'caption',
    'error-message',
    'loading-label',
  ];

  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // A transparent wrapper: the real <figure> is the layout/semantic root.
    this.style.display = 'contents';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) {
        const root = this.build();
        this.teardown = bindImage(root);
      }
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  attributeChangedCallback(): void {
    // Only after the first bind; the initial attribute set is handled by the
    // deferred build in connectedCallback. A new config is a new projection, so
    // rebuild the view and re-apply through a fresh bind.
    if (!this.teardown) return;
    this.teardown();
    const root = this.build();
    this.teardown = bindImage(root);
  }

  /** Render the real semantic figure into the light DOM. Returns the figure
   *  (the bind's root). DOM APIs only -- never innerHTML. */
  private build(): HTMLElement {
    const config: ImageConfig = readImageConfig(this);
    const classes = imageClasses(config, {});
    const resolved = resolveImage(config);

    const figure = document.createElement('figure');
    figure.setAttribute('data-part', 'root');
    figure.className = classes.root;
    for (const name of REFLECTED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value !== null) figure.setAttribute(name, value);
    }

    const frame = document.createElement('div');
    frame.setAttribute('data-part', 'frame');
    frame.className = classes.frame;

    const img = document.createElement('img');
    img.setAttribute('data-part', 'img');
    img.setAttribute('src', this.getAttribute('src') ?? '');
    img.setAttribute('alt', this.getAttribute('alt') ?? '');
    img.setAttribute('loading', 'lazy');
    img.className = classes.img;
    frame.appendChild(img);

    if (resolved.hasOverlay) {
      const status = document.createElement('div');
      status.setAttribute('data-part', 'status');
      status.className = classes.status;
      status.textContent = resolved.message;
      frame.appendChild(status);
    }

    figure.appendChild(frame);

    const caption = this.getAttribute('caption');
    if (caption !== null) {
      const figcaption = document.createElement('figcaption');
      figcaption.setAttribute('data-part', 'caption');
      figcaption.className = classes.caption;
      figcaption.textContent = caption;
      figure.appendChild(figcaption);
    }

    this.replaceChildren(figure);
    return figure;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-image')) {
  customElements.define('rafters-image', RaftersImage);
}
