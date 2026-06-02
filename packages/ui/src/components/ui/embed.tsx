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
import { useEffect, useMemo, useState } from 'react';
import classy from '../../primitives/classy';
import { embedContainerClasses, embedFallbackClasses, embedIframeClasses } from './embed.classes';
import {
  detectEmbedProvider,
  type EmbedProvider,
  getAspectRatioValue,
  isAllowedEmbedDomain,
} from './embed-utils';

export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

export interface EmbedProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** URL of the content to embed */
  url: string;
  /** Override auto-detected provider */
  provider?: EmbedProvider | undefined;
  /** Aspect ratio for the embed container */
  aspectRatio?: AspectRatio | undefined;
  /** Title for the iframe (accessibility) */
  title?: string | undefined;
  /** Enable editing mode */
  editable?: boolean | undefined;
  /** Called when embed properties change */
  onChange?: ((props: Partial<EmbedProps>) => void) | undefined;
}

/**
 * Fallback UI for unsupported or invalid embeds
 */
function EmbedFallback({ url, message }: { url: string; message: string }) {
  return (
    <div className={embedFallbackClasses}>
      <svg
        className="mb-3 h-12 w-12 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{message}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Open in new tab
      </a>
    </div>
  );
}

/**
 * Twitter embed using platform widget
 */
function TwitterEmbed({ tweetId }: { tweetId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Twitter widget script if not already loaded
    const loadTwitterWidget = () => {
      if (typeof window !== 'undefined' && !window.twttr) {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = () => {
          renderTweet();
        };
        document.body.appendChild(script);
      } else if (window.twttr?.widgets) {
        renderTweet();
      }
    };

    const renderTweet = async () => {
      if (containerRef.current && window.twttr?.widgets) {
        // Clear container using textContent (safe - no XSS risk)
        containerRef.current.textContent = '';

        try {
          await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
            theme: 'light',
            dnt: true,
          });
          setIsLoading(false);
        } catch {
          setIsLoading(false);
        }
      }
    };

    loadTwitterWidget();
  }, [tweetId]);

  return (
    <div className="flex justify-center">
      {isLoading && (
        <output className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="sr-only">Loading tweet...</span>
        </output>
      )}
      <div ref={containerRef} className={isLoading ? 'hidden' : ''} />
    </div>
  );
}

/**
 * Provider badge indicator
 */
function ProviderBadge({ provider }: { provider: EmbedProvider }) {
  const labels: Record<EmbedProvider, string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    twitch: 'Twitch',
    twitter: 'Twitter',
    generic: 'Embed',
  };

  const colors: Record<EmbedProvider, string> = {
    youtube: 'bg-destructive text-destructive-foreground',
    vimeo: 'bg-info text-info-foreground',
    twitch: 'bg-accent text-accent-foreground',
    twitter: 'bg-primary text-primary-foreground',
    generic: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      className={classy(
        'absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-medium',
        colors[provider],
      )}
    >
      {labels[provider]}
    </span>
  );
}

export const Embed = React.forwardRef<HTMLDivElement, EmbedProps>(
  (
    {
      url,
      provider: providerOverride,
      aspectRatio = '16:9',
      title,
      editable = false,
      onChange,
      className,
      ...props
    },
    ref,
  ) => {
    // Detect provider and generate embed URL
    const embedInfo = useMemo(() => {
      if (!url) return null;
      return detectEmbedProvider(url);
    }, [url]);

    // Use override provider or detected provider
    const provider = providerOverride ?? embedInfo?.provider ?? 'generic';
    const embedUrl = embedInfo?.embedUrl ?? url;
    const videoId = embedInfo?.videoId;

    // Security check
    const isAllowed = useMemo(() => isAllowedEmbedDomain(url), [url]);

    // Generate title if not provided
    const iframeTitle = title ?? `${provider} embed`;

    // Handle URL input in edit mode
    const [inputUrl, setInputUrl] = useState(url);

    const handleUrlSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      onChange?.({ url: inputUrl });
    };

    // Show URL input in edit mode when no valid embed
    if (editable && (!embedInfo || !isAllowed)) {
      return (
        <div
          ref={ref}
          className={classy(
            'rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6',
            className,
          )}
          {...props}
        >
          <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
            <label htmlFor="embed-url-input" className="text-sm font-medium text-muted-foreground">
              Enter embed URL (YouTube, Vimeo, Twitch, or Twitter)
            </label>
            <div className="flex gap-2">
              <input
                id="embed-url-input"
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Embed
              </button>
            </div>
            {url && !isAllowed && (
              <p className="text-sm text-destructive">
                This URL is not from a supported embed provider
              </p>
            )}
          </form>
        </div>
      );
    }

    // Show fallback for invalid URLs
    if (!embedInfo || !isAllowed) {
      return (
        <div ref={ref} className={className} {...props}>
          <EmbedFallback
            url={url}
            message={
              !isAllowed
                ? 'This URL is not from a supported embed provider'
                : 'Unable to embed this URL'
            }
          />
        </div>
      );
    }

    // Twitter uses widget, not iframe
    if (provider === 'twitter' && videoId) {
      return (
        <div ref={ref} className={classy('relative', className)} {...props}>
          {editable && <ProviderBadge provider={provider} />}
          <TwitterEmbed tweetId={videoId} />
        </div>
      );
    }

    // Standard iframe embed
    return (
      <div
        ref={ref}
        className={classy(embedContainerClasses, className)}
        style={{ aspectRatio: getAspectRatioValue(aspectRatio) }}
        {...props}
      >
        {editable && <ProviderBadge provider={provider} />}
        <iframe
          src={embedUrl}
          title={iframeTitle}
          className={embedIframeClasses}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  },
);

Embed.displayName = 'Embed';

export default Embed;

// Type augmentation for Twitter widget
declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: { theme?: string; dnt?: boolean },
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}
