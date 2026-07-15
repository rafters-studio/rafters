/**
 * Tests for media utilities
 */
import { describe, expect, it } from 'vitest';
import {
  detectEmbedProvider,
  getAspectRatioValue,
  isAllowedEmbedDomain,
} from '../../../../src/old/ui/embed-utils';

describe('isAllowedEmbedDomain', () => {
  it('should allow YouTube domains', () => {
    expect(isAllowedEmbedDomain('https://www.youtube.com/watch?v=abc123')).toBe(true);
    expect(isAllowedEmbedDomain('https://youtube.com/watch?v=abc123')).toBe(true);
    expect(isAllowedEmbedDomain('https://youtu.be/abc123')).toBe(true);
    expect(isAllowedEmbedDomain('https://www.youtube-nocookie.com/embed/abc123')).toBe(true);
  });

  it('should allow Vimeo domains', () => {
    expect(isAllowedEmbedDomain('https://vimeo.com/123456789')).toBe(true);
    expect(isAllowedEmbedDomain('https://player.vimeo.com/video/123456789')).toBe(true);
  });

  it('should allow Twitch domains', () => {
    expect(isAllowedEmbedDomain('https://www.twitch.tv/channel')).toBe(true);
    expect(isAllowedEmbedDomain('https://twitch.tv/videos/123456')).toBe(true);
    expect(isAllowedEmbedDomain('https://clips.twitch.tv/ClipSlug')).toBe(true);
    expect(isAllowedEmbedDomain('https://player.twitch.tv/?channel=test')).toBe(true);
  });

  it('should allow Twitter domains', () => {
    expect(isAllowedEmbedDomain('https://twitter.com/user/status/123456')).toBe(true);
    expect(isAllowedEmbedDomain('https://x.com/user/status/123456')).toBe(true);
    expect(isAllowedEmbedDomain('https://platform.twitter.com/widgets.js')).toBe(true);
  });

  it('should reject unknown domains', () => {
    expect(isAllowedEmbedDomain('https://example.com/video')).toBe(false);
    expect(isAllowedEmbedDomain('https://malicious-site.com/fake-youtube')).toBe(false);
    expect(isAllowedEmbedDomain('https://youtube.com.evil.com/watch')).toBe(false);
  });

  it('should reject invalid URLs', () => {
    expect(isAllowedEmbedDomain('not-a-url')).toBe(false);
    expect(isAllowedEmbedDomain('')).toBe(false);
  });
});

describe('detectEmbedProvider', () => {
  describe('YouTube detection', () => {
    it('should detect standard YouTube watch URLs', () => {
      const result = detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('youtube');
      expect(result?.videoId).toBe('dQw4w9WgXcQ');
      expect(result?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('should detect short YouTube URLs', () => {
      const result = detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('youtube');
      expect(result?.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should detect YouTube embed URLs', () => {
      const result = detectEmbedProvider('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('youtube');
      expect(result?.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should detect YouTube nocookie URLs', () => {
      const result = detectEmbedProvider('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('youtube');
      expect(result?.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should handle YouTube URLs with extra parameters', () => {
      const result = detectEmbedProvider(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLtest',
      );
      expect(result).not.toBeNull();
      expect(result?.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Vimeo detection', () => {
    it('should detect standard Vimeo URLs', () => {
      const result = detectEmbedProvider('https://vimeo.com/123456789');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('vimeo');
      expect(result?.videoId).toBe('123456789');
      expect(result?.embedUrl).toBe('https://player.vimeo.com/video/123456789');
    });

    it('should detect Vimeo player URLs', () => {
      const result = detectEmbedProvider('https://player.vimeo.com/video/123456789');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('vimeo');
      expect(result?.videoId).toBe('123456789');
    });
  });

  describe('Twitch detection', () => {
    it('should detect Twitch video URLs', () => {
      const result = detectEmbedProvider('https://www.twitch.tv/videos/123456789');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('twitch');
      expect(result?.videoId).toBe('123456789');
      expect(result?.embedUrl).toContain('video=123456789');
    });

    it('should detect Twitch clip URLs', () => {
      const result = detectEmbedProvider('https://clips.twitch.tv/AwesomeClipSlug123');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('twitch');
      expect(result?.videoId).toBe('AwesomeClipSlug123');
      expect(result?.embedUrl).toContain('clip=AwesomeClipSlug123');
    });

    it('should detect Twitch channel URLs', () => {
      const result = detectEmbedProvider('https://www.twitch.tv/channelname');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('twitch');
      expect(result?.videoId).toBe('channelname');
      expect(result?.embedUrl).toContain('channel=channelname');
    });
  });

  describe('Twitter detection', () => {
    it('should detect Twitter status URLs', () => {
      const result = detectEmbedProvider('https://twitter.com/user/status/1234567890123456789');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('twitter');
      expect(result?.videoId).toBe('1234567890123456789');
    });

    it('should detect X.com status URLs', () => {
      const result = detectEmbedProvider('https://x.com/user/status/1234567890123456789');
      expect(result).not.toBeNull();
      expect(result?.provider).toBe('twitter');
      expect(result?.videoId).toBe('1234567890123456789');
    });
  });

  describe('error handling', () => {
    it('should return null for invalid URLs', () => {
      expect(detectEmbedProvider('not-a-url')).toBeNull();
      expect(detectEmbedProvider('')).toBeNull();
    });

    it('should return null for disallowed domains', () => {
      expect(detectEmbedProvider('https://example.com/video/123')).toBeNull();
    });

    it('should return null for YouTube URL without video ID', () => {
      expect(detectEmbedProvider('https://www.youtube.com/')).toBeNull();
      expect(detectEmbedProvider('https://www.youtube.com/channel/UCtest')).toBeNull();
    });
  });
});

describe('getAspectRatioValue', () => {
  it('should return correct CSS aspect-ratio value for 16:9', () => {
    expect(getAspectRatioValue('16:9')).toBe('16 / 9');
  });

  it('should return correct CSS aspect-ratio value for 4:3', () => {
    expect(getAspectRatioValue('4:3')).toBe('4 / 3');
  });

  it('should return correct CSS aspect-ratio value for 1:1', () => {
    expect(getAspectRatioValue('1:1')).toBe('1 / 1');
  });

  it('should return correct CSS aspect-ratio value for 9:16', () => {
    expect(getAspectRatioValue('9:16')).toBe('9 / 16');
  });
});
