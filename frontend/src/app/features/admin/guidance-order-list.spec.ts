import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n/i18n.service';
import type { AdminGuidancePostDto } from '../../core/models';
import { ConfirmAction } from '../../shared/confirm-action';
import { GuidanceOrderList } from './guidance-order-list';

/**
 * GuidanceOrderList — the Guidance tab's post list + manual ordering
 * (guidance-manual-order). Presentation and the drag interaction
 * state live on the panel; the tab model and the gateway submission
 * live on the AdminPage (covered by admin-page.spec.ts, which drives
 * the same list through the page's DOM).
 */

// ---- fixtures --------------------------------------------------------------

const PUBLISHED_11: AdminGuidancePostDto = {
  id: 11,
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: '<p>Pöördu peavarjendisse.</p>',
  locale: 'et',
  homeLocale: 'et',
  status: 'PUBLISHED',
  pinned: true,
  sortOrder: 1,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  heroImportUrl: null,
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

const PUBLISHED_13: AdminGuidancePostDto = {
  ...PUBLISHED_11,
  id: 13,
  slug: 'kolmas-juhis',
  title: 'Kolmas juhis',
  pinned: false,
  sortOrder: 2,
};

const DRAFT_12: AdminGuidancePostDto = {
  ...PUBLISHED_11,
  id: 12,
  slug: 'uus-juhis-mustand',
  title: 'Uus juhis (mustand)',
  status: 'DRAFT',
  pinned: false,
  sortOrder: 3,
};

/** The server-confirmed order (11, 13, 12). */
const ORDERED_ROWS = [PUBLISHED_11, PUBLISHED_13, DRAFT_12];

// ---- harness ---------------------------------------------------------------

async function render(overrides: Partial<Record<string, unknown>> = {}) {
  TestBed.configureTestingModule({
    imports: [GuidanceOrderList],
    providers: [I18nService],
  });
  const fixture = TestBed.createComponent(GuidanceOrderList);
  const panel = fixture.componentInstance;
  const inputs: Record<string, unknown> = {
    rows: ORDERED_ROWS,
    loadError: null,
    busy: false,
    contentLocale: 'en',
    publishedAt: new Map([['varjumine-droonirunnaku-ajal', '2026-09-01T09:00:00Z']]),
    deleteConfirm: new ConfirmAction<number>(document.body),
    ...overrides,
  };
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value as never);
  }
  const reorder: AdminGuidancePostDto[][] = [];
  panel.reorder.subscribe((rows) => reorder.push(rows));
  fixture.detectChanges();
  return { fixture, panel, el: fixture.nativeElement as HTMLElement, reorder };
}

function moveButtons(row: Element): HTMLButtonElement[] {
  return Array.from(row.querySelectorAll<HTMLButtonElement>('.admin-guidance-move button'));
}

/** A fake drag event (jsdom cannot start a native drag): a plain Event
 *  carrying a fake dataTransfer, the page spec's proven pattern. */
function dragEvent(type: string): DragEvent {
  const e = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(e, 'dataTransfer', {
    value: { effectAllowed: '', dropEffect: '', setData: vi.fn() },
  });
  return e;
}

// ---- presentation ------------------------------------------------------------

