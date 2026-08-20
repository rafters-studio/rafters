/**
 * Playwright harness entry (FR-EDITOR-004).
 *
 * esbuild bundles THIS file -- which re-exports the REAL `bindEditor` -- into a
 * single IIFE injected via `page.setContent`. The e2e drives the genuine
 * compiled capture path, never hand-copied logic (issue File Locations).
 */
export { bindEditor } from '../../../packages/ui/src/components/editor/editor.behavior';
