#!/usr/bin/env node
/**
 * Normalize the built index.html for the hash-based proxy CSP
 * (docs/deploy/spa-csp.md at the repo root).
 *
 * Why this exists: the application builder inlines the critical CSS and
 * swaps the main stylesheet in with an INLINE EVENT HANDLER —
 *
 *   <link rel="stylesheet" href="styles-*.css" media="print"
 *         onload="this.media='all'">
 *   <noscript><link rel="stylesheet" href="styles-*.css"></noscript>
 *
 * Inline event handlers are governed by script-src and CANNOT be
 * allow-listed by hash (CSP hashes cover <script> blocks, not on*
 * attributes), so the hash-based policy the operator applies at the
 * proxy blocks the handler, the link stays at media="print", and the
 * SPA renders unstyled. A plain <link rel="stylesheet"> is the
 * CSP-safe equivalent: it is render-blocking, so the first paint still
 * sees the full sheet (no FOUC), and the inlined critical CSS above it
 * keeps the pre-paint theme tokens. The <noscript> fallback exists only
 * to serve styles when JS is off (the swap needs JS) and is redundant
 * once the link is plain — it is dropped with the pattern.
 *
 * Wired as the `postbuild` hook, so the documented `npm run build`
 * (ng build → this step) always emits a CSP-safe index.html; the
 * operator then recomputes the two pre-paint script hashes with
 * scripts/spa-csp.py if they ever change.
 *
 * Idempotent and no-op-safe: if the pattern is not present (e.g. a
 * development build without critical-CSS inlining) it reports and
 * exits 0. It rewrites ONLY the exact builder-emitted pattern — never
 * anything else in the file.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'frontend', 'browser');
const indexPath = join(distDir, 'index.html');

if (!existsSync(indexPath)) {
  console.error(`postbuild-csp: ${indexPath} not found — run "npm run build" in frontend/ first`);
  process.exit(2);
}

const html = readFileSync(indexPath, 'utf8');

// The exact builder-emitted pattern (beasties print/onload swap + its
// noscript twin, adjacent, no whitespace between tags).
const PATTERN =
  /<link rel="stylesheet" href="(styles-[A-Z0-9_-]+\.css)" media="print" onload="this\.media='all'"><noscript><link rel="stylesheet" href="\1"><\/noscript>/g;

const swapped = html.replace(PATTERN, '<link rel="stylesheet" href="$1">');

if (swapped === html) {
  console.error('postbuild-csp: no beasties print/onload stylesheet swap found — nothing to normalize (CSP-safe already or dev build)');
  process.exit(0);
}

writeFileSync(indexPath, swapped, 'utf8');
console.error(`postbuild-csp: replaced the print/onload stylesheet swap with a plain <link> in ${indexPath} (CSP-safe; docs/deploy/spa-csp.md)`);
