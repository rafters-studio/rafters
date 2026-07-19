import { describe, expect, it } from 'vitest';
import {
  detectEmbedProvider,
  embed,
  getAspectRatioValue,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
  isAllowedEmbedDomain,
  parseAspectRatio,
  parseProviderOverride,
  resolveEmbed,
} from '../../../src/components/embed/embed.behavior';

const state = {};
const ids = { root: 'r' };
const config = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };

describe('embed parts', () => {
  it('declares a single root part -- the frame is the only contract', () => {
    expect(Object.keys(embed.parts)).toEqual(['root']);
  });
});

describe('embed aria projection', () => {
  it('projects an EMPTY root -- the iframe title is content, not a projection', () => {
    expect(embed.aria(state, config, ids).root).toEqual({});
  });
});

describe('embed is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(embed.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(embed.canDispatch(state, 'anything' as never, config)).toBe(true);
  });

  it('claims no keys', () => {
    expect(embed.keymap({ key: 'Enter' }, state, 'root', config)).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(embed.initialState(config)).toEqual({});
  });
});

describe('isAllowedEmbedDomain -- the security allowlist', () => {
  it('accepts every allowlisted host', () => {
    for (const url of [
      'https://youtube.com/watch?v=x',
      'https://www.youtube.com/watch?v=x',
      'https://youtu.be/x',
      'https://www.youtube-nocookie.com/embed/x',
      'https://vimeo.com/1',
      'https://player.vimeo.com/video/1',
      'https://twitch.tv/name',
      'https://clips.twitch.tv/x',
      'https://twitter.com/u/status/1',
      'https://x.com/u/status/1',
    ]) {
      expect(isAllowedEmbedDomain(url), url).toBe(true);
    }
  });

  it('rejects any host outside the allowlist', () => {
    for (const url of [
      'https://evil.com/watch?v=x',
      'https://youtube.com.evil.com/x',
      'https://notyoutube.com/x',
      'javascript:alert(1)',
      'not a url',
      '',
    ]) {
      expect(isAllowedEmbedDomain(url), url).toBe(false);
    }
  });
});

describe('detectEmbedProvider', () => {
  it('rewrites YouTube watch URLs to the privacy-preserving nocookie host', () => {
    const result = detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it('resolves youtu.be short links', () => {
    expect(detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ')?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('resolves Vimeo to the player host', () => {
    expect(detectEmbedProvider('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456789',
      videoId: '123456789',
    });
  });

  it('resolves a Twitch channel with the parent guard', () => {
    const result = detectEmbedProvider('https://twitch.tv/somechannel');
    expect(result?.provider).toBe('twitch');
    expect(result?.embedUrl).toContain('channel=somechannel');
    expect(result?.embedUrl).toContain('parent=');
  });

  it('detects Twitter but leaves the original URL (widget flow, mapped to fallback later)', () => {
    const result = detectEmbedProvider('https://twitter.com/user/status/123');
    expect(result?.provider).toBe('twitter');
    expect(result?.videoId).toBe('123');
  });

  it('returns null for an allowed host with no recognizable id, and for disallowed hosts', () => {
    expect(detectEmbedProvider('https://youtube.com/')).toBeNull();
    expect(detectEmbedProvider('https://evil.com/watch?v=x')).toBeNull();
    expect(detectEmbedProvider('not a url')).toBeNull();
  });
});

describe('getAspectRatioValue', () => {
  it('maps every key to its CSS ratio', () => {
    expect(getAspectRatioValue('16:9')).toBe('16 / 9');
    expect(getAspectRatioValue('4:3')).toBe('4 / 3');
    expect(getAspectRatioValue('1:1')).toBe('1 / 1');
    expect(getAspectRatioValue('9:16')).toBe('9 / 16');
  });
});

describe('parseAspectRatio / parseProviderOverride -- attribute coercion', () => {
  it('accepts known aspect ratios and defaults unknowns to 16:9', () => {
    expect(parseAspectRatio('4:3')).toBe('4:3');
    expect(parseAspectRatio('bogus')).toBe('16:9');
    expect(parseAspectRatio(null)).toBe('16:9');
  });

  it('accepts known provider overrides and rejects twitter/unknowns', () => {
    expect(parseProviderOverride('vimeo')).toBe('vimeo');
    expect(parseProviderOverride('twitter')).toBeUndefined();
    expect(parseProviderOverride('bogus')).toBeUndefined();
    expect(parseProviderOverride(null)).toBeUndefined();
  });
});

describe('resolveEmbed -- the render descriptor', () => {
  it('resolves an allowlisted, detectable URL to an iframe carrying the nocookie src', () => {
    const descriptor = resolveEmbed({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(descriptor).toEqual({
      kind: 'iframe',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      title: 'youtube embed',
      aspectRatio: '16 / 9',
    });
  });

  it('honours an explicit title and aspect ratio', () => {
    const descriptor = resolveEmbed({
      url: 'https://vimeo.com/1',
      title: 'My clip',
      aspectRatio: '4:3',
    });
    expect(descriptor.kind).toBe('iframe');
    if (descriptor.kind === 'iframe') {
      expect(descriptor.title).toBe('My clip');
      expect(descriptor.aspectRatio).toBe('4 / 3');
    }
  });

  it('a provider override renames the default title but never the src', () => {
    const descriptor = resolveEmbed({
      url: 'https://vimeo.com/1',
      provider: 'generic',
    });
    if (descriptor.kind === 'iframe') {
      expect(descriptor.title).toBe('generic embed');
      expect(descriptor.src).toBe('https://player.vimeo.com/video/1');
    }
  });

  it('a missing URL resolves to a fallback with no recovery link', () => {
    expect(resolveEmbed({ url: '' })).toEqual({
      kind: 'fallback',
      url: '',
      message: 'No URL provided',
      includeLink: false,
    });
  });

  it('a disallowed host resolves to a fallback with a recovery link -- never an iframe', () => {
    const descriptor = resolveEmbed({ url: 'https://evil.com/watch?v=x' });
    expect(descriptor).toEqual({
      kind: 'fallback',
      url: 'https://evil.com/watch?v=x',
      message: 'This URL is not from a supported embed provider',
      includeLink: true,
    });
  });

  it('a Twitter URL resolves to the fallback -- the widget flow is out of scope', () => {
    const descriptor = resolveEmbed({ url: 'https://twitter.com/user/status/123' });
    expect(descriptor.kind).toBe('fallback');
  });
});

describe('iframe security constants -- preserved verbatim from the oracle', () => {
  it('the allow list is the exact permission surface', () => {
    expect(IFRAME_ALLOW).toBe(
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    );
  });

  it('the referrer policy is strict-origin-when-cross-origin', () => {
    expect(IFRAME_REFERRER_POLICY).toBe('strict-origin-when-cross-origin');
  });
});
