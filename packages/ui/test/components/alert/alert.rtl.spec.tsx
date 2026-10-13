/**
 * Alert on a `dir="rtl"` page (#2459): the icon sits on the right of its text.
 *
 * The browser project loads no compiled Tailwind, so this declares only the
 * rules the alert's classes name (grid, the named menu-row track list, column
 * starts, logical end margin). The point is that those rules, with no
 * direction class anywhere, mirror when the page direction flips.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '../../../src/components/alert/alert';

const STYLE = `
.grid { display: grid; }
.grid-cols-menu-row { grid-template-columns: auto auto 1fr auto; }
.col-start-2 { grid-column-start: 2; }
.col-start-3 { grid-column-start: 3; }
.row-start-1 { grid-row-start: 1; }
.row-span-2 { grid-row: span 2; }
.me-3 { margin-inline-end: 0.75rem; }
`;

function mountAlert(dir: 'ltr' | 'rtl'): { svg: SVGElement; title: HTMLElement } {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);
  const host = document.createElement('div');
  host.setAttribute('dir', dir);
  host.style.width = '400px';
  document.body.append(host);
  render(
    <Alert>
      <svg aria-hidden="true" width="16" height="16" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>Something changed.</AlertDescription>
    </Alert>,
    { container: host },
  );
  return {
    svg: host.querySelector('svg') as SVGElement,
    title: host.querySelector('h5') as HTMLElement,
  };
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll('style')) style.remove();
});

describe('alert [rtl]', () => {
  it('ltr: the icon is left of the title', () => {
    const { svg, title } = mountAlert('ltr');
    expect(svg.getBoundingClientRect().left).toBeLessThan(title.getBoundingClientRect().left);
  });

  it('rtl: the icon is right of the title', () => {
    const { svg, title } = mountAlert('rtl');
    expect(svg.getBoundingClientRect().left).toBeGreaterThan(title.getBoundingClientRect().left);
  });
});
