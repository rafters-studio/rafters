/**
 * React performance of the spinner score. Spinner is a pure static -- no
 * state, no keymap -- so this is the aria + classes contract only.
 *
 * The compiled-CSS proof for #2155 (that the rendered class actually resolves
 * to a reduced-motion-exempt rule) lives in spinner.classes.test.ts instead of
 * here: it needs node:fs to shell a real Tailwind compile, which the browser
 * lane this file runs under cannot provide, and the assertion never actually
 * depended on React -- spinnerClasses() alone produces the class under test.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Spinner } from '../../../src/components/spinner/spinner';
import { spinner } from '../../../src/components/spinner/spinner.behavior';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('spinner [react]', () => {
  it('fulfills the contract: root renders and projects aria-label="Loading"', () => {
    const { container } = render(<Spinner />);
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('no [data-part="root"] rendered');
    const projection = spinner.aria({}, {}, { root: root.id })['root'];
    for (const [attr, value] of Object.entries(projection ?? {})) {
      if (value === undefined) {
        expect(root.hasAttribute(attr), `root must NOT render ${attr}`).toBe(false);
      } else {
        expect(root.getAttribute(attr), `root ${attr}`).toBe(String(value));
      }
    }
    // role=status is native to <output>; the score states no explicit role.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.tagName.toLowerCase()).toBe('output');
    expect(root.getAttribute('aria-label')).toBe('Loading');
  });

  it('carries the spinning ring cell utility and drops motion-reduce:animate-none (#2155)', () => {
    // #2155: migrated off the stock animate-spin onto the busy cell's own
    // period utility; motion-reduce:animate-none is removed, not replaced.
    // This test owns only the class the component emits. Whether that class
    // actually compiles to a reduced-motion-exempt rule is proven below, in
    // 'compiles to a rule the reduced-motion law never reaches (#2155)',
    // against the real compiled CSS -- not by citation to another package's
    // test suite.
    render(<Spinner />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).not.toContain('motion-reduce:animate-none');
  });

  it('size and variant drive the class projection', () => {
    render(<Spinner size="lg" variant="destructive" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('h-8 w-8 border-3');
    expect(root.className).toContain('border-destructive border-r-transparent');
  });

  it('consumer className merges via classy', () => {
    render(<Spinner className="ml-2" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).toContain('ml-2');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(spinner.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
