import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/components/avatar/avatar';
import { avatar } from '../../../src/components/avatar/avatar.behavior';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

describe('avatar conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/user.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(avatar, root, {}, { size: 'md', status: 'loading' }, ['root']);
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('shows both image and fallback while loading', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/user.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(partElement(container, 'image')).not.toBeNull();
    expect(partElement(container, 'fallback')).not.toBeNull();
  });

  it('a loaded image yields the fallback (fallback removed)', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/user.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const image = partElement(container, 'image') as HTMLImageElement;
    fireEvent.load(image);
    expect(partElement(container, 'image')).not.toBeNull();
    expect(partElement(container, 'fallback')).toBeNull();
  });

  it('a failed image is removed and the fallback shows the initials', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/missing.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const image = partElement(container, 'image') as HTMLImageElement;
    fireEvent.error(image);
    expect(partElement(container, 'image')).toBeNull();
    const fallback = partElement(container, 'fallback') as HTMLElement;
    expect(fallback).not.toBeNull();
    expect(fallback.textContent).toBe('JD');
  });

  it('reports each load status through onLoadingStatusChange (shadcn parity)', () => {
    const seen: string[] = [];
    const { container } = render(
      <Avatar>
        <AvatarImage src="/user.jpg" alt="Jane Doe" onLoadingStatusChange={(s) => seen.push(s)} />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const image = partElement(container, 'image') as HTMLImageElement;
    fireEvent.error(image);
    expect(seen).toContain('loading');
    expect(seen).toContain('error');
  });

  it('the size prop drives the root sizing token', () => {
    const { container } = render(
      <Avatar size="xl">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('h-16 w-16');
  });

  it('consumer className merges via classy', () => {
    const { container } = render(
      <Avatar className="ring-2">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('rounded-full');
    expect(root.className).toContain('ring-2');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(avatar.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
