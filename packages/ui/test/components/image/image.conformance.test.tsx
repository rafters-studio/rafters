import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Image } from '../../../src/components/image/image';
import { image, type ImageConfig } from '../../../src/components/image/image.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('image conformance [react]', () => {
  it('loaded: a figure/img contract fulfilled against real DOM, no overlay', async () => {
    const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loaded' };
    render(
      <main>
        <Image src="https://example.com/photo.jpg" alt="A sunset over the ocean" />
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    expect(root.tagName).toBe('FIGURE');
    const img = partElement(root, 'img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('A sunset over the ocean');
    expect(img.hasAttribute('aria-busy')).toBe(false);
    expect(partElement(root, 'status')).toBeNull();
    assertContractFulfillment(image, root, {}, config, ['root', 'frame', 'img']);
    await assertAxeClean(body());
  });

  it('loading: the img is aria-busy and a polite status overlay announces', async () => {
    const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loading' };
    render(
      <main>
        <Image src="https://example.com/photo.jpg" alt="Loading photo" status="loading" />
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    const img = partElement(root, 'img') as HTMLElement;
    expect(img.getAttribute('aria-busy')).toBe('true');
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('Loading image');
    assertContractFulfillment(image, root, {}, config, ['root', 'frame', 'img', 'status']);
    await assertAxeClean(body());
  });

  it('error: an assertive alert overlay carries the message', async () => {
    const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'error' };
    render(
      <main>
        <Image src="https://example.com/broken.jpg" alt="Broken" status="error" />
      </main>,
    );
    const root = partElement(body(), 'root') as HTMLElement;
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent).toBe('Failed to load image');
    assertContractFulfillment(image, root, {}, config, ['root', 'frame', 'img', 'status']);
    await assertAxeClean(body());
  });

  it('the img onError flips the runtime status to error (React owns the lifecycle)', () => {
    render(<Image src="https://example.com/broken.jpg" alt="Broken" />);
    const root = partElement(body(), 'root') as HTMLElement;
    expect(partElement(root, 'status')).toBeNull();
    const img = partElement(root, 'img') as HTMLImageElement;
    fireEvent.error(img);
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent).toBe('Failed to load image');
  });

  it('renders a figcaption when a caption is supplied', () => {
    render(<Image src="https://example.com/photo.jpg" alt="Photo" caption="Photo by John Doe" />);
    const root = partElement(body(), 'root') as HTMLElement;
    const caption = partElement(root, 'caption') as HTMLElement;
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption.textContent).toBe('Photo by John Doe');
  });

  it('a custom error message overrides the default', () => {
    render(
      <Image src="https://example.com/x.jpg" alt="X" status="error" errorMessage="Unavailable" />,
    );
    const status = partElement(body(), 'status') as HTMLElement;
    expect(status.textContent).toBe('Unavailable');
  });
});
