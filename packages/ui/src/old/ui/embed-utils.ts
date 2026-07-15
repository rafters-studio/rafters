/**
 * Media utilities for embed detection and URL parsing
 * @module components/ui/embed-utils
 */

/**
 * Supported embed providers
 */
export type EmbedProvider = 'youtube' | 'vimeo' | 'twitch' | 'twitter' | 'generic';

/**
 * Result of embed provider detection
 */
export interface EmbedDetectionResult {
  provider: EmbedProvider;
  embedUrl: string;
  videoId?: string | undefined;
}

/**
 * Allowed embed domains for security (XSS prevention)
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

// Twitch URL patterns are implemented directly in extractTwitchId
// for type-safe extraction of video/clip/channel types

/**
 * Twitter/X URL patterns
 * - twitter.com/USER/status/TWEET_ID
 * - x.com/USER/status/TWEET_ID
 */
const TWITTER_PATTERNS = [/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/];

/**
 * Validate URL is from an allowed domain
 */
export function isAllowedEmbedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Extract video ID from YouTube URL
 */
function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extract video ID from Vimeo URL
 */
function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extract video/channel/clip ID from Twitch URL
 */
function extractTwitchId(url: string): { type: 'video' | 'clip' | 'channel'; id: string } | null {
  // Check for video
  const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch?.[1]) {
    return { type: 'video', id: videoMatch[1] };
  }

  // Check for clip
  const clipMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
  if (clipMatch?.[1]) {
    return { type: 'clip', id: clipMatch[1] };
  }

  // Check for channel (must be last as it's the most general pattern)
  const channelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/);
  if (channelMatch?.[1]) {
    return { type: 'channel', id: channelMatch[1] };
  }

  return null;
}

/**
 * Extract tweet ID from Twitter/X URL
 */
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
 * Detect embed provider from URL and generate embed URL
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
  // Validate URL format
  try {
    new URL(url);
  } catch {
    return null;
  }

  // Security check: only allow known embed domains
  if (!isAllowedEmbedDomain(url)) {
    return null;
  }

  // Try YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      videoId: youtubeId,
    };
  }

  // Try Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      videoId: vimeoId,
    };
  }

  // Try Twitch
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

  // Try Twitter
  const twitterId = extractTwitterId(url);
  if (twitterId) {
    // Twitter embeds use their platform widget, not iframe
    // Return the original URL as the embed URL for widget initialization
    return {
      provider: 'twitter',
      embedUrl: url,
      videoId: twitterId,
    };
  }

  // Unknown provider - not supported
  return null;
}

/**
 * Get aspect ratio CSS value
 */
export function getAspectRatioValue(ratio: '16:9' | '4:3' | '1:1' | '9:16'): string {
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
