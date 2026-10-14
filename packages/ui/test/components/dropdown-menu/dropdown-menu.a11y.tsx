import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../src/components/dropdown-menu/dropdown-menu';

const mark = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <title>Item mark</title>
    <rect width="24" height="24" fill="currentColor" />
  </svg>
);

interface SceneProps {
  defaultOpen?: boolean;
  icons?: boolean;
  /** Label, checkbox item, and radio group instead of the plain action items. */
  selectable?: boolean;
}

function Scene({ selectable = false, icons = false, ...props }: SceneProps) {
  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger aria-label="Options">Options</DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Options">
        {selectable ? (
          <>
            <DropdownMenuLabel>Formatting</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked startIcon={icons ? mark : undefined}>
              Bold
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Italic</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value="a">
              <DropdownMenuRadioItem value="a">Left</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Right</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        ) : (
          <>
            <DropdownMenuItem startIcon={icons ? mark : undefined}>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The menu stays in the tree present-but-hidden (no portal), so every scene
// audits the render container.
const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['closed with checkbox and radio items', { selectable: true }],
  ['open with checkbox and radio items', { defaultOpen: true, selectable: true }],
  ['open with start icons', { defaultOpen: true, icons: true }],
  ['open with start icons on checkbox items', { defaultOpen: true, selectable: true, icons: true }],
];

for (const [name, props] of scenes) {
  test(`dropdown-menu ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
