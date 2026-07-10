/**
 * WC render adapter + the shared dialog conformance suite. Importing
 * dialog.element.ts registers <rafters-dialog> idempotently (guarded
 * internally). `host` doubles as the harness's `root`: dialog has no
 * single container node the way Grid/Container's `root` part does (see
 * conformance-suite.ts's header).
 */
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/dialog/dialog.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runDialogConformance,
  type DialogAdapter,
  type DialogScenarioProps,
} from './conformance-suite';

function renderDialog(props: DialogScenarioProps): RenderResult {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const element = document.createElement('rafters-dialog');
  if (props.defaultOpen) element.setAttribute('default-open', '');
  if (props.modal === false) element.setAttribute('modal', 'false');

  const trigger = document.createElement('button');
  trigger.setAttribute('data-part', 'trigger');
  trigger.textContent = 'Open settings';
  element.appendChild(trigger);

  const content = document.createElement('div');
  content.setAttribute('data-part', 'content');

  const title = document.createElement('h2');
  title.setAttribute('data-part', 'title');
  title.textContent = 'Settings';
  content.appendChild(title);

  if (props.withDescription !== false) {
    const description = document.createElement('p');
    description.setAttribute('data-part', 'description');
    description.textContent = 'Adjust your preferences.';
    content.appendChild(description);
  }

  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = 'Save';
  content.appendChild(save);

  element.appendChild(content);
  host.appendChild(element);

  return { host, root: host, cleanup: () => host.remove() };
}

const wcAdapter: DialogAdapter = {
  name: 'wc',
  render: renderDialog,
};

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.overflow = '';
});

runDialogConformance(wcAdapter);

describe('dialog conformance [wc] framework-specific', () => {
  it('reopening reuses the already-mounted content node (idempotent mount)', () => {
    const result = renderDialog({});
    const dialogEl = result.host.querySelector('rafters-dialog') as HTMLElement;
    const trigger = dialogEl.querySelector('[data-part="trigger"]') as HTMLElement;
    trigger.click();
    const contentFirstOpen = dialogEl.querySelector('[data-part="content"]');
    trigger.click();
    trigger.click();
    const contentSecondOpen = dialogEl.querySelector('[data-part="content"]');
    expect(contentSecondOpen).toBe(contentFirstOpen);
    result.cleanup();
  });

  it('modal attribute change while open adds/removes the overlay live', () => {
    const result = renderDialog({ defaultOpen: true });
    const dialogEl = result.host.querySelector('rafters-dialog') as HTMLElement;
    expect(dialogEl.querySelector('[data-part="overlay"]')).not.toBeNull();
    dialogEl.setAttribute('modal', 'false');
    expect(dialogEl.querySelector('[data-part="overlay"]')).toBeNull();
    dialogEl.removeAttribute('modal');
    expect(dialogEl.querySelector('[data-part="overlay"]')).not.toBeNull();
    result.cleanup();
  });
});
