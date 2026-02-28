/**
 * Chrome React component - universal Rafters shell (placeholder)
 *
 * Full implementation in #834.
 */

import * as React from 'react';

export interface ChromeRailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  panel: React.ReactNode;
  disabled?: boolean;
}

export interface ChromePanel {
  id: string;
  content: React.ReactNode;
  label: string;
}

export interface ChromeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  rail: ChromeRailItem[];
  settings?: React.ReactNode;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
}

export interface ChromeControls {
  openPanel: (id: string) => void;
  closePanel: () => void;
  togglePanel: (id: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  collapse: () => void;
  expand: () => void;
}

/**
 * Chrome shell placeholder -- full implementation in #834.
 */
export const Chrome = React.forwardRef<ChromeControls, ChromeProps>(function Chrome(
  { children, ...props },
  _ref,
) {
  return <div {...props}>{children}</div>;
});
