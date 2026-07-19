import type { BehaviorSpec } from '../../lib/contract';

/**
 * Embed: an external media frame. A static score -- no state, no actions, no
 * keymap, no effects, and (like Container and Card) an EMPTY, structural aria
 * projection. The root wrapper carries no ARIA; the iframe's own `title`
 * attribute (content, not a projection) is the whole accessible contract, so
 * the score projects nothing and the conformance harness asserts the empty
 * contract identically across React, the Web Component, and Astro.
 *
 * Embed has NO client and NO `bindEmbed`. The `loading`/`loaded` vocabulary in
 * the matrix is descriptive of the iframe's NATIVE `loading="lazy"` lifecycle,
 * not a reducer: the oracle (src/old/ui/embed.{tsx,element.ts}) tracks no
 * loading state on the iframe path -- only the dropped Twitter widget flow did
 * -- so there is nothing to bind. This is a pure static, modelled on Card.
 *
 * The one piece of real behaviour is the URL security resolver: which URLs are
 * allowed, which provider a URL resolves to, and what embed URL and iframe
 * security attributes result. That is a DECISION, so it lives here (never
 * duplicated across the three performances). `resolveEmbed` is the single pure
 * function the React, Web Component, and Astro performances all render from;
 * the security constants (`IFRAME_ALLOW`, `IFRAME_REFERRER_POLICY`) are the
 * crown jewels, preserved verbatim from the oracle.
 */

/**
 * Supported embed providers.
 */
export type EmbedProvider = 'youtube' | 'vimeo' | 'twitch' | 'twitter' | 'generic';

/**
 * Accepted aspect-ratio keys, shared across the three performances.
 */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

/**
 * Result of embed provider detection.
 */
export interface EmbedDetectionResult {
  provider: EmbedProvider;
  embedUrl: string;
  videoId?: string | undefined;
}

export interface EmbedConfig {
  /** URL of the content to embed. */
  url: string;
  /** Override the auto-detected provider (affects the default iframe title). */
  provider?: EmbedProvider | undefined;
  /** Aspect ratio for the embed container. Default `16:9`. */
  aspectRatio?: AspectRatio | undefined;
  /** Title for the iframe (accessibility). Default `{provider} embed`. */
  title?: string | undefined;
}

export type EmbedState = Record<never, never>;
export type EmbedActions = Record<never, never>;
export type EmbedPart = 'root';

/**
 * Iframe security attributes, preserved VERBATIM from the oracle. A single
 * source of truth so the three performances cannot drift on the permission
 * surface or the referrer policy -- the two attributes that keep an embedded
 * third-party frame from over-reaching.
 */
export const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

export const IFRAME_REFERRER_POLICY = 'strict-origin-when-cross-origin';

export const FALLBACK_MESSAGE_MISSING_URL = 'No URL provided';
export const FALLBACK_MESSAGE_DISALLOWED_DOMAIN = 'This URL is not from a supported embed provider';
export const FALLBACK_LINK_TEXT = 'Open in new tab';

/**
 * Allowed embed domains for security (XSS prevention). An iframe is NEVER
 * rendered to a host outside this set.
 */
const ALLOWED_EMBED_DOMAINS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'twitch.tv',
  'www.twitch.tv',
  'player.twitch.tv',
  'clips.twitch.tv',
  'twitter.com',
  'x.com',
  'platform.twitter.com',
]);

const ALLOWED_ASPECT_RATIOS: ReadonlyArray<AspectRatio> = ['16:9', '4:3', '1:1', '9:16'];

/** Providers expressible as an attribute override (Twitter is widget-only, out of scope). */
const ALLOWED_PROVIDER_OVERRIDES: ReadonlyArray<EmbedProvider> = [
  'youtube',
  'vimeo',
  'twitch',
  'generic',
];

/**
 * YouTube URL patterns
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtube-nocookie.com/embed/VIDEO_ID
 */
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
];

/**
 * Vimeo URL patterns
 * - vimeo.com/VIDEO_ID
 * - player.vimeo.com/video/VIDEO_ID
 */
const VIMEO_PATTERNS = [/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/];

/**
 * Twitter/X URL patterns
 * - twitter.com/USER/status/TWEET_ID
 * - x.com/USER/status/TWEET_ID
 */
const TWITTER_PATTERNS = [/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/];

/**
 * Validate a URL is from an allowed domain.
 */
export function isAllowedEmbedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function extractTwitchId(url: string): { type: 'video' | 'clip' | 'channel'; id: string } | null {
  const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch?.[1]) {
    return { type: 'video', id: videoMatch[1] };
  }

  const clipMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
  if (clipMatch?.[1]) {
    return { type: 'clip', id: clipMatch[1] };
  }

  // Channel must be last: it is the most general pattern.
  const channelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/);
  if (channelMatch?.[1]) {
    return { type: 'channel', id: channelMatch[1] };
  }

  return null;
}

