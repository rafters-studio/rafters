/**
 * Astro performance of the Embed score. Embed is a PURE STATIC -- the score
 * projects no ARIA, holds no state, runs no effects -- so its Astro file ships
 * NO <script> and there is NO bindEmbed. This test renders the server markup
 * and asserts the one contract: the root frame/fallback, the iframe security
 * attributes verbatim, that a disallowed host never reaches an iframe, and axe
 * cleanliness. One score, three performances; here it is markup + classes.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { partElement } from '../../harness/conformance';
import Embed from '../../../src/components/embed/embed.astro';
import { IFRAME_ALLOW, IFRAME_REFERRER_POLICY } from '../../../src/components/embed/embed.behavior';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Embed, { props });
  // An embed is a frame, not a landmark; the page around it supplies the region
  // so the axe best-practice `region` rule is satisfied.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('embed conformance [astro]', () => {
  it('renders an iframe root to the nocookie host with the security attributes', async () => {
    const body = await render({ url: YOUTUBE, title: 'Intro' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('relative');
    const iframe = root.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe.getAttribute('title')).toBe('Intro');
    expect(iframe.getAttribute('allow')).toBe(IFRAME_ALLOW);
    expect(iframe.getAttribute('referrerpolicy')).toBe(IFRAME_REFERRER_POLICY);
    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('projects NO ARIA: the root is a pure static frame (no role)', async () => {
    const body = await render({ url: YOUTUBE });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('applies the aspect ratio as an inline style', async () => {
    const body = await render({ url: YOUTUBE, aspectRatio: '1:1' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('style')).toContain('aspect-ratio: 1 / 1');
  });

  it('a default title falls back to "{provider} embed"', async () => {
    const body = await render({ url: YOUTUBE });
    expect((body.querySelector('iframe') as HTMLIFrameElement).getAttribute('title')).toBe(
      'youtube embed',
    );
  });

  it('a disallowed host renders the fallback with a recovery link -- never an iframe', async () => {
    const body = await render({ url: 'https://evil.com/watch?v=x' });
    expect(body.querySelector('iframe')).toBeNull();
    const link = body.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(body.textContent).toContain('This URL is not from a supported embed provider');
  });

  it('a Twitter url falls through to the fallback (widget flow out of scope)', async () => {
    const body = await render({ url: 'https://twitter.com/user/status/123' });
    expect(body.querySelector('iframe')).toBeNull();
  });

  it('root is the only declared part -- the iframe carries no data-part', async () => {
    const body = await render({ url: YOUTUBE });
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render({ url: YOUTUBE, title: 'A titled frame' });
    // iframes:false: happy-dom cannot proxy INTO a real remote frame; the
    // frame-title check still runs on the iframe element in the parent.
    const results = await axe(body, { iframes: false });
    expect(results.violations).toEqual([]);
  });
});
