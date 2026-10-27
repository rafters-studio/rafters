/**
 * Browser-project performance of the Label score (React target). Label is a
 * pure static -- the score projects no ARIA, holds no state -- so the whole
 * contract is: the root renders a real <label>, the native `for`/`htmlFor`
 * association passes straight through, and the variant selects a colour role
 * token.
 */
import * as React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import { Label } from '../../../src/components/label/label';
import { label } from '../../../src/components/label/label.behavior';
import { labelClasses } from '../../../src/components/label/label.classes';
import { RadioGroup, RadioGroupItem } from '../../../src/components/radio-group/radio-group';
import { Switch } from '../../../src/components/switch/switch';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

afterEach(async () => {
  await cleanup();
});

function rootOf(container: HTMLElement): HTMLLabelElement {
  return container.querySelector('[data-part="root"]') as HTMLLabelElement;
}

describe('label [react]', () => {
  it('renders a <label> root and projects NO ARIA', async () => {
    const { container } = await render(<Label>Email</Label>);
    const root = rootOf(container);
    expect(root.tagName.toLowerCase()).toBe('label');
    // The empty projection means no role/aria-* leaks onto the label.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('htmlFor passes through as the native `for` association attribute', async () => {
    const { container } = await render(<Label htmlFor="email">Email</Label>);
    const root = rootOf(container);
    // The association is native: the score adds no logic, htmlFor -> for.
    expect(root.getAttribute('for')).toBe('email');
    expect(root.htmlFor).toBe('email');
  });

  it('variant selects the semantic colour role token', async () => {
    const { container } = await render(<Label variant="destructive">Name is required</Label>);
    const root = rootOf(container);
    expect(root.className).toContain('text-destructive');
    expect(root.className).toContain('ts-label-medium');
  });

  it('defaults to the foreground variant when none is given', async () => {
    const { container } = await render(<Label>Plain</Label>);
    expect(rootOf(container).className).toContain('text-foreground');
  });

  it('consumer className merges via classy', async () => {
    const { container } = await render(<Label className="mb-2">x</Label>);
    const root = rootOf(container);
    expect(root.className).toContain('leading-none');
    expect(root.className).toContain('mb-2');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; a label is not interactive.
    expect(label.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});

/**
 * #2656: the wrapping composition label.md names
 * (`<Label htmlFor="x"><Control id="x" /> Text</Label>`). The test page loads
 * no compiled Tailwind sheet, so the sheet for the label's own classes is
 * compiled server side (test/browser/compile-css.command.ts) and injected;
 * computed style then reflects exactly what labelClasses emits.
 */
describe('label [react] -- dims around a wrapped disabled control (#2656)', () => {
  let sheet: HTMLStyleElement | undefined;

  beforeAll(async () => {
    const css = await commands.compileCss(labelClasses({}, {}).root);
    sheet = document.createElement('style');
    sheet.textContent = css;
    document.head.append(sheet);
  }, 30000);

  afterAll(() => {
    sheet?.remove();
  });

  function labelOf(el: Element): HTMLLabelElement {
    const found = el.closest('label');
    if (!found) throw new Error('text is not inside a <label>');
    return found;
  }

  async function styleOf(ui: React.ReactElement, text: string): Promise<CSSStyleDeclaration> {
    const screen = await render(ui);
    const el = screen.getByText(text).element();
    return getComputedStyle(labelOf(el));
  }

  function expectDimmed(style: CSSStyleDeclaration): void {
    expect(style.opacity).toBe('0.7');
    expect(style.cursor).toBe('not-allowed');
  }

  function expectFull(style: CSSStyleDeclaration): void {
    expect(style.opacity).toBe('1');
    expect(style.cursor).not.toBe('not-allowed');
  }

  it('dims a Label wrapping a disabled RadioGroupItem', async () => {
    expectDimmed(
      await styleOf(
        <RadioGroup defaultValue="pro">
          <Label htmlFor="ent">
            <RadioGroupItem id="ent" value="ent" disabled /> Enterprise
          </Label>
        </RadioGroup>,
        'Enterprise',
      ),
    );
  });

  it('dims the Label of each item of a <RadioGroup disabled>', async () => {
    const screen = await render(
      <RadioGroup disabled defaultValue="card">
        <Label htmlFor="card">
          <RadioGroupItem id="card" value="card" /> Credit card
        </Label>
        <Label htmlFor="invoice">
          <RadioGroupItem id="invoice" value="invoice" /> Invoice
        </Label>
      </RadioGroup>,
    );
    for (const text of ['Credit card', 'Invoice']) {
      expectDimmed(getComputedStyle(labelOf(screen.getByText(text).element())));
    }
  });

  it('dims only the disabled item of a mixed RadioGroup (the Plans preview)', async () => {
    const screen = await render(
      <RadioGroup defaultValue="pro">
        <Label htmlFor="free">
          <RadioGroupItem id="free" value="free" /> Free
        </Label>
        <Label htmlFor="pro2">
          <RadioGroupItem id="pro2" value="pro2" /> Pro plan
        </Label>
        <Label htmlFor="ent2">
          <RadioGroupItem id="ent2" value="ent2" disabled /> Enterprise plan
        </Label>
      </RadioGroup>,
    );
    expectDimmed(getComputedStyle(labelOf(screen.getByText('Enterprise plan').element())));
    for (const text of ['Free', 'Pro plan']) {
      expectFull(getComputedStyle(labelOf(screen.getByText(text).element())));
    }
  });

  it('dims a Label wrapping a disabled Switch', async () => {
    expectDimmed(
      await styleOf(
        <Label htmlFor="sw">
          <Switch id="sw" disabled defaultChecked /> Audit log
        </Label>,
        'Audit log',
      ),
    );
  });

  it('does not dim a Label wrapping an enabled RadioGroupItem or Switch', async () => {
    const screen = await render(
      <>
        <RadioGroup defaultValue="pro">
          <Label htmlFor="pro">
            <RadioGroupItem id="pro" value="pro" /> Pro
          </Label>
        </RadioGroup>
        <Label htmlFor="sw2">
          <Switch id="sw2" /> Marketing
        </Label>
      </>,
    );
    for (const text of ['Pro', 'Marketing']) {
      expectFull(getComputedStyle(labelOf(screen.getByText(text).element())));
    }
  });

  it('keeps the native for/id association', async () => {
    const screen = await render(
      <Label htmlFor="sw3">
        <Switch id="sw3" disabled /> Locked
      </Label>,
    );
    const lbl = labelOf(screen.getByText('Locked').element());
    expect(lbl.htmlFor).toBe('sw3');
    expect(lbl.control?.id).toBe('sw3');
  });
});
