/**
 * Spec for Embed, Web Component target. Runs in the browser project (real
 * chromium). Embed is a pure static -- no controller to drive -- so this proves
 * the one contract (the descriptor resolveEmbed returns is what renders, exact
 * classes and security attributes, one declared part, no ARIA) holds in the
 * shadow-DOM performance.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';
import {
  FALLBACK_LINK_TEXT,
  FALLBACK_MESSAGE_DISALLOWED_DOMAIN,
  FALLBACK_MESSAGE_MISSING_URL,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
  resolveEmbed,
} from '../../../src/components/embed/embed.behavior';
import {
  embedContainerClasses,
  embedFallbackClasses,
  embedFallbackLinkClasses,
  embedFallbackMessageClasses,
  embedIframeClasses,
} from '../../../src/components/embed/embed.classes';
import { RaftersEmbed } from '../../../src/components/embed/embed.element';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

beforeAll(() => {
  if (!customElements.get('rafters-embed')) {
    customElements.define('rafters-embed', RaftersEmbed);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(attrs: string): RaftersEmbed {
  document.body.innerHTML = `<rafters-embed ${attrs}></rafters-embed>`;
  return document.querySelector('rafters-embed') as RaftersEmbed;
}

function rootOf(host: RaftersEmbed): HTMLElement {
  return host.shadowRoot?.querySelector('[data-part="root"]') as HTMLElement;
}

test('iframe descriptor renders exactly, then the fallback after the url changes', () => {
  const host = mount(`url="${url}" aspect-ratio="4:3" provider="vimeo"`);
  const root = rootOf(host);
  const d = resolveEmbed({ url, aspectRatio: '4:3', provider: 'vimeo' });
  if (d.kind !== 'iframe') throw new Error('expected iframe');
  expect(root.className).toBe(embedContainerClasses);
  expect(root.style.aspectRatio).toBe(d.aspectRatio);
  const iframe = root.querySelector('iframe') as HTMLIFrameElement;
  expect(iframe.getAttribute('src')).toBe(d.src);
  expect(iframe.getAttribute('title')).toBe('vimeo embed');
  expect(iframe.getAttribute('class')).toBe(embedIframeClasses);
  expect(iframe.getAttribute('allow')).toBe(IFRAME_ALLOW);
  expect(iframe.getAttribute('referrerpolicy')).toBe(IFRAME_REFERRER_POLICY);
  expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  expect(iframe.getAttribute('loading')).toBe('lazy');

  host.setAttribute('url', 'https://evil.example/x');
  const fb = rootOf(host);
  expect(fb.querySelector('iframe')).toBeNull();
  const p = fb.querySelector('p') as HTMLParagraphElement;
  expect(p.className).toBe(embedFallbackMessageClasses);
  expect(p.textContent).toBe(FALLBACK_MESSAGE_DISALLOWED_DOMAIN);
  expect(fb.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
});

test('youtube url with 4:3 gives the nocookie src, default title and 4 / 3', () => {
  const host = mount(`url="${url}" aspect-ratio="4:3"`);
  const root = rootOf(host);
  const iframe = root.querySelector('iframe') as HTMLIFrameElement;
  expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  expect(iframe.getAttribute('title')).toBe('youtube embed');
  expect(root.style.aspectRatio).toBe('4 / 3');
});

test('title attribute is forwarded to the iframe', () => {
  const host = mount(`url="${url}" title="Intro"`);
  expect(rootOf(host).querySelector('iframe')?.getAttribute('title')).toBe('Intro');
});

test('disallowed host renders the fallback root, message and recovery link', () => {
  const host = mount('url="https://evil.example/x"');
  const root = rootOf(host);
  expect(root.className).toBe(embedFallbackClasses);
  expect(root.querySelector('iframe')).toBeNull();
  expect(root.querySelector('p')?.textContent).toBe(FALLBACK_MESSAGE_DISALLOWED_DOMAIN);
  const link = root.querySelector('a') as HTMLAnchorElement;
  expect(link.getAttribute('href')).toBe('https://evil.example/x');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.getAttribute('class')).toBe(embedFallbackLinkClasses);
  expect(link.textContent).toBe(FALLBACK_LINK_TEXT);
});

test('a javascript: url renders no link', () => {
  const host = mount('url="javascript:alert(1)"');
  expect(rootOf(host).querySelector('a')).toBeNull();
});

test('missing url renders the missing-url message and no link', () => {
  const host = mount('');
  const root = rootOf(host);
  expect(root.querySelector('iframe')).toBeNull();
  expect(root.querySelector('p')?.textContent).toBe(FALLBACK_MESSAGE_MISSING_URL);
  expect(root.querySelector('a')).toBeNull();
});

test('twitter url falls back without an iframe', () => {
  const host = mount('url="https://twitter.com/user/status/123"');
  expect(rootOf(host).querySelector('iframe')).toBeNull();
});

test('provider overrides only the title, never the src', () => {
  const host = mount(`url="${url}" provider="vimeo"`);
  const iframe = rootOf(host).querySelector('iframe') as HTMLIFrameElement;
  expect(iframe.getAttribute('title')).toBe('vimeo embed');
  expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});

test('an unknown aspect-ratio falls back to 16 / 9', () => {
  const host = mount(`url="${url}" aspect-ratio="7:3"`);
  expect(rootOf(host).style.aspectRatio).toBe('16 / 9');
});

test('changing aspect-ratio re-renders', () => {
  const host = mount(`url="${url}"`);
  host.setAttribute('aspect-ratio', '1:1');
  expect(rootOf(host).style.aspectRatio).toBe('1 / 1');
});

test('only root is a declared part and it has no role', () => {
  const host = mount(`url="${url}"`);
  expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
  expect(rootOf(host).hasAttribute('role')).toBe(false);
});
