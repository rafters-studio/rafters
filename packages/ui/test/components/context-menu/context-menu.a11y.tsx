import * as React from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../src/components/context-menu/context-menu';

type Items = 'actions' | 'selectable' | 'submenu';

interface SceneProps {
  open?: boolean;
  items?: Items;
  subOpen?: boolean;
}

interface MenuProps extends SceneProps {
  region: HTMLElement;
}

function Menu({ open = false, items = 'actions', subOpen = false, region }: MenuProps) {
  return (
    <ContextMenu open={open}>
      <ContextMenuTrigger>
        <span>Right-click surface</span>
      </ContextMenuTrigger>
      <ContextMenuContent aria-label="Actions" container={region}>
        {items === 'actions' ? (
          <>
            <ContextMenuItem>Edit</ContextMenuItem>
            <ContextMenuItem>Duplicate</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled>Archive</ContextMenuItem>
            <ContextMenuItem>Delete</ContextMenuItem>
          </>
        ) : null}
        {items === 'selectable' ? (
          <>
            <ContextMenuCheckboxItem checked>Bold</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Italic</ContextMenuCheckboxItem>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup value="a">
              <ContextMenuRadioItem value="a">Left</ContextMenuRadioItem>
              <ContextMenuRadioItem value="b">Right</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </>
        ) : null}
        {items === 'submenu' ? (
          <>
            <ContextMenuItem>Edit</ContextMenuItem>
            <ContextMenuSub open={subOpen}>
              <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
              <ContextMenuSubContent aria-label="More actions" container={region}>
                <ContextMenuItem>Deep</ContextMenuItem>
                <ContextMenuItem>Deeper</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// The menu and any submenu portal to document.body by default, where axe's
// region rule flags them as content outside every landmark. A real page has
// landmarks, so the scene renders inside a <main> and hands it to the content
// as the portal `container`, the way the conformance test does; the whole
// tree then lives inside the render container that is audited.
function Scene(props: SceneProps) {
  const [region, setRegion] = React.useState<HTMLElement | null>(null);
  return <main ref={setRegion}>{region ? <Menu {...props} region={region} /> : null}</main>;
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with checkbox and radio items', { open: true, items: 'selectable' }],
  ['open with submenu collapsed', { open: true, items: 'submenu' }],
  ['open with submenu expanded', { open: true, items: 'submenu', subOpen: true }],
];

for (const [name, props] of scenes) {
  test(`context-menu ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
