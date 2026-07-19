/**
 * <rafters-embed> -- the Web Component performance of the Embed score.
 *
 * Embed is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO `bindEmbed`
 * (there is none) -- it renders the frame or fallback markup, once, from the
 * shared `resolveEmbed` resolver and the shared class strings, and re-renders
 * when an observed attribute changes (RaftersElement's base
 * attributeChangedCallback). That is the whole performance: a pure static's Web
 * Component is markup + classes, no controller.
 *
 * Scope matches the resolver: the iframe path only (YouTube, Vimeo, Twitch).
 * The Twitter widget flow, the editable URL form, drag/drop upload, and the
 * provider badge are React-target/studio concerns that are NOT in the behavior
 * layer at all -- a Twitter URL resolves to the fallback, exactly as the oracle
 * WC did.
 *
 * Attributes:
 *   url           URL of the content to embed. Required for a frame.
 *   provider      Override auto-detected provider: youtube | vimeo | twitch |
 *                 generic. Unknown values fall back to auto-detection.
 *   aspect-ratio  16:9 | 4:3 | 1:1 | 9:16. Unknown values fall back to '16:9'.
 *   title         Forwarded to the iframe `title`. Default "{provider} embed".
 *
 * DOM APIs only (createElement + setAttribute + appendChild); NEVER innerHTML.
 * The security attributes are set verbatim from the score's constants.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type EmbedConfig,
  FALLBACK_LINK_TEXT,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
  parseAspectRatio,
  parseProviderOverride,
  resolveEmbed,
} from './embed.behavior';
import {
  embedContainerClasses,
  embedFallbackClasses,
  embedFallbackLinkClasses,
  embedFallbackMessageClasses,
  embedIframeClasses,
} from './embed.classes';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['url', 'provider', 'aspect-ratio', 'title'];

export class RaftersEmbed extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /** The only component-owned CSS: the structural host-display shim. */
  static override styles = ':host { display: block; width: 100%; }';

  private config(): EmbedConfig {
    return {
      url: this.getAttribute('url') ?? '',
      provider: parseProviderOverride(this.getAttribute('provider')),
      aspectRatio: parseAspectRatio(this.getAttribute('aspect-ratio')),
      title: this.getAttribute('title') ?? undefined,
    };
  }

  override render(): Node {
    const descriptor = resolveEmbed(this.config());

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');

    if (descriptor.kind === 'iframe') {
      root.className = embedContainerClasses;
      root.style.aspectRatio = descriptor.aspectRatio;

      const iframe = document.createElement('iframe');
      iframe.className = embedIframeClasses;
      iframe.setAttribute('src', descriptor.src);
      iframe.setAttribute('title', descriptor.title);
      iframe.setAttribute('allow', IFRAME_ALLOW);
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', IFRAME_REFERRER_POLICY);

      root.appendChild(iframe);
      return root;
    }

    root.className = embedFallbackClasses;

    const message = document.createElement('p');
    message.className = embedFallbackMessageClasses;
    message.textContent = descriptor.message;
    root.appendChild(message);

    if (descriptor.includeLink && descriptor.url) {
      const link = document.createElement('a');
      link.className = embedFallbackLinkClasses;
      link.setAttribute('href', descriptor.url);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.textContent = FALLBACK_LINK_TEXT;
      root.appendChild(link);
    }

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-embed')) {
  customElements.define('rafters-embed', RaftersEmbed);
}
