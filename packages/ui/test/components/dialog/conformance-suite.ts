/**
 * Dialog conformance suite -- one suite, run per render adapter. Unlike
 * Grid/Container's static-score suites, this one drives real interaction
 * (click, Escape, Tab) via userEvent against REAL DOM nodes: both adapters
 * render trigger/content as genuine, connected, focusable elements (the
 * react performance portals to document.body; the WC performance mounts as
 * light-DOM children of the host, never inside a shadow root -- see
 * dialog.element.ts's class doc for why), so the same interaction
 * assertions run unmodified against either.
 *
 * `RenderResult.root` has no single meaning for a compound, none-of-its-
 * parts-share-a-container component the way it does for Grid/Container's
 * `root`; adapters pass the SAME node as both `host` and `root` -- the
 * scope every part query and axe run against.
 *
 * React-only scenarios (controlled/uncontrolled callbacks, explicit
 * DialogPortal composition, forceMount, the `container` prop, the
 * onEscapeKeyDown/onPointerDownOutside veto callbacks) stay in
 * dialog.conformance.test.tsx -- no WC counterpart exists (no consumer
 * prop/callback channel a custom element carries), documented in
 * dialog.element.ts's class doc and the port's commit message.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { dialog, type DialogConfig } from '../../../src/components/dialog/dialog.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  type RenderResult,
} from '../../harness/conformance';

export interface DialogScenarioProps {
  defaultOpen?: boolean;
  modal?: boolean;
  withDescription?: boolean;
}

export interface DialogAdapter {
  name: string;
  render(props: DialogScenarioProps): RenderResult | Promise<RenderResult>;
}

function configFor(props: DialogScenarioProps): DialogConfig {
  return { defaultOpen: props.defaultOpen, modal: props.modal };
}

export function runDialogConformance(adapter: DialogAdapter): void {
  describe(`dialog conformance [${adapter.name}]`, () => {
    it('closed: only the trigger renders, collapsed and axe-clean', async () => {
      const result = await adapter.render({});
      try {
        const trigger = partElement(result.host, 'trigger');
        expect(trigger).not.toBeNull();
        expect(partElement(result.host, 'content')).toBeNull();
        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
        expect(trigger?.hasAttribute('aria-controls')).toBe(false);
        await assertAxeClean(result.host);
      } finally {
        result.cleanup();
      }
    });

    it('open: every part renders and ARIA equals the projection', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        const config = configFor({});
        const state = { open: true };
        assertContractFulfillment(dialog, result.root, state, config, [
          'trigger',
          'content',
          'overlay',
          'title',
          'description',
          'close',
        ]);
        await assertAxeClean(result.host);
      } finally {
        result.cleanup();
      }
    });

    it('omitted description projects NO aria-describedby', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({ withDescription: false });
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        const content = partElement(result.host, 'content');
        expect(content?.hasAttribute('aria-describedby')).toBe(false);
        expect(content?.getAttribute('aria-labelledby')).toBeTruthy();
        await assertAxeClean(result.host);
      } finally {
        result.cleanup();
      }
    });

    it('trigger and content are wired by real DOM ids', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        const trigger = partElement(result.host, 'trigger');
        const content = partElement(result.host, 'content');
        const title = partElement(result.host, 'title');
        const description = partElement(result.host, 'description');
        expect(trigger?.getAttribute('aria-controls')).toBe(content?.id);
        expect(content?.getAttribute('aria-labelledby')).toBe(title?.id);
        expect(content?.getAttribute('aria-describedby')).toBe(description?.id);
      } finally {
        result.cleanup();
      }
    });

    it('focus moves into the dialog and Tab is trapped', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        const content = partElement(result.host, 'content') as HTMLElement;
        expect(content.contains(document.activeElement)).toBe(true);

        const focusable = Array.from(
          content.querySelectorAll<HTMLElement>('button:not([disabled])'),
        );
        for (let i = 0; i < focusable.length + 1; i += 1) {
          await user.tab();
          expect(content.contains(document.activeElement)).toBe(true);
        }
      } finally {
        result.cleanup();
      }
    });

    it('Escape closes and restores focus to the trigger', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        const trigger = partElement(result.host, 'trigger') as HTMLElement;
        await user.click(trigger);
        expect(partElement(result.host, 'content')).not.toBeNull();

        await user.keyboard('{Escape}');
        expect(partElement(result.host, 'content')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('pointerdown outside dismisses; on the trigger it toggles closed, not closed-then-open', async () => {
      const user = userEvent.setup();
      const elsewhere = document.createElement('button');
      elsewhere.type = 'button';
      elsewhere.textContent = 'Elsewhere';
      document.body.appendChild(elsewhere);
      const result = await adapter.render({});
      try {
        const trigger = partElement(result.host, 'trigger') as HTMLElement;

        await user.click(trigger);
        expect(partElement(result.host, 'content')).not.toBeNull();
        await user.click(elsewhere);
        expect(partElement(result.host, 'content')).toBeNull();

        await user.click(trigger);
        expect(partElement(result.host, 'content')).not.toBeNull();
        await user.click(trigger);
        expect(partElement(result.host, 'content')).toBeNull();
      } finally {
        result.cleanup();
        elsewhere.remove();
      }
    });

    it('close button closes', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        await user.click(partElement(result.host, 'close') as HTMLElement);
        expect(partElement(result.host, 'content')).toBeNull();
      } finally {
        result.cleanup();
      }
    });

    it('scroll is locked while open and released on close', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({});
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        expect(document.body.style.overflow).toBe('hidden');
        await user.keyboard('{Escape}');
        expect(document.body.style.overflow).not.toBe('hidden');
      } finally {
        result.cleanup();
      }
    });

    it('non-modal: no overlay, no trap, no scroll lock, Escape still works', async () => {
      const user = userEvent.setup();
      const result = await adapter.render({ modal: false });
      try {
        await user.click(partElement(result.host, 'trigger') as HTMLElement);
        expect(partElement(result.host, 'overlay')).toBeNull();
        expect(document.body.style.overflow).not.toBe('hidden');
        const content = partElement(result.host, 'content') as HTMLElement;
        expect(content.getAttribute('aria-modal')).toBeNull();

        (content.querySelector('button') as HTMLElement).focus();
        await user.keyboard('{Escape}');
        expect(partElement(result.host, 'content')).toBeNull();
      } finally {
        result.cleanup();
      }
    });

    it('defaultOpen mounts open with the trap live', async () => {
      const result = await adapter.render({ defaultOpen: true });
      try {
        const content = partElement(result.host, 'content');
        expect(content).not.toBeNull();
        expect(document.body.style.overflow).toBe('hidden');
      } finally {
        result.cleanup();
      }
    });
  });
}
