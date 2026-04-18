/**
 * <rafters-embed> -- Web Component for external embedded content.
 *
 * Framework-target for the Embed component, parallel to embed.tsx (React).
 * Scope is intentionally REDUCED relative to the React target: the WC
 * covers the iframe provider path only (YouTube, Vimeo, Twitch, generic).
 * The Twitter-widget flow, editable URL input, drag/drop file upload,
 * and alignment toolbar are React-only concerns and are NOT in this file.
 *
 * Shadow DOM structure (URL present, domain allowed, provider detected):
 *   <div class="embed"><iframe ... /></div>
 *
 * Shadow DOM structure (URL missing or domain disallowed):
 *   <div class="embed-fallback">...</div>
 *
 * Attributes:
 *   url           URL of the content to embed. Required.
 *   provider      Override auto-detected provider: youtube | vimeo | twitch
 *                 | generic. Unknown values fall back to auto-detection.
 *   aspect-ratio  16:9 | 4:3 | 1:1 | 9:16. Unknown values fall back to
 *                 '16:9' silently.
 *   title         Forwarded to the inner iframe's `title` attribute for
 *                 accessibility. Default: "{provider} embed".
 *
 * Behaviour:
 *   - Auto-registers on import, idempotent via customElements.get guard.
 *   - When `url` is absent, renders a fallback div and NEVER throws.
 *   - When `isAllowedEmbedDomain(url)` returns false, renders a fallback
 *     div with an <a> link to the original URL. NEVER renders an iframe
 *     to an unallowed domain.
 *   - Twitter-provider URLs fall through to the fallback case because
 *     the widget-based flow is out of scope.
 *   - DOM APIs only (document.createElement + setAttribute + appendChild);
 *     NEVER innerHTML.
 *   - Per-instance CSSStyleSheet pattern: connectedCallback creates one
 *     sheet, replaceSync(embedStylesheet(...)), adoptedStyleSheets = [sheet].
 *     On attribute change, re-render the inner DOM AND replaceSync the
 *     same sheet when `aspect-ratio` changed.
 *   - NEVER a raw CSS custom-property function literal in this file;
 *     token references live in embed.styles.ts.
 *   - Motion tokens use --motion-duration-* / --motion-ease-* only.
 *
 * @cognitive-load 3/10
 * @accessibility iframe carries a `title` attribute; fallback exposes an
 *   <a> link to the original URL for recovery.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { type AspectRatioKey, embedStylesheet } from './embed.styles';
import { detectEmbedProvider, type EmbedProvider, isAllowedEmbedDomain } from './embed-utils';

const ALLOWED_ASPECT_RATIOS: ReadonlyArray<AspectRatioKey> = ['16:9', '4:3', '1:1', '9:16'];

const ALLOWED_PROVIDERS: ReadonlyArray<EmbedProvider> = ['youtube', 'vimeo', 'twitch', 'generic'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'url',
  'provider',
  'aspect-ratio',
  'title',
] as const;

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

const IFRAME_REFERRER_POLICY = 'strict-origin-when-cross-origin';

const FALLBACK_MESSAGE_MISSING_URL = 'No URL provided';
const FALLBACK_MESSAGE_DISALLOWED_DOMAIN = 'This URL is not from a supported embed provider';
const FALLBACK_LINK_TEXT = 'Open in new tab';

function parseAspectRatio(value: string | null): AspectRatioKey {
  if (value && (ALLOWED_ASPECT_RATIOS as ReadonlyArray<string>).includes(value)) {
    return value as AspectRatioKey;
  }
  return '16:9';
}

function parseProviderOverride(value: string | null): EmbedProvider | null {
  if (value && (ALLOWED_PROVIDERS as ReadonlyArray<string>).includes(value)) {
    return value as EmbedProvider;
  }
  return null;
}

export class RaftersEmbed extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** Per-instance stylesheet rebuilt when aspect-ratio changes. */
  private _instanceSheet: CSSStyleSheet | null = null;

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
    if (name === 'aspect-ratio' && this._instanceSheet) {
      this._instanceSheet.replaceSync(this.composeCss());
    }
    this.update();
  }

  override disconnectedCallback(): void {
    this._instanceSheet = null;
  }

  /**
   * Build the CSS string for the current aspect-ratio attribute.
   */
  private composeCss(): string {
    return embedStylesheet({
      aspectRatio: parseAspectRatio(this.getAttribute('aspect-ratio')),
    });
  }

  /**
   * Render the inner DOM for the current attribute state. DOM APIs only
   * -- never innerHTML. Returns a `.embed` wrapper with an `<iframe>` when
   * the URL is present, on an allowed domain, and resolves to a supported
   * non-Twitter provider; otherwise returns a `.embed-fallback` wrapper.
   */
  override render(): Node {
    const url = this.getAttribute('url');

    if (!url) {
      return this.renderFallback('', FALLBACK_MESSAGE_MISSING_URL, false);
    }

    if (!isAllowedEmbedDomain(url)) {
      return this.renderFallback(url, FALLBACK_MESSAGE_DISALLOWED_DOMAIN, true);
    }

    const detected = detectEmbedProvider(url);
    if (!detected) {
      return this.renderFallback(url, FALLBACK_MESSAGE_DISALLOWED_DOMAIN, true);
    }

    // Twitter falls through to the fallback: widget flow is out of scope.
    if (detected.provider === 'twitter') {
      return this.renderFallback(url, FALLBACK_MESSAGE_DISALLOWED_DOMAIN, true);
    }

    const providerOverride = parseProviderOverride(this.getAttribute('provider'));
    const provider: EmbedProvider = providerOverride ?? detected.provider;
    const iframeTitle = this.getAttribute('title') ?? `${provider} embed`;

    return this.renderIframe(detected.embedUrl, iframeTitle);
  }

  /**
   * Create the iframe branch of the render tree.
   */
  private renderIframe(src: string, title: string): Node {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', src);
    iframe.setAttribute('title', title);
    iframe.setAttribute('allow', IFRAME_ALLOW);
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', IFRAME_REFERRER_POLICY);

    wrapper.appendChild(iframe);
    return wrapper;
  }

  /**
   * Create the fallback branch of the render tree. When `includeLink` is
   * true, append an <a> pointing at `url` so consumers can recover.
   */
  private renderFallback(url: string, message: string, includeLink: boolean): Node {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-fallback';

    const messageEl = document.createElement('p');
    messageEl.className = 'embed-fallback__message';
    messageEl.textContent = message;
    wrapper.appendChild(messageEl);

    if (includeLink && url) {
      const link = document.createElement('a');
      link.className = 'embed-fallback__link';
      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.textContent = FALLBACK_LINK_TEXT;
      wrapper.appendChild(link);
    }

    return wrapper;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-embed')) {
  customElements.define('rafters-embed', RaftersEmbed);
}
