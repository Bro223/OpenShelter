/**
 * i18n DURABLE GUARD (translated surfaces — app-wide): no hardcoded
 * user-visible text in ANY template under src/app.
 *
 * Scope (widened 2026-09-21, N7 i18n-completeness / F3): every .html
 * template under src/app is discovered by walking — there is NO TEMPLATES
 * map to opt out of, so a new template is guarded from its first commit.
 * It flags three classes:
 *   1. text nodes that are not interpolations or control-flow syntax,
 *   2. literal values of user-visible attributes (placeholder,
 *      aria-label, title, alt, message),
 *   3. (new — the class the old scanner skipped entirely) string literals
 *      inside {{ … }} interpolations that look like copy:
 *      `{{ pending ? 'Measuring…' : 'Distance from you' }}`.
 *
 * The scanner is a character-level state machine (the old line-based one
 * misread multi-line quoted attributes and multi-line @let statements as
 * text): tags, quoted attribute values, interpolations and control-flow
 * statements are consumed as units; only the text between them is copy.
 * Inside interpolations, literals followed by `| t` are the key seam (the
 * message-key path); namespaced message keys and structural values (date
 * formats, validator error names, scroll tokens, booleans, locale codes)
 * are not copy; a per-file allow-list below covers the rest with reasons.
 *
 * The completeness test pins the template set: if a template goes missing
 * or a new one appears, the test fails and forces a human decision —
 * nothing escapes the guard silently.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { scanTemplate, type Kind } from './i18n-template-guard-scanner';

/**
 * The project (frontend) root: ng test / vitest run with the project dir
 * as cwd (the pre-widening guard spec relied on the same — proven).
 */
const ROOT = process.cwd();
const APP = `${ROOT}/src/app`;

/**
 * Walk src/app for templates. The completeness test (below) pins the
 * exact set — a new template fails that test until someone has looked
 * at it, which is the point.
 */
function findTemplates(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const full = `${dir}/${entry}`;
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.html')) {
        out.push(full.slice(ROOT.length + 1)); // 'src/app/…' relative
      }
    }
  };
  walk(APP);
  return out;
}

/** The full template set as of 2026-09-21 (23 files). */
const EXPECTED_TEMPLATES = [
  'src/app/app.html',
  'src/app/features/account/account-page.html',
  'src/app/features/account/contributions-panel.html',
  'src/app/features/account/verify-page.html',
  'src/app/features/admin/admin-page.html',
  'src/app/features/admin/guidance-editor.html',
  'src/app/features/admin/guidance-order-list.html',
  'src/app/features/admin/guidance-translations.html',
  'src/app/features/admin/site-texts-panel.html',
  'src/app/features/auth/login-page.html',
  'src/app/features/auth/register-page.html',
  'src/app/features/auth/reset-page.html',
  'src/app/features/guidance/guidance-detail-page.html',
  'src/app/features/guidance/guidance-list-page.html',
  'src/app/features/legal/privacy-policy-page.html',
  'src/app/features/legal/terms-page.html',
  'src/app/features/map/map-page.html',
  'src/app/features/shelter/shelter-detail-page.html',
  'src/app/features/shelter/submit-shelter-page.html',
  'src/app/shared/accessibility-dialog.component.html',
  'src/app/shared/banner.component.html',
  'src/app/shared/consent-banner.component.html',
  'src/app/shared/loading-indicator.html',
  'src/app/shared/page-shell.html',
  'src/app/shared/pagination.html',
  'src/app/shared/report-gauge.html',
];

/**
 * Per-file allow-lists: literals that are genuinely not copy. Every
 * entry carries its reason and MUST keep matching a live violation — the
 * staleness test below fails when an entry stops matching, so the list
 * cannot grow stale (a fixed file keeps its entry = hidden future
 * regressions).
 */
