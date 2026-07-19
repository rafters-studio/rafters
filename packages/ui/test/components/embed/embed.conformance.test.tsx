import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Embed } from '../../../src/components/embed/embed';
import {
  embed,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
} from '../../../src/components/embed/embed.behavior';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

afterEach(() => {
  cleanup();
});

describe('embed conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(<Embed url={YOUTUBE} title="Intro" />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(embed, root, {}, { url: YOUTUBE }, ['root']);
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('renders an iframe to the nocookie host with the security attributes verbatim', () => {
    render(<Embed url={YOUTUBE} title="Intro video" />);
    const iframe = body().querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe.getAttribute('title')).toBe('Intro video');
    expect(iframe.getAttribute('allow')).toBe(IFRAME_ALLOW);
    expect(iframe.getAttribute('referrerpolicy')).toBe(IFRAME_REFERRER_POLICY);
    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('applies the aspect ratio as the one inline style channel', () => {
    render(<Embed url={YOUTUBE} aspectRatio="4:3" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.style.aspectRatio).toBe('4 / 3');
    expect(root.className).toContain('relative');
  });

  it('a default title falls back to "{provider} embed"', () => {
    render(<Embed url={YOUTUBE} />);
    expect((body().querySelector('iframe') as HTMLIFrameElement).getAttribute('title')).toBe(
      'youtube embed',
    );
  });

  it('a disallowed URL renders the recovery fallback -- never an iframe', () => {
    render(<Embed url="https://evil.com/watch?v=x" />);
    expect(body().querySelector('iframe')).toBeNull();
    const link = body().querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(body().textContent).toContain('This URL is not from a supported embed provider');
  });

  it('a Twitter URL falls through to the fallback (widget flow out of scope)', () => {
    render(<Embed url="https://twitter.com/user/status/123" />);
    expect(body().querySelector('iframe')).toBeNull();
  });

  it('consumer className merges via classy', () => {
    render(<Embed url={YOUTUBE} className="mt-4" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('mt-4');
  });

  it('only root is a declared part -- the iframe carries no data-part', () => {
    render(<Embed url={YOUTUBE} />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('is axe-clean for both the iframe and the fallback', async () => {
    render(
      <main>
        <Embed url={YOUTUBE} title="A titled frame" />
        <Embed url="https://evil.com/x" />
      </main>,
    );
    // iframes:false: the iframe's frame-title is still audited on the element
    // in the parent document; happy-dom cannot proxy INTO a real remote frame.
    const results = await axe(body(), { iframes: false });
    expect(results.violations).toEqual([]);
  });

  it('has no keyboard contract', () => {
    expect(embed.keymap({ key: 'Enter' }, {}, 'root', { url: YOUTUBE })).toBeNull();
  });
});
