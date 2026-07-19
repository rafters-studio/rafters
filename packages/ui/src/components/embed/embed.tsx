/**
 * Embed -- an external media frame. Wraps a third-party iframe (YouTube, Vimeo,
 * Twitch) with an accessible title and aspect-ratio control, behind a secure
 * URL allowlist: a URL that is missing, off-allowlist, or unresolvable renders
 * a recovery fallback instead of a frame, and an iframe is NEVER pointed at a
 * host outside the allowlist. Detection rewrites YouTube URLs to the
 * privacy-preserving nocookie host and carries the security attributes
 * (`allow`, `referrerPolicy`, `loading="lazy"`) verbatim.
 *
 * @cognitive-load 3/10 - decision 0, info 1, interaction 0, disruption 1, learning 1
 * @attention-economics Content container: the video/embed is the primary
 * focus; the frame is a neutral surround, never the attraction. Reserve embeds
 * for content that earns a viewport -- an autoplaying frame is an attention
 * tax the surrounding page pays.
 * @trust-building Secure URL validation is the whole point: only an allowlisted
 * host renders a frame, YouTube resolves to the nocookie domain, and every
 * iframe ships a strict referrer policy. A disallowed URL degrades to an
 * honest recovery link rather than a silent blank.
 * @accessibility Every iframe carries a `title` (defaulting to `{provider}
 * embed`); pass a descriptive one. The fallback exposes a real link to the
 * original URL so a blocked embed is still reachable.
 * @semantic-meaning An iframe with security attributes for third-party content,
 * wrapped in a presentational aspect-ratio surface that projects no ARIA.
 *
 * A pure static score has nothing to subscribe to: the performance is pure
 * decoration application. No useBehavior, no memory, no bind -- config in,
 * descriptor out, classes on.
 *
 * @example
 * ```tsx
 * // Auto-detected YouTube embed
 * <Embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Intro video" />
 *
 * // Explicit aspect ratio
 * <Embed url="https://vimeo.com/123456789" aspectRatio="4:3" title="My Vimeo Video" />
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
