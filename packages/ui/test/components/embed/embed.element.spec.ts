/**
 * Ported conformance for Embed, Web Component target. Runs in the browser
 * project (real chromium). Embed is a pure static -- no controller to drive --
 * so this proves the one contract (root renders, empty aria projection,
 * security attributes verbatim, disallowed hosts never reach an iframe) holds
 * in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';
import { IFRAME_ALLOW, IFRAME_REFERRER_POLICY } from '../../../src/components/embed/embed.behavior';
import { RaftersEmbed } from '../../../src/components/embed/embed.element';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

beforeAll(() => {
  if (!customElements.get('rafters-embed')) {
    customElements.define('rafters-embed', RaftersEmbed);
  }
});

function mount(attrs = ''): HTMLElement {
  document.body.innerHTML = `<rafters-embed ${attrs}></rafters-embed>`;
  return document.body.querySelector('rafters-embed') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('renders an iframe root to the nocookie host with the security attributes', () => {
  const host = mount(`url="${YOUTUBE}" title="Intro"`);
  const root = shadowRoot(host);
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

test('fulfills the contract: root projects no aria (empty, like React)', () => {
  const host = mount(`url="${YOUTUBE}"`);
  const root = shadowRoot(host);
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.getAttribute('role')).toBeNull();
});

test('applies the aspect ratio as an inline style', () => {
  const host = mount(`url="${YOUTUBE}" aspect-ratio="9:16"`);
  expect(shadowRoot(host).style.aspectRatio).toBe('9 / 16');
});

test('a missing url renders the fallback with no recovery link', () => {
  const host = mount('');
  const root = shadowRoot(host);
  expect(root.querySelector('iframe')).toBeNull();
  expect(root.textContent).toContain('No URL provided');
  expect(root.querySelector('a')).toBeNull();
});

test('a disallowed host renders the fallback with a recovery link -- never an iframe', () => {
  const host = mount('url="https://evil.com/watch?v=x"');
  const root = shadowRoot(host);
  expect(root.querySelector('iframe')).toBeNull();
  const link = root.querySelector('a') as HTMLAnchorElement;
  expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
});

test('a Twitter url falls through to the fallback (widget flow out of scope)', () => {
  const host = mount('url="https://twitter.com/user/status/123"');
  expect(shadowRoot(host).querySelector('iframe')).toBeNull();
});

test('re-renders when the url attribute changes after connect', () => {
  const host = mount('url="https://evil.com/x"');
  expect(shadowRoot(host).querySelector('iframe')).toBeNull();
  host.setAttribute('url', YOUTUBE);
  expect(shadowRoot(host).querySelector('iframe')).not.toBeNull();
});

test('only root is a declared part -- the iframe carries no data-part', () => {
  const host = mount(`url="${YOUTUBE}"`);
  const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
  expect(parts).toHaveLength(1);
});
