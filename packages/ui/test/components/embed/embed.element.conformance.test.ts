/**
 * Web Component performance of the Embed score. The SAME score as the React
 * conformance test -- but Embed is a pure static, so there is no controller to
 * drive. The WC renders the frame or fallback markup from the shared resolver
 * and re-renders on attribute change. These assertions prove the one contract
 * (root renders, empty projection, security attributes verbatim, disallowed
 * hosts never reach an iframe) holds in the shadow-DOM performance too.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  embed,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
} from '../../../src/components/embed/embed.behavior';
import { RaftersEmbed } from '../../../src/components/embed/embed.element';
import { assertContractFulfillment } from '../../harness/conformance';

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

describe('embed conformance [wc]', () => {
  it('renders an iframe root to the nocookie host with the security attributes', () => {
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

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount(`url="${YOUTUBE}"`);
    const root = shadowRoot(host);
    assertContractFulfillment(embed, root, {}, { url: YOUTUBE }, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('applies the aspect ratio as an inline style', () => {
    const host = mount(`url="${YOUTUBE}" aspect-ratio="9:16"`);
    expect(shadowRoot(host).style.aspectRatio).toBe('9 / 16');
  });

  it('a missing url renders the fallback with no recovery link', () => {
    const host = mount('');
    const root = shadowRoot(host);
    expect(root.querySelector('iframe')).toBeNull();
    expect(root.textContent).toContain('No URL provided');
    expect(root.querySelector('a')).toBeNull();
  });

  it('a disallowed host renders the fallback with a recovery link -- never an iframe', () => {
    const host = mount('url="https://evil.com/watch?v=x"');
    const root = shadowRoot(host);
    expect(root.querySelector('iframe')).toBeNull();
    const link = root.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('a Twitter url falls through to the fallback (widget flow out of scope)', () => {
    const host = mount('url="https://twitter.com/user/status/123"');
    expect(shadowRoot(host).querySelector('iframe')).toBeNull();
  });

  it('re-renders when the url attribute changes after connect', () => {
    const host = mount('url="https://evil.com/x"');
    expect(shadowRoot(host).querySelector('iframe')).toBeNull();
    host.setAttribute('url', YOUTUBE);
    expect(shadowRoot(host).querySelector('iframe')).not.toBeNull();
  });

  it('only root is a declared part -- the iframe carries no data-part', () => {
    const host = mount(`url="${YOUTUBE}"`);
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('is axe-clean for both the iframe and the fallback', async () => {
    document.body.innerHTML = `<main><rafters-embed url="${YOUTUBE}" title="A titled frame"></rafters-embed><rafters-embed url="https://evil.com/x"></rafters-embed></main>`;
    // iframes:false: happy-dom cannot proxy INTO a real remote frame; the
    // frame-title check still runs on the iframe element in the parent.
    const results = await axe(document.body, { iframes: false });
    expect(results.violations).toEqual([]);
  });
});