describe('GuidanceOrderList presentation', () => {
  it('renders the scope line, the hint and one row per post (the Published column from the merge)', async () => {
    const { el, fixture } = await render();
    fixture.detectChanges();

    // The scope line names the CONTENT language (locale code, as the
    // catalog interpolates it: 'Posts in en — …').
    expect(el.querySelector('.admin-guidance-scope')!.textContent).toContain('Posts in en');
    expect(el.querySelector('.admin-guidance-hint')!.textContent).toContain(
      'in this order',
    );
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    // Row 1 (PUBLISHED, in the merge) shows its instant; the DRAFT row
    // shows the empty-cell glyph (it is not PUBLISHED).
    expect(rows[0]!.textContent).toContain('Varjumine droonirünnaku ajal');
    expect(rows[0]!.textContent).not.toContain('—');
    expect(rows[2]!.textContent).toContain('—');
  });

  // ---- the derivative srcset on the 40 px thumb ----------------------

  it('the 40 px thumb carries the derivative srcset when the server has one (sizes = 40px)', async () => {
    const srcset =
      '/api/media/0123456789abcdef0123456789abcdef-t96.jpg 96w, '
      + '/api/media/0123456789abcdef0123456789abcdef-t192.jpg 192w';
    // All three fixture rows carry a hero; only row 11's asset has
    // derivatives on disk (the srcset is built from disk truth).
    const rows = ORDERED_ROWS.map((row) =>
      row.id === 11 ? { ...row, heroImageSrcset: srcset } : row,
    );
    const { el, fixture } = await render({ rows });
    fixture.detectChanges();

    const imgs = el.querySelectorAll<HTMLImageElement>('.admin-guidance-thumb');
    expect(imgs.length).toBe(3);
    expect(imgs[0]!.getAttribute('src')).toBe(PUBLISHED_11.heroImageUrl);
    expect(imgs[0]!.getAttribute('srcset')).toBe(srcset);
    expect(imgs[0]!.getAttribute('sizes')).toBe('40px');
    // The other rows' assets have no derivatives: plain src only.
    expect(imgs[1]!.hasAttribute('srcset')).toBe(false);
    expect(imgs[2]!.hasAttribute('srcset')).toBe(false);
  });

  it('a post whose asset has no derivatives renders the plain src only (no srcset attribute)', async () => {
    const { el, fixture } = await render(); // the default fixtures carry no srcset
    fixture.detectChanges();

    const imgs = el.querySelectorAll<HTMLImageElement>('.admin-guidance-thumb');
    expect(imgs.length).toBe(3);
    for (const img of Array.from(imgs)) {
      expect(img.hasAttribute('srcset')).toBe(false);
    }
  });

  it('the loading state shows the spinner', async () => {
    const loading = await render({ rows: null });
    expect(loading.el.querySelector('app-loading-indicator')).not.toBeNull();
  });

  it('the load error shows the message and the retry button', async () => {
    const failed = await render({ rows: null, loadError: 'the list could not be loaded' });
    expect(failed.el.querySelector('.admin-state--error')!.textContent).toContain(
      'the list could not be loaded',
    );
    expect(failed.el.querySelector('button.btn--ghost')!.textContent).toContain('Retry');
  });

  it('the empty state names the language being managed', async () => {
    const { el } = await render({ rows: [] });
    expect(el.querySelector('.admin-state')!.textContent).toContain('No guidance posts in en yet');
  });

  it('each row has three keyboard-reachable 48px move buttons, disabled at the boundaries', async () => {
    const { el } = await render();
    const rows = el.querySelectorAll('tbody tr');
    // Native <button>s (keyboard-reachable), each carrying the global .btn
    // 48px minimum-height class.
    for (const row of Array.from(rows)) {
      const buttons = moveButtons(row);
      expect(buttons.length).toBe(3);
      for (const b of buttons) {
        expect(b).toBeInstanceOf(HTMLButtonElement);
        expect(b.classList.contains('btn')).toBe(true);
      }
    }
    // First row: top AND up are disabled (nothing above it).
    const first = moveButtons(rows[0]!);
    expect(first[0]!.disabled).toBe(true);
    expect(first[1]!.disabled).toBe(true);
    expect(first[2]!.disabled).toBe(false);
    // Last row: down is disabled (nothing below it).
    const last = moveButtons(rows[2]!);
    expect(last[0]!.disabled).toBe(false);
    expect(last[1]!.disabled).toBe(false);
    expect(last[2]!.disabled).toBe(true);
  });

  it('the move buttons announce the post and the direction (accessible names)', async () => {
    const { el } = await render();
    const rows = el.querySelectorAll('tbody tr');
    const [top, up, down] = moveButtons(rows[1]!);
    // Row 2 is 'Kolmas juhis' (id 13).
    expect(top!.getAttribute('aria-label')).toBe('Move "Kolmas juhis" to the top');
    expect(up!.getAttribute('aria-label')).toBe('Move "Kolmas juhis" up');
    expect(down!.getAttribute('aria-label')).toBe('Move "Kolmas juhis" down');
  });
});

// ---- manual ordering ---------------------------------------------------------

