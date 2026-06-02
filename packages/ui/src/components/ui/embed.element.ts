/**
 * <rafters-embed> -- Web Component for external embedded content.
 *
 * Framework-target for the Embed component, parallel to embed.tsx (React).
 * Scope is intentionally REDUCED relative to the React target: the WC
 * covers the iframe provider path only (YouTube, Vimeo, Twitch, generic).
 * The Twitter-widget flow, editable URL input, drag/drop file upload,
 * and alignment toolbar are React-only concerns and are NOT in this file.
 *
 * Each inner node carries the SAME utility class strings the React target
 * uses -- imported from embed.classes.ts -- rather than a parallel
 * hand-written CSS map. Presentation resolves from the shared compiled utility
 * sheet adopted by RaftersElement (setUtilityCSS) plus the token custom
 * properties inherited from the host :root.
 *
 * The aspect-ratio is the one piece that is data-driven rather than a fixed
 * utility class; it is applied as an inline style on the .embed wrapper, which
 * is exactly what embed.tsx does (className for the container chrome plus a
 * `style={{ aspectRatio }}`). The only shadow-scoped CSS this component owns is
 * the structural :host display shim.
 *
 * Shadow DOM structure (URL present, domain allowed, provider detected):
 *   <div><iframe ... /></div>     (wrapper carries embedContainerClasses)
 *
 * Shadow DOM structure (URL missing or domain disallowed):
 *   <div>...</div>                (wrapper carries embedFallbackClasses)
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
 *     div with an link to the original URL. NEVER renders an iframe to an
 *     unallowed domain.
 *   - Twitter-provider URLs fall through to the fallback case because
 *     the widget-based flow is out of scope.
 *   - DOM APIs only (document.createElement + setAttribute + appendChild);
 *     NEVER innerHTML.
 *
 * @cognitive-load 3/10
 * @accessibility iframe carries a `title` attribute; fallback exposes a
 *   link to the original URL for recovery.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type AspectRatio,
  embedContainerClasses,
  embedFallbackClasses,
  embedFallbackLinkClasses,
  embedFallbackMessageClasses,
  embedIframeClasses,
} from './embed.classes';
import {
  detectEmbedProvider,
  type EmbedProvider,
  getAspectRatioValue,
  isAllowedEmbedDomain,
} from './embed-utils';

const ALLOWED_ASPECT_RATIOS: ReadonlyArray<AspectRatio> = ['16:9', '4:3', '1:1', '9:16'];

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

function parseAspectRatio(value: string | null): AspectRatio {
  if (value && (ALLOWED_ASPECT_RATIOS as ReadonlyArray<string>).includes(value)) {
    return value as AspectRatio;
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

  /**
   * The only component-owned CSS: the structural host-display shim. The embed
   * fills the host width as a block, matching the React target's container.
   */
  static override styles = ':host { display: block; width: 100%; }';

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.update();
  }

  /**
   * Render the inner DOM for the current attribute state. DOM APIs only
   * -- never innerHTML. Returns a wrapper carrying embedContainerClasses with
   * an `<iframe>` when the URL is present, on an allowed domain, and resolves
   * to a supported non-Twitter provider; otherwise returns a fallback wrapper.
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
   * Create the iframe branch of the render tree. The wrapper carries the shared
   * container utility classes plus an inline aspect-ratio, exactly mirroring the
   * React target's className + style split.
   */
  private renderIframe(src: string, title: string): Node {
    const wrapper = document.createElement('div');
    wrapper.className = embedContainerClasses;
    wrapper.style.aspectRatio = getAspectRatioValue(
      parseAspectRatio(this.getAttribute('aspect-ratio')),
    );

    const iframe = document.createElement('iframe');
    iframe.className = embedIframeClasses;
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
   * true, append a link pointing at `url` so consumers can recover.
   */
  private renderFallback(url: string, message: string, includeLink: boolean): Node {
    const wrapper = document.createElement('div');
    wrapper.className = embedFallbackClasses;

    const messageEl = document.createElement('p');
    messageEl.className = embedFallbackMessageClasses;
    messageEl.textContent = message;
    wrapper.appendChild(messageEl);

    if (includeLink && url) {
      const link = document.createElement('a');
      link.className = embedFallbackLinkClasses;
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
