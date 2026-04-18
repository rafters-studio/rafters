import { afterEach, describe, expect, it } from 'vitest';
import './embed.element';
import { RaftersEmbed } from './embed.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-embed');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function adoptedCssText(el: Element): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  const blocks: string[] = [];
  for (const sheet of sheets) {
    const rules: string[] = [];
    for (const rule of Array.from(sheet.cssRules)) {
      rules.push(rule.cssText);
    }
    blocks.push(rules.join('\n'));
  }
  return blocks.join('\n');
}

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const YOUTUBE_URL_ALT = 'https://www.youtube.com/watch?v=9bZkp7q19f0';
const DISALLOWED_URL = 'https://example.com/video/123';

describe('<rafters-embed>', () => {
  it('registers the rafters-embed tag on import', () => {
    expect(customElements.get('rafters-embed')).toBe(RaftersEmbed);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./embed.element')).resolves.toBeDefined();
    await expect(import('./embed.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-embed')).toBe(RaftersEmbed);
  });

  it('renders a fallback div when url attribute is absent', () => {
    const el = mount();
    const iframe = el.shadowRoot?.querySelector('iframe');
    expect(iframe).toBeNull();
    const fallback = el.shadowRoot?.querySelector('.embed-fallback');
    expect(fallback).not.toBeNull();
  });

  it('renders an iframe with correct src/allow/allowfullscreen/loading/referrerpolicy when url is a valid YouTube URL', () => {
    const el = mount({ url: YOUTUBE_URL });
    const iframe = el.shadowRoot?.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe?.getAttribute('allow')).toContain('accelerometer');
    expect(iframe?.getAttribute('allow')).toContain('autoplay');
    expect(iframe?.getAttribute('allow')).toContain('clipboard-write');
    expect(iframe?.getAttribute('allow')).toContain('encrypted-media');
    expect(iframe?.getAttribute('allow')).toContain('gyroscope');
    expect(iframe?.getAttribute('allow')).toContain('picture-in-picture');
    expect(iframe?.getAttribute('allow')).toContain('web-share');
    expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe?.getAttribute('loading')).toBe('lazy');
    expect(iframe?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe?.getAttribute('title')).toBe('youtube embed');
  });

  it('uses a provided title attribute on the iframe', () => {
    const el = mount({ url: YOUTUBE_URL, title: 'Rick roll' });
    const iframe = el.shadowRoot?.querySelector('iframe');
    expect(iframe?.getAttribute('title')).toBe('Rick roll');
  });

  it('renders a fallback when url is on a disallowed domain', () => {
    const el = mount({ url: DISALLOWED_URL });
    const iframe = el.shadowRoot?.querySelector('iframe');
    expect(iframe).toBeNull();
    const fallback = el.shadowRoot?.querySelector('.embed-fallback');
    expect(fallback).not.toBeNull();
    const link = fallback?.querySelector('a');
    expect(link?.getAttribute('href')).toBe(DISALLOWED_URL);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('falls back to 16:9 aspect ratio for unknown values', () => {
    const el = mount({ url: YOUTUBE_URL, 'aspect-ratio': 'wide' });
    const css = adoptedCssText(el);
    expect(css).toContain('aspect-ratio: 16 / 9');
  });

  it('applies the requested aspect-ratio when valid', () => {
    const el = mount({ url: YOUTUBE_URL, 'aspect-ratio': '4:3' });
    expect(adoptedCssText(el)).toContain('aspect-ratio: 4 / 3');
  });

  it('reflects url changes by re-rendering the inner DOM', () => {
    const el = mount({ url: YOUTUBE_URL });
    const first = el.shadowRoot?.querySelector('iframe');
    expect(first?.getAttribute('src')).toContain('dQw4w9WgXcQ');

    el.setAttribute('url', YOUTUBE_URL_ALT);
    const second = el.shadowRoot?.querySelector('iframe');
    expect(second?.getAttribute('src')).toContain('9bZkp7q19f0');
  });

  it('reflects aspect-ratio changes on the adopted stylesheet', () => {
    const el = mount({ url: YOUTUBE_URL });
    expect(adoptedCssText(el)).toContain('aspect-ratio: 16 / 9');
    el.setAttribute('aspect-ratio', '9:16');
    expect(adoptedCssText(el)).toContain('aspect-ratio: 9 / 16');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersEmbed.observedAttributes).toEqual(['url', 'provider', 'aspect-ratio', 'title']);
  });

  it('never renders an iframe for a Twitter URL (widget out of scope)', () => {
    const el = mount({ url: 'https://twitter.com/jack/status/20' });
    expect(el.shadowRoot?.querySelector('iframe')).toBeNull();
    expect(el.shadowRoot?.querySelector('.embed-fallback')).not.toBeNull();
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'embed.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
