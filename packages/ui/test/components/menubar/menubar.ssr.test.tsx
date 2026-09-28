/**
 * React server render of the menubar. The menus portal into a host that exists
 * only after mount, so the server markup carries no menu -- and must therefore
 * carry no reference to one (the empty-id convention).
 */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../../../src/components/menubar/menubar';

describe('menubar [react ssr]', () => {
  it('an open menubar never references a menu the markup does not contain', () => {
    const html = renderToString(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    const trigger = host.querySelector('[data-part="trigger"][data-value="file"]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    expect(host.querySelector('[data-part="content"]')).toBeNull();
  });
});
