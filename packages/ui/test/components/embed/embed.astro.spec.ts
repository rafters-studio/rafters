/**
 * Ported conformance for Embed, Astro target. Embed is a PURE STATIC -- the
 * score projects no ARIA, holds no state, runs no effects -- so its Astro
 * file ships NO <script> and there is NO bindEmbed. This renders the server
 * markup and asserts the one contract: the root frame/fallback, the iframe
 * security attributes verbatim, and that a disallowed host never reaches an
 * iframe. One score, three performances; here it is markup + classes.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, test, vi } from 'vitest';
import Embed from '../../../src/components/embed/embed.astro';
import { IFRAME_ALLOW, IFRAME_REFERRER_POLICY } from '../../../src/components/embed/embed.behavior';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Embed, { props });
  // An embed is a frame, not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

test('renders an iframe root to the nocookie host with the security attributes', async () => {
  const body = await render({ url: YOUTUBE, title: 'Intro' });
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
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

test('projects no aria: the root is a pure static frame (no role)', async () => {
  const body = await render({ url: YOUTUBE });
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.getAttribute('role')).toBeNull();
});

test('applies the aspect ratio as an inline style', async () => {
  const body = await render({ url: YOUTUBE, aspectRatio: '1:1' });
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.getAttribute('style')).toContain('aspect-ratio: 1 / 1');
});

test('a default title falls back to "{provider} embed"', async () => {
  const body = await render({ url: YOUTUBE });
  expect((body.querySelector('iframe') as HTMLIFrameElement).getAttribute('title')).toBe(
    'youtube embed',
  );
});

test('a disallowed host renders the fallback with a recovery link -- never an iframe', async () => {
  const body = await render({ url: 'https://evil.com/watch?v=x' });
  expect(body.querySelector('iframe')).toBeNull();
  const link = body.querySelector('a') as HTMLAnchorElement;
  expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(body.textContent).toContain('This URL is not from a supported embed provider');
});

test('a Twitter url falls through to the fallback (widget flow out of scope)', async () => {
  const body = await render({ url: 'https://twitter.com/user/status/123' });
  expect(body.querySelector('iframe')).toBeNull();
});

test('root is the only declared part -- the iframe carries no data-part', async () => {
  const body = await render({ url: YOUTUBE });
  expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
});

test('consumer class is discarded silently -- not merged onto the iframe root or fallback', async () => {
  const warn = vi.spyOn(console, 'warn');
  const error = vi.spyOn(console, 'error');
  const iframeRoot = (await render({ url: YOUTUBE, class: 'mt-4' })).querySelector(
    '[data-part="root"]',
  ) as HTMLElement;
  expect(iframeRoot.className).toContain('relative');
  expect(iframeRoot.className).not.toContain('mt-4');

  const fallbackRoot = (
    await render({ url: 'https://evil.com/watch?v=x', class: 'mt-4' })
  ).querySelector('[data-part="root"]') as HTMLElement;
  expect(fallbackRoot.className).not.toContain('mt-4');

  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});
