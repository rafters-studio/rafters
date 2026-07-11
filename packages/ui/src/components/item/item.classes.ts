/**
 * Item -- decoration for the static score. No behavior file: item projects
 * no ARIA (Spec 01's "static with no projection needs no behavior file"),
 * so its config type lives here rather than in an item.behavior.ts that
 * would exist only to hold a type.
 *
 * The oracle (src/old/ui/item.classes.ts) baked in interactive-listbox
 * concerns -- selected/disabled state colors, hover, cursor-default,
 * select-none -- because its item WAS the option (role="option", one
 * fixed icon+label+description shape). This score drops all of that
 * (dropped: interactive selection is not this component's job) and
 * generalizes the fixed icon/label/description shape into three plain
 * slots (leading/content/trailing -- new-grain): what goes in each slot,
 * and how it's styled, is the consumer's call.
 */

export type ItemSize = 'sm' | 'default' | 'lg';

export interface ItemConfig {
  size?: ItemSize | undefined;
}

export interface ItemClassSet {
  root: string;
  leading: string;
  content: string;
  trailing: string;
}

const sizeClasses: Record<ItemSize, string> = {
  sm: 'gap-2 px-2 py-1.5 text-label-small',
  default: 'gap-3 px-3 py-2 text-body-small',
  lg: 'gap-4 px-4 py-3 text-body-medium',
};

const rootClasses = 'flex items-center rounded-md';

const leadingClasses = 'flex shrink-0 items-center text-current';

const contentClasses = 'flex min-w-0 flex-1 flex-col';

const trailingClasses = 'flex shrink-0 items-center text-current';

export function itemClasses(config: ItemConfig): ItemClassSet {
  const size = config.size ?? 'default';
  return {
    root: `${rootClasses} ${sizeClasses[size]}`,
    leading: leadingClasses,
    content: contentClasses,
    trailing: trailingClasses,
  };
}
