/**
 * Embed component for external content (YouTube, Vimeo, Twitch, Twitter)
 *
 * @cognitive-load 3/10 - Familiar video/embed pattern with clear boundaries
 * @attention-economics Content container: Video/embed is primary focus
 * @trust-building Secure URL validation, clear provider indicators
 * @accessibility Title for iframe, proper aspect ratios
 * @semantic-meaning iframe with security attributes for embedded content
 *
 * @usage-patterns
 * DO: Always provide a title for accessibility
 * DO: Use appropriate aspect ratios for content type
 * DO: Let users know the content source
 * NEVER: Embed from untrusted sources
 * NEVER: Use without URL validation
 *
 * @example
 * ```tsx
 * // Auto-detected YouTube embed
 * <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
 *
 * // Explicit provider with custom aspect ratio
 * <Embed
 *   url="https://vimeo.com/123456789"
 *   provider="vimeo"
 *   aspectRatio="4:3"
 *   title="My Vimeo Video"
 * />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  type AspectRatio,
  type EmbedProvider,
  FALLBACK_LINK_TEXT,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
  resolveEmbed,
} from './embed.behavior';
import {
  embedContainerClasses,
  embedFallbackClasses,
  embedFallbackLinkClasses,
  embedFallbackMessageClasses,
  embedIframeClasses,
} from './embed.classes';

export type { AspectRatio, EmbedProvider } from './embed.behavior';

export interface EmbedProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** URL of the content to embed. */
  url: string;
  /** Override the auto-detected provider (affects the default iframe title). */
  provider?: EmbedProvider;
  /** Aspect ratio for the embed container. Default `16:9`. */
  aspectRatio?: AspectRatio;
  /** Title for the iframe (accessibility). Default `{provider} embed`. */
  title?: string;
}

/**
 * Fallback message rendered via createElement, the same Typography-pending
 * disposition Card and Alert record: the raw <p>/<a> stand in until the
 * Typography role components exist, and repointing them is a designer pass,
 * not an agent call to make now.
 */
function fallbackMessage(message: string): React.ReactElement {
  return React.createElement('p', { className: embedFallbackMessageClasses }, message);
}

export const Embed = React.forwardRef<HTMLDivElement, EmbedProps>(
  ({ url, provider, aspectRatio, title, className, style, ...props }, ref) => {
    // resolveEmbed is pure -- safe to call in render (React 19 purity).
    const descriptor = resolveEmbed({ url, provider, aspectRatio, title });

    if (descriptor.kind === 'fallback') {
      return (
        <div
          ref={ref}
          data-part="root"
          className={classy(embedFallbackClasses, className) || undefined}
          style={style}
          {...props}
        >
          {fallbackMessage(descriptor.message)}
          {descriptor.includeLink && descriptor.url ? (
            <a
              href={descriptor.url}
              target="_blank"
              rel="noopener noreferrer"
              className={embedFallbackLinkClasses}
            >
              {FALLBACK_LINK_TEXT}
            </a>
          ) : null}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(embedContainerClasses, className) || undefined}
        style={{ ...style, aspectRatio: descriptor.aspectRatio }}
        {...props}
      >
        <iframe
          src={descriptor.src}
          title={descriptor.title}
          className={embedIframeClasses}
          allow={IFRAME_ALLOW}
          allowFullScreen
          loading="lazy"
          referrerPolicy={IFRAME_REFERRER_POLICY}
        />
      </div>
    );
  },
);

Embed.displayName = 'Embed';

export default Embed;
