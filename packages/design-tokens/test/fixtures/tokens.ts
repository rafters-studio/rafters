import type { ColorValue, Token } from '@rafters/shared';

const accentScale: ColorValue['scale'] = [
  { l: 0.97, c: 0.02, h: 240 },
  { l: 0.93, c: 0.05, h: 240 },
  { l: 0.85, c: 0.1, h: 240 },
  { l: 0.75, c: 0.14, h: 240 },
  { l: 0.65, c: 0.16, h: 240 },
  { l: 0.55, c: 0.18, h: 240 },
  { l: 0.45, c: 0.18, h: 240 },
  { l: 0.35, c: 0.16, h: 240 },
  { l: 0.25, c: 0.14, h: 240 },
  { l: 0.18, c: 0.1, h: 240 },
  { l: 0.12, c: 0.07, h: 240 },
];

const grayScale: ColorValue['scale'] = [
  { l: 0.98, c: 0.005, h: 0 },
  { l: 0.94, c: 0.005, h: 0 },
  { l: 0.86, c: 0.005, h: 0 },
  { l: 0.74, c: 0.005, h: 0 },
  { l: 0.62, c: 0.005, h: 0 },
  { l: 0.5, c: 0.005, h: 0 },
  { l: 0.4, c: 0.005, h: 0 },
  { l: 0.32, c: 0.005, h: 0 },
  { l: 0.24, c: 0.005, h: 0 },
  { l: 0.16, c: 0.005, h: 0 },
  { l: 0.1, c: 0.005, h: 0 },
];

export const REPRESENTATIVE_TOKEN_SET: Token[] = [
  // Color families
  {
    name: 'accent',
    namespace: 'color',
    category: 'color',
    value: { name: 'accent', scale: accentScale },
    userOverride: null,
  },
  {
    name: 'gray',
    namespace: 'color',
    category: 'color',
    value: { name: 'gray', scale: grayScale },
    userOverride: null,
  },
  // Color positions (semantic)
  {
    name: 'primary',
    namespace: 'semantic',
    category: 'color',
    value: { family: 'accent', position: '500' },
    userOverride: null,
  },
  {
    name: 'primary-foreground',
    namespace: 'semantic',
    category: 'color',
    value: { family: 'gray', position: '50' },
    userOverride: null,
  },
  {
    name: 'primary-hover',
    namespace: 'semantic',
    category: 'color',
    value: { family: 'accent', position: '600' },
    userOverride: null,
  },
  // Spacing
  {
    name: 'spacing-base',
    namespace: 'spacing',
    category: 'spacing',
    value: '4px',
    userOverride: null,
  },
  {
    name: 'spacing-2',
    namespace: 'spacing',
    category: 'spacing',
    value: '8px',
    userOverride: null,
  },
  {
    name: 'spacing-4',
    namespace: 'spacing',
    category: 'spacing',
    value: '16px',
    userOverride: null,
  },
  // Radius
  {
    name: 'radius-base',
    namespace: 'radius',
    category: 'radius',
    value: '4px',
    userOverride: null,
  },
  {
    name: 'radius-lg',
    namespace: 'radius',
    category: 'radius',
    value: '8px',
    userOverride: null,
  },
  // Motion
  {
    name: 'motion-duration-base',
    namespace: 'motion',
    category: 'motion',
    value: '150ms',
    userOverride: null,
  },
  {
    name: 'rafters-ease-standard',
    namespace: 'motion',
    category: 'motion',
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
    userOverride: null,
  },
  // Typography
  {
    name: 'typography-font-size-base',
    namespace: 'typography',
    category: 'typography',
    value: '1rem',
    userOverride: null,
  },
  {
    name: 'typography-font-weight-bold',
    namespace: 'typography',
    category: 'typography',
    value: '700',
    userOverride: null,
  },
  // Shadow
  {
    name: 'shadow-sm',
    namespace: 'shadow',
    category: 'shadow',
    value: '0 1px 2px rgba(0, 0, 0, 0.05)',
    userOverride: null,
  },
  // Breakpoint
  {
    name: 'breakpoint-md',
    namespace: 'breakpoint',
    category: 'breakpoint',
    value: '768px',
    userOverride: null,
  },
];
