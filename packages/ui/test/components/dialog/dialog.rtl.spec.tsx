/**
 * Dialog on a `dir="rtl"` page (#2459): the close button sits at the left edge.
 *
 * The browser project loads no compiled Tailwind, so this declares only the
 * rules the close button's classes name (absolute, logical `end-2`). The
 * panel is the positioned ancestor.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../src/components/dialog/dialog';

const STYLE = `
[data-part="content"] { position: fixed; top: 0; inset-inline-start: 0; width: 400px; height: 200px; }
.absolute { position: absolute; }
.end-2 { inset-inline-end: 0.5rem; }
.top-2 { top: 0.5rem; }
`;

function mountDialog(dir: 'ltr' | 'rtl'): { content: HTMLElement; close: HTMLElement } {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);
  document.documentElement.setAttribute('dir', dir);
  render(
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Adjust your preferences.</DialogDescription>
      </DialogContent>
    </Dialog>,
  );
  return {
    content: document.querySelector('[data-part="content"]') as HTMLElement,
    close: document.querySelector('[data-part="close"]') as HTMLElement,
  };
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll('style')) style.remove();
});

describe('dialog [rtl]', () => {
  it('ltr: the close button is nearer the right edge', () => {
    const { content, close } = mountDialog('ltr');
    const c = content.getBoundingClientRect();
    const b = close.getBoundingClientRect();
    expect(c.right - b.right).toBeLessThan(b.left - c.left);
  });

  it('rtl: the close button is nearer the left edge', () => {
    const { content, close } = mountDialog('rtl');
    const c = content.getBoundingClientRect();
    const b = close.getBoundingClientRect();
    expect(b.left - c.left).toBeLessThan(c.right - b.right);
  });
});
