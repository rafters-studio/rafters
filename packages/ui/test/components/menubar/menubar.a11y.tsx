import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '../../../src/components/menubar/menubar';

interface SceneProps {
  defaultValue?: string;
}

function Scene(props: SceneProps) {
  return (
    <main>
      <Menubar {...props}>
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab <MenubarShortcut>Cmd+T</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Share</MenubarItem>
            <MenubarItem>Print</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="view">
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel>Layout</MenubarLabel>
            <MenubarCheckboxItem checked>Show ruler</MenubarCheckboxItem>
            <MenubarCheckboxItem>Show grid</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarRadioGroup value="left">
              <MenubarRadioItem value="left">Left</MenubarRadioItem>
              <MenubarRadioItem value="right">Right</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </main>
  );
}

// The menus portal to a host right after the bar, inside the <main>.
const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open with action items', { defaultValue: 'file' }],
  ['open with checkbox and radio items', { defaultValue: 'view' }],
];

for (const [name, props] of scenes) {
  test(`menubar ${name}`, async ({ task }) => {
    await render(<Scene {...props} />);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
