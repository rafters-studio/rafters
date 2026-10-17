import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/select/select.element';

const scenes: ReadonlyArray<[string, string, boolean]> = [
  ['closed', '', false],
  ['open', '', true],
  ['with a selection', 'value="b"', false],
  ['disabled', 'disabled', false],
];

for (const [name, attrs, open] of scenes) {
  test(`select.element ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>
      <rafters-select name="fruit" ${attrs}>
        <button data-part="trigger" aria-label="Fruit">
          <span data-part="value" placeholder="Pick"></span>
        </button>
        <div data-part="content">
          <div data-part="item" value="a">Apple</div>
          <div data-part="item" value="b">Banana</div>
          <div data-part="item" value="c" disabled>Cherry</div>
        </div>
      </rafters-select>
    </main>`;
    await Promise.resolve();
    if (open) {
      const trigger = document.querySelector<HTMLElement>('[data-part="trigger"]');
      if (!trigger) throw new Error('missing trigger');
      await userEvent.click(trigger);
    }
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