const ALLOWED_TEXT: Record<string, Record<string, string>> = {
  'features/account/verify-page.html': {
    '✓': 'success glyph (Unicode symbol, not copy)',
    '·': 'separator glyph between the two check items (punctuation, not copy)',
  },
  'features/shelter/shelter-detail-page.html': {
    '&larr;': 'decorative back-arrow entity (punctuation, not copy)',
    'Capacity:': 'prefix label of the live occupancy gauge — a single key would need a {n} param for the gauge value; structural to the gauge markup (review 07 P1-4 note)',
  },
  'features/auth/login-page.html': {
    '&middot;': 'legal-links separator entity (punctuation, not copy)',
  },
  'features/guidance/guidance-detail-page.html': {
    '&larr;': 'decorative back-arrow entity (punctuation, not copy)',
  },
  'features/shelter/submit-shelter-page.html': {
    '&larr;': 'decorative back-arrow entity (punctuation, not copy)',
  },
  'shared/page-shell.html': {
    'OpenShelter': 'brand name — proper noun, not translated in any locale (like detail.navigate)',
    '&middot;': 'footer separator entity (punctuation, not copy)',
    ':': 'punctuation spliced after the translated footer.dataSource label',
    '.': 'sentence-final period after the last footer link (like account.legal.tail)',
  },
  'shared/pagination.html': {
    '&larr;&nbsp;': 'decorative prev-arrow entity (punctuation, not copy)',
    '&nbsp;&rarr;': 'decorative next-arrow entity (punctuation, not copy)',
  },
  'features/map/map-page.html': {
    '·': 'nearest-line separator glyph (punctuation, not copy)',
    ':': 'punctuation spliced after the translated map.aroundYou label',
    '→': 'decorative arrow glyph after the translated view-details label',
  },
  'features/admin/admin-page.html': {
    '—': 'empty-cell placeholder glyph (data absence, not copy)',
    '·': 'queue-row separator glyph (punctuation, not copy)',
    '“': 'opening quote glyph around the moderator note (punctuation, not copy)',
    '”': 'closing quote glyph around the moderator note (punctuation, not copy)',
    '×': 'dimension separator between width/height figures (punctuation, not copy)',
  },
  'features/admin/guidance-order-list.html': {
    '—': 'empty-cell placeholder glyph (data absence, not copy)',
  },
  'features/admin/site-texts-panel.html': {
    'https://': 'ASCII URL prefix spliced between the translated hint segments',
  },
};

const ALLOWED_ATTRS: Record<string, Record<string, string>> = {
  'features/account/account-page.html': {
    'placeholder="DELETE"':
      'arming word, not copy — the destructive confirm requires typing the English literal (the review decision: no key for an input arming word; pinned by the account lane)',
  },
};

const ALLOWED_INTERP: Record<string, Record<string, string>> = {
  'features/admin/admin-page.html': {
    suspend: 'user-action discriminator (string comparison against a data value), not copy',
  },
};

function allowSets(rel: string): Record<Kind, Set<string>> {
  // 'src/app/features/account/x.html' -> 'features/account/x.html';
  // 'src/app/shared/x.html' -> 'shared/x.html' — the allow-list key space.
  const key = rel.startsWith('src/app/') ? rel.slice('src/app/'.length) : rel;
  const pick = (tables: Record<string, Record<string, string>>): Set<string> =>
    new Set(Object.keys(tables[key] ?? {}));
  return { text: pick(ALLOWED_TEXT), attr: pick(ALLOWED_ATTRS), interp: pick(ALLOWED_INTERP) };
}