describe('GuidanceOrderList manual ordering', () => {
  it('"Up" emits the FULL ordered list with the row one step up (the page submits it)', async () => {
    const { el, reorder } = await render();
    const rows = el.querySelectorAll('tbody tr');
    // Click the 'Up' button of the middle row (id 13).
    const [, up] = moveButtons(rows[1]!);
    up!.click();

    expect(reorder.length).toBe(1);
    expect(reorder[0]!.map((r) => r.id)).toEqual([13, 11, 12]);
  });

  it('"To top" from the bottom row emits the list with that id first', async () => {
    const { el, reorder } = await render();
    const rows = el.querySelectorAll('tbody tr');
    const [toTop] = moveButtons(rows[2]!);
    toTop!.click();

    expect(reorder[0]!.map((r) => r.id)).toEqual([12, 11, 13]);
  });

  it('while busy, the move buttons emit nothing (one in-flight mutation at a time)', async () => {
    const { el, panel, reorder } = await render({ busy: true });
    const rows = el.querySelectorAll('tbody tr');
    // All three buttons of every row are disabled while busy.
    for (const row of Array.from(rows)) {
      for (const b of moveButtons(row)) {
        expect(b.disabled).toBe(true);
      }
    }
    // … and the handler guards even if the click slips through.
    panel.movePost(13, 'up');
    expect(reorder.length).toBe(0);
  });

  it('dragstart + dragover + drop emit the full list with the dragged row at the target position; dragend clears the highlight', async () => {
    const { fixture, panel, el, reorder } = await render();
    const rows = el.querySelectorAll('tbody tr');

    // Drag row 1 (id 11) onto row 3 (id 12) — through the DOM, the way
    // a real browser's drag pipeline would invoke the row bindings.
    rows[0]!.dispatchEvent(dragEvent('dragstart'));
    expect(panel.dragId).toBe(11);

    rows[2]!.dispatchEvent(dragEvent('dragover'));
    fixture.detectChanges();
    // The drop target is highlighted.
    expect(rows[2]!.classList.contains('admin-row--drag-over')).toBe(true);

    rows[2]!.dispatchEvent(dragEvent('drop'));
    // 11 moved to the last position: [13, 12, 11].
    expect(reorder.length).toBe(1);
    expect(reorder[0]!.map((r) => r.id)).toEqual([13, 12, 11]);

    rows[0]!.dispatchEvent(dragEvent('dragend'));
    fixture.detectChanges();
    expect(panel.dragId).toBeNull();
    // The highlight is gone again.
    expect(rows[2]!.classList.contains('admin-row--drag-over')).toBe(false);
  });

  it('a drop onto the dragged row itself emits nothing (a no-op)', async () => {
    const { fixture, el, reorder } = await render();
    const rows = el.querySelectorAll('tbody tr');
    rows[0]!.dispatchEvent(dragEvent('dragstart'));
    rows[0]!.dispatchEvent(dragEvent('dragover'));
    fixture.detectChanges();
    rows[0]!.dispatchEvent(dragEvent('drop'));
    expect(reorder.length).toBe(0);
  });
});

// ---- paged scope (admin-page-size's interaction rule) ------------------------

describe('GuidanceOrderList paged scope', () => {
  it('a multi-page scope disables DnD and the move buttons, with the hint pointing at the size selector', async () => {
    const { el, panel, reorder } = await render({ reorderable: false });
    const rows = el.querySelectorAll('tbody tr');
    // The move buttons stay rendered (the row shape is stable) but every
    // one is disabled — a multi-page list offers no reordering at all
    // (the full-list order PUT is all-rows-by-nature).
    for (const row of Array.from(rows)) {
      for (const b of moveButtons(row)) {
        expect(b.disabled).toBe(true);
      }
    }
    // The hint points at the size selector (the max offered size, 100)
    // instead of the order hint.
    const hint = el.querySelector('.admin-guidance-hint')!.textContent ?? '';
    expect(hint).toContain('100');
    expect(hint).not.toContain('in this order');
    // The rows are not draggable at all.
    for (const row of Array.from(rows)) {
      expect(row.getAttribute('draggable')).toBeNull();
    }
    // …and the handlers guard even if a drag event slips through.
    rows[0]!.dispatchEvent(dragEvent('dragstart'));
    expect(panel.dragId).toBeNull();
    rows[1]!.dispatchEvent(dragEvent('drop'));
    expect(reorder.length).toBe(0);
    panel.movePost(13, 'up');
    expect(reorder.length).toBe(0);
  });

  it('the single-page scope keeps the order hint and works (reorderable default)', async () => {
    const { el } = await render(); // reorderable defaults to true
    const hint = el.querySelector('.admin-guidance-hint')!.textContent ?? '';
    expect(hint).toContain('in this order');
    const rows = el.querySelectorAll('tbody tr');
    expect(rows[0]!.getAttribute('draggable')).toBe('true');
  });

  it('an empty result for a NON-EMPTY search shows the no-match state with the term (not "no posts yet")', async () => {
    const { el } = await render({ rows: [], searchTerm: 'kelder' });
    const state = el.querySelector('.admin-state')!.textContent ?? '';
    expect(state).toContain('No posts matching "kelder" in en');
    expect(state).not.toContain('No guidance posts in en yet');
  });

  it('an empty scope without a search keeps the "no posts yet" state', async () => {
    const { el } = await render({ rows: [] });
    const state = el.querySelector('.admin-state')!.textContent ?? '';
    expect(state).toContain('No guidance posts in en yet');
    expect(state).not.toContain('No posts matching');
  });
});