function extractTwitterId(url: string): string | null {
  for (const pattern of TWITTER_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Detect the embed provider from a URL and generate its embed URL.
 *
 * @param url - The URL to analyze
 * @returns Detection result with provider, embed URL, and video ID, or null if invalid
 *
 * @example
 * ```ts
 * const result = detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * // { provider: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' }
 * ```
 */
export function detectEmbedProvider(url: string): EmbedDetectionResult | null {
  // Validate URL format.
  try {
    new URL(url);
  } catch {
    return null;
  }

  // Security check: only allow known embed domains.
  if (!isAllowedEmbedDomain(url)) {
    return null;
  }

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      videoId: youtubeId,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      videoId: vimeoId,
    };
  }

  const twitchInfo = extractTwitchId(url);
  if (twitchInfo) {
    let embedUrl: string;
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    switch (twitchInfo.type) {
      case 'video':
        embedUrl = `https://player.twitch.tv/?video=${twitchInfo.id}&parent=${parent}`;
        break;
      case 'clip':
        embedUrl = `https://clips.twitch.tv/embed?clip=${twitchInfo.id}&parent=${parent}`;
        break;
      case 'channel':
        embedUrl = `https://player.twitch.tv/?channel=${twitchInfo.id}&parent=${parent}`;
        break;
    }

    return {
      provider: 'twitch',
      embedUrl,
      videoId: twitchInfo.id,
    };
  }

  const twitterId = extractTwitterId(url);
  if (twitterId) {
    // Twitter embeds use their platform widget, not an iframe. Detection still
    // reports the provider (it is a valid, allowed URL); the resolver maps it
    // to the fallback because the widget flow is out of scope for the frame.
    return {
      provider: 'twitter',
      embedUrl: url,
      videoId: twitterId,
    };
  }

  // Unknown provider on an allowed domain -- not supported.
  return null;
}

/**
 * Get the CSS aspect-ratio value for an aspect-ratio key.
 */
export function getAspectRatioValue(ratio: AspectRatio): string {
  switch (ratio) {
    case '16:9':
      return '16 / 9';
    case '4:3':
      return '4 / 3';
    case '1:1':
      return '1 / 1';
    case '9:16':
      return '9 / 16';
  }
}

/**
 * Coerce a raw `aspect-ratio` attribute string into the score's typed key.
 * Unknown values fall back to `16:9` silently (the WC/Astro attribute path).
 */
export function parseAspectRatio(value: string | null): AspectRatio {
  if (value && (ALLOWED_ASPECT_RATIOS as ReadonlyArray<string>).includes(value)) {
    return value as AspectRatio;
  }
  return '16:9';
}

/**
 * Coerce a raw `provider` attribute string into a provider override, or
 * `undefined` (fall back to auto-detection). Twitter is not expressible as an
 * override: its widget flow is out of scope.
 */
export function parseProviderOverride(value: string | null): EmbedProvider | undefined {
  if (value && (ALLOWED_PROVIDER_OVERRIDES as ReadonlyArray<string>).includes(value)) {
    return value as EmbedProvider;
  }
  return undefined;
}

/**
 * The resolved render descriptor: a closed union the three performances render
 * from. Either an iframe (URL present, on an allowed domain, resolving to a
 * supported non-Twitter provider) or a fallback (everything else). The DECISION
 * lives here, not in the decorators.
 */
export type EmbedDescriptor =
  | { kind: 'iframe'; src: string; title: string; aspectRatio: string }
  | { kind: 'fallback'; url: string; message: string; includeLink: boolean };

/**
 * Resolve a config to its render descriptor. Mirrors the oracle WC's render
 * branch exactly: missing URL -> fallback (no link); disallowed domain or
 * undetectable URL -> fallback (with recovery link); Twitter -> fallback (the
 * widget flow is out of scope); otherwise an iframe to the detected embed URL
 * with a resolved title and aspect ratio.
 */
export function resolveEmbed(config: EmbedConfig): EmbedDescriptor {
  const url = config.url;

  if (!url) {
    return { kind: 'fallback', url: '', message: FALLBACK_MESSAGE_MISSING_URL, includeLink: false };
  }

  if (!isAllowedEmbedDomain(url)) {
    return {
      kind: 'fallback',
      url,
      message: FALLBACK_MESSAGE_DISALLOWED_DOMAIN,
      includeLink: true,
    };
  }

  const detected = detectEmbedProvider(url);
  if (!detected) {
    return {
      kind: 'fallback',
      url,
      message: FALLBACK_MESSAGE_DISALLOWED_DOMAIN,
      includeLink: true,
    };
  }

  // Twitter falls through to the fallback: the widget flow is out of scope.
  if (detected.provider === 'twitter') {
    return {
      kind: 'fallback',
      url,
      message: FALLBACK_MESSAGE_DISALLOWED_DOMAIN,
      includeLink: true,
    };
  }

  const provider = config.provider ?? detected.provider;
  const title = config.title ?? `${provider} embed`;
  const aspectRatio = getAspectRatioValue(config.aspectRatio ?? '16:9');

  return { kind: 'iframe', src: detected.embedUrl, title, aspectRatio };
}

export const embed: BehaviorSpec<EmbedConfig, EmbedState, EmbedActions, EmbedPart> = {
  name: 'embed',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The frame carries no ARIA of its own: the iframe's `title` (content, set by
  // the resolver) is the accessible contract, so the root projects nothing and
  // the harness asserts the empty contract across every performance.
  aria: () => ({ root: {} }),
  keymap: () => null,
  effects: () => [],
};
