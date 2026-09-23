import { readFileSync, readdirSync, statSync } from 'node:fs';

/**
 * Frontend architecture guard (W2-C, P2-16) — the frontend twin of the
 * backend's DocumentationFactsTest / ApiDocsGuard.
 *
 * The routing and guard tables are the app's map of itself. A feature
 * directory that no route imports is code that can never render; an
 * AdminTab value with no button or no panel is a dead enum member that
 * the type system will happily carry forever. This spec makes both fail
 * the build instead of aging.
 *
 * Rules:
 *  1. Every directory under src/app/features/ must be referenced in
 *     app.routes.ts (the routing table) — component import or
 *     loadComponent dynamic import alike, both spell the path
 *     `features/<dir>/...`.
 *  2. Every value of the AdminTab union (admin-page.ts) must have its
 *     counterparts inside the admin feature:
 *       - a tab button:  switchTab('<value>')
 *       - a rendered panel:  tab() === '<value>'
 *     The panel check scans all .ts/.html under features/admin/, not just
 *     admin-page.html, so extracting a tab panel into its own component
 *     (the W3-B shrink) keeps its counterpart where the comparison lives.
 *
 * The count floors exist for the same reason the backend guard's
 * CLASS_MAPPING floor does: a broken parse pattern must fail loudly
 * instead of vacuously checking zero entries. The floors are the values
 * MEASURED at landing (2026-09-22, branch feature/frontend, HEAD
 * 1b6bb29): 7 feature directories, 9 admin tabs. Lowering a floor is a
 * decision — change it in the same commit that legitimately removes the
 * entry, never as a silent default.
 */

// The test runner's cwd is the frontend project root (`npx ng test`),
// same convention as design-tokens.spec.ts.
const APP = `${process.cwd()}/src/app`;
const ROUTES_FILE = `${APP}/app.routes.ts`;
const ADMIN_DIR = `${APP}/features/admin`;
const ADMIN_PAGE_TS = `${ADMIN_DIR}/admin-page.ts`;
const FEATURES_DIR = `${APP}/features`;

/** Measured at landing — see the count-floor note above. */
const MIN_FEATURE_DIRS = 7;
const MIN_ADMIN_TABS = 9;

/**
 * Size ceiling for admin-page.ts — re-measured every time a seam comes
 * out. It stood at 2 535 lines (MEASURED when this guard landed,
 * 2026-09-22, HEAD 317cf08) and is lowered HERE, in the same commit, to
 * the size measured after W3-B's continuation extracted the shelters
 * paged view + its search sync — the URL→state→load seam (the `shelterQ`
 * / `source` / `shelterPage` / `shelterSize` params, the fetch-sequence
 * guard, the row actions) — into `shelters-view.ts` (review 18 F3's fix
 * note). Same idiom as the count floors above: crossing the ceiling
 * fails the build, and RAISING it is a decision — change it in the same
 * commit that legitimately grows the file, with the reason, never as a
 * silent default; lowering it follows the same commit that legitimately
 * shrinks the file.
 *
 * What comes out FIRST when the ceiling bites next: the guidance tab's
 * state (the post list + its search, the editor lifecycle, the
 * translation rows) — the page's largest remaining tab, the same
 * pattern.
 */
const ADMIN_PAGE_MAX_LINES = 2067;

function featureDirs(): string[] {
  return readdirSync(FEATURES_DIR).filter((entry) =>
    statSync(`${FEATURES_DIR}/${entry}`).isDirectory(),
  );
}

/**
 * The AdminTab union values, in declaration order.
 * `export type AdminTab =\n  | 'a'\n  | 'b'\n  ... ;`
 */
function adminTabValues(): string[] {
  const source = readFileSync(ADMIN_PAGE_TS, 'utf8');
  const start = source.indexOf('export type AdminTab =');
  if (start === -1) {
    throw new Error(
      'AdminTab union not found in admin-page.ts — the guard cannot parse ' +
        'what it cannot find; fix the parser or move the type',
    );
  }
  const end = source.indexOf(';', start);
  if (end === -1) {
    throw new Error('AdminTab union is not terminated in admin-page.ts');
  }
  const values: string[] = [];
  const quoted = /\|\s*'([a-z][a-z0-9-]*)'/g;
  for (const match of source.slice(start, end).matchAll(quoted)) {
    values.push(match[1]);
  }
  return values;
}

/** All .ts/.html text under the admin feature, concatenated. */
function adminFeatureText(): string {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|html)$/.test(entry)) {
        out.push(readFileSync(full, 'utf8'));
      }
    }
  };
  walk(ADMIN_DIR);
  return out.join('\n');
}

describe('frontend architecture guard', () => {
  const routes = readFileSync(ROUTES_FILE, 'utf8');
  const features = featureDirs();
  const tabs = adminTabValues();
  const adminText = adminFeatureText();

  it(`parses ${features.length} feature directories (floor ${MIN_FEATURE_DIRS})`, () => {
    expect(features.length).toBeGreaterThanOrEqual(MIN_FEATURE_DIRS);
  });

  it(`parses ${tabs.length} AdminTab values (floor ${MIN_ADMIN_TABS})`, () => {
    expect(tabs.length).toBeGreaterThanOrEqual(MIN_ADMIN_TABS);
  });

  it('every feature directory is referenced by the routing table', () => {
    const unrouted = features.filter((dir) => !routes.includes(`features/${dir}/`));
    expect(unrouted.map((dir) => `features/${dir}/ — add a route or delete the directory`)).toEqual(
      [],
    );
  });

  it('every AdminTab value has a tab button and a rendered panel', () => {
    const missing: string[] = [];
    for (const tab of tabs) {
      if (!adminText.includes(`switchTab('${tab}')`)) {
        missing.push(`AdminTab '${tab}': no tab button (switchTab('${tab}'))`);
      }
      if (!adminText.includes(`tab() === '${tab}'`)) {
        missing.push(`AdminTab '${tab}': no rendered panel (tab() === '${tab}')`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('admin-page.ts stays at or under its measured line ceiling', () => {
    // wc -l semantics: a final newline does not start a new line.
    const text = readFileSync(ADMIN_PAGE_TS, 'utf8');
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    expect(
      lines,
      `admin-page.ts is ${lines} lines — the ceiling is ${ADMIN_PAGE_MAX_LINES}. ` +
        'Extract before adding (next seam: the guidance tab’s state — see ' +
        'the ceiling note above), or raise the ceiling deliberately in ' +
        'this same commit with the reason.',
    ).toBeLessThanOrEqual(ADMIN_PAGE_MAX_LINES);
  });
});