describe('i18n template guard (no hardcoded user-visible template text)', () => {
  const templates = () => findTemplates();

  it('discovers every template under src/app (completeness — no silent opt-out)', () => {
    expect(templates()).toEqual(EXPECTED_TEMPLATES);
  });

  for (const file of EXPECTED_TEMPLATES) {
    it(`${file} carries no hardcoded user-visible copy`, () => {
      const source = readFileSync(`${ROOT}/${file}`, 'utf8');
      const violations = scanTemplate(source, allowSets(file));
      expect(violations).toEqual([]);
    });
  }

  it('the guard has teeth: a fresh hardcoded string is flagged', () => {
    const bad = [
      '<section>',
      '  <h1>Account</h1>',
      '  <button [disabled]="busy()">Save changes</button>',
      '  <input placeholder="new@example.ee" />',
      '  <p>{{ "account.retry" | t }}</p>',
      '  <p>{{ busy() ? "Measuring…" : "Distance from you" }}</p>',
      '  <div aria-label="Marker legend"></div>',
      '  @if (ok()) { <p>{{ x | date: "medium" }}</p> }',
      '</section>',
    ].join('\n');
    const violations = scanTemplate(bad, allowSets('features/account/synthetic.html'));
    expect(violations).toHaveLength(6); // text×2 + attr placeholder + interp×2 + attr aria-label
    expect(violations.map((v) => v.kind)).toEqual([
      'text',
      'text',
      'attr',
      'interp',
      'interp',
      'attr',
    ]);
    expect(violations.some((v) => v.kind === 'interp' && v.value === 'Measuring…')).toBe(true);
    expect(violations.some((v) => v.kind === 'attr' && v.raw === 'aria-label="Marker legend"')).toBe(true);
  });

  it('structural interpolation literals are not flagged', () => {
    const ok = [
      '<section>',
      '  <p>{{ when | date: "medium" : undefined : i18n.locale() }}</p>',
      '  <p>{{ form.controls.email.hasError("maxlength") ? ("account.email.maxlength" | t) : ("account.email.invalid" | t) }}</p>',
      '  <button (click)="scrollTo(\'map\', \'smooth\')">{{ "a.b" | t }}</button>',
      '  @let invalid =\n    form.controls.x.touched && form.controls.x.invalid;',
      '  <input [disabled]="invalid" />',
      '</section>',
    ].join('\n');
    expect(scanTemplate(ok, allowSets('features/account/synthetic.html'))).toEqual([]);
  });

  it('every allow-list entry still matches a live violation (no stale entries)', () => {
    for (const [file, entries] of Object.entries(ALLOWED_TEXT)) {
      const source = readFileSync(`${ROOT}/src/app/${file}`, 'utf8');
      const live = new Set(
        scanTemplate(source, { text: new Set(), attr: new Set(), interp: new Set() })
          .filter((v) => v.kind === 'text')
          .map((v) => v.value),
      );
      for (const value of Object.keys(entries)) {
        expect(live.has(value), `${file}: allowed text ${JSON.stringify(value)} no longer occurs — remove the entry`).toBe(true);
      }
    }
    for (const [file, entries] of Object.entries(ALLOWED_ATTRS)) {
      const source = readFileSync(`${ROOT}/src/app/${file}`, 'utf8');
      const live = new Set(
        scanTemplate(source, { text: new Set(), attr: new Set(), interp: new Set() })
          .filter((v) => v.kind === 'attr')
          .map((v) => v.raw),
      );
      for (const raw of Object.keys(entries)) {
        expect(live.has(raw), `${file}: allowed attr ${JSON.stringify(raw)} no longer occurs — remove the entry`).toBe(true);
      }
    }
    for (const [file, entries] of Object.entries(ALLOWED_INTERP)) {
      const source = readFileSync(`${ROOT}/src/app/${file}`, 'utf8');
      const live = new Set(
        scanTemplate(source, { text: new Set(), attr: new Set(), interp: new Set() })
          .filter((v) => v.kind === 'interp')
          .map((v) => v.value),
      );
      for (const value of Object.keys(entries)) {
        expect(live.has(value), `${file}: allowed interpolation literal ${JSON.stringify(value)} no longer occurs — remove the entry`).toBe(true);
      }
    }
  });
});
