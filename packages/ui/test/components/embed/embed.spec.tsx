/**
 * Ported conformance for Embed, React target. Runs in the browser project
 * (real chromium): Embed is a pure static -- no state, no keymap, and an
 * empty aria projection, since the iframe's own `title` (content, not a
 * projection) is the whole accessible contract.
 */
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { Embed } from '../../../src/components/embed/embed';
import {
  embed,
  IFRAME_ALLOW,
  IFRAME_REFERRER_POLICY,
} from '../../../src/components/embed/embed.behavior';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('fulfills the contract: root renders and projects no aria', async () => {
  const { container } = await render(<Embed url={YOUTUBE} title="Intro" />);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.getAttribute('role')).toBeNull();
  expect(root.getAttribute('aria-label')).toBeNull();
});

test('renders an iframe to the nocookie host with the security attributes verbatim', async () => {
  const { container } = await render(<Embed url={YOUTUBE} title="Intro video" />);
  const iframe = container.querySelector('iframe') as HTMLIFrameElement;
  expect(iframe).not.toBeNull();
  expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  expect(iframe.getAttribute('title')).toBe('Intro video');
  expect(iframe.getAttribute('allow')).toBe(IFRAME_ALLOW);
  expect(iframe.getAttribute('referrerpolicy')).toBe(IFRAME_REFERRER_POLICY);
  expect(iframe.getAttribute('loading')).toBe('lazy');
  expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
});

test('applies the aspect ratio as the one inline style channel', async () => {
  const { container } = await render(<Embed url={YOUTUBE} aspectRatio="4:3" />);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.style.aspectRatio).toBe('4 / 3');
  expect(root.className).toContain('relative');
});

test('a default title falls back to "{provider} embed"', async () => {
  const { container } = await render(<Embed url={YOUTUBE} />);
  expect((container.querySelector('iframe') as HTMLIFrameElement).getAttribute('title')).toBe(
    'youtube embed',
  );
});

test('a disallowed URL renders the recovery fallback -- never an iframe', async () => {
  const { container } = await render(<Embed url="https://evil.com/watch?v=x" />);
  expect(container.querySelector('iframe')).toBeNull();
  const link = container.querySelector('a') as HTMLAnchorElement;
  expect(link.getAttribute('href')).toBe('https://evil.com/watch?v=x');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(container.textContent).toContain('This URL is not from a supported embed provider');
});

test('a Twitter URL falls through to the fallback (widget flow out of scope)', async () => {
  const { container } = await render(<Embed url="https://twitter.com/user/status/123" />);
  expect(container.querySelector('iframe')).toBeNull();
});

test('consumer className merges via classy', async () => {
  const { container } = await render(<Embed url={YOUTUBE} className="mt-4" />);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.className).toContain('rounded-lg');
  expect(root.className).toContain('mt-4');
});

test('only root is a declared part -- the iframe carries no data-part', async () => {
  const { container } = await render(<Embed url={YOUTUBE} />);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.getAttribute('data-part')).toBe('root');
  expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
});

test('has no keyboard contract', () => {
  expect(embed.keymap({ key: 'Enter' }, {}, 'root', { url: YOUTUBE })).toBeNull();
});
