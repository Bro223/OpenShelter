import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AdminGuidancePostDto } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ConfirmAction } from '../../shared/confirm-action';

/**
 * The Guidance tab's post list — and its manual ordering (the row
 * order IS the public order).
 *
 * Presentation and the drag interaction state live here; the tab model
 * (the rows, the load state, the publishedAt merge, the in-flight
 * mutation) stays on the AdminPage and comes down as inputs — every row
 * action is emitted back to the page (the page owns the gateway calls,
 * the banner copy and the busy flag, like every other tab).
 *
 * The list order IS the public order. PRIMARY mechanism: the
 * keyboard-reachable move buttons (top/up/down — 48px, the global .btn);
 * SECONDARY: native HTML5 drag & drop on the rows. BOTH emit the same
 * FULL ordered list (the `reorder` output); the page submits it via
 * PUT /admin/guidance/order and reorders the table in place from the
 * confirmed list (no reload).
 */
@Component({
  selector: 'app-guidance-order-list',
  imports: [DatePipe, LoadingIndicator, TranslatePipe],
  templateUrl: './guidance-order-list.html',
  styleUrl: './guidance-order-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceOrderList {
  /** null = loading; [] = loaded and empty. */
  readonly rows = input<AdminGuidancePostDto[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The CONTENT language this list belongs to —
   *  the empty state and the scope line name it. */
  readonly contentLocale = input('en');
  /** The applied search term (admin-guidance-search): '' = no filter.
   *  The empty state is the DISTINCT "no posts match {query}" copy for a
   *  non-empty term (it means something different from "no posts yet"). */
  readonly searchTerm = input('');
  /** Manual order availability (admin-page-size's interaction rule): the
   *  DnD, the move buttons AND the full-list order PUT are all-rows-by-
   *  nature, so they are offered only while the whole (searched, scoped)
   *  list fits the current page; paged multi-page lists disable them with
   *  the hint pointing at the size selector. */
  readonly reorderable = input(true);
  /** The publishedAt merge source (slug -> publication instant): the
   *  admin DTO carries NO publishedAt — the Published column merges the
   *  permit-all public index (a missing entry renders "—", never the
   *  list itself). */
  readonly publishedAt = input<Map<string, string>>(new Map());
  /** The two-tap delete confirm: the PAGE owns the instance (it disarms
   *  it from the tab-switch and editor-open paths); this template renders
   *  the trigger and the strip. (Repo convention: every input signal
   *  carries an explicit default — null here means "no armed state". */
  readonly deleteConfirm = input<ConfirmAction<number> | null>(null);

  /** The FULL ordered list to submit (PUT /admin/guidance/order). */
  readonly reorder = output<AdminGuidancePostDto[]>();
  readonly retry = output<void>();
  readonly edit = output<AdminGuidancePostDto>();
  readonly publish = output<AdminGuidancePostDto>();
  readonly unpublish = output<AdminGuidancePostDto>();
  readonly requestDelete = output<number>();
  readonly confirmDelete = output<number>();
  readonly cancelDelete = output<void>();

  /** The drag-&-drop target row (SECONDARY mechanism — a visual cue
   *  only); null while nothing is being dragged. */
  protected readonly dropTarget = signal<number | null>(null);

  /** The two-tap delete's armed state (the page-owned instance; a null
   *  instance — the standalone default — is simply "not armed"). */
  protected armed(id: number): boolean {
    return this.deleteConfirm()?.isArmed(id) ?? false;
  }
  /** The row being dragged (null otherwise). A field, not a signal: it
   *  only feeds the drop computation, nothing is rendered from it. */
  dragId: number | null = null;

  // ---- template event handlers (the repo's emit-through-method convention) --

  onRetry(): void {
    this.retry.emit();
  }

  onEdit(row: AdminGuidancePostDto): void {
    this.edit.emit(row);
  }

  onPublish(row: AdminGuidancePostDto): void {
    this.publish.emit(row);
  }

  onUnpublish(row: AdminGuidancePostDto): void {
    this.unpublish.emit(row);
  }

  onRequestDelete(id: number): void {
    this.requestDelete.emit(id);
  }

  onConfirmDelete(id: number): void {
    this.confirmDelete.emit(id);
  }

  onCancelDelete(): void {
    this.cancelDelete.emit();
  }

  // ---- manual ordering ---------------------------------------------------

  /** The row index for a move-button disable-state (boundary). */
  protected index(row: AdminGuidancePostDto): number {
    return (this.rows() ?? []).findIndex((r) => r.id === row.id);
  }

  /** The Published column's instant (PUBLISHED rows only; null = the
   *  merge has no entry for the slug yet — the column renders "—"). */
  protected publishedAtFor(row: AdminGuidancePostDto): string | null {
    if (row.status !== 'PUBLISHED') {
      return null;
    }
    return this.publishedAt().get(row.slug) ?? null;
  }

  /** Move one post to the top / one step up / one step down (PRIMARY
   *  mechanism). The boundary buttons are disabled in the template; the
   *  guards here are the same bounds as a safety net. Emits the full
   *  reordered list — the page performs the submission. Page-local when
   *  paged: a move never crosses a page boundary (the DnD-when-single-
   *  page covers the whole scope; multi-page lists are not reorderable
   *  at all). */
  movePost(id: number, direction: 'top' | 'up' | 'down'): void {
    const rows = this.rows() ?? [];
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0 || !this.reorderable() || this.busy()) {
      return;
    }
    const target = direction === 'top' ? 0 : direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) {
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    this.reorder.emit(next);
  }

  /** dragstart: remember which row the drag started on. */
  onDragStart(event: DragEvent, row: AdminGuidancePostDto): void {
    if (!this.reorderable()) {
      return;
    }
    this.dragId = row.id;
    // Without a dataTransfer payload some browsers do not start the drag.
    // (jsdom leaves dataTransfer UNDEFINED — the truthy guard covers both
    // null and undefined.)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(row.id));
    }
  }

  /** dragover: allow the drop (prevents the browser's default navigation)
   *  and mark the row the cursor is over as the drop target. */
  onDragOver(event: DragEvent, row: AdminGuidancePostDto): void {
    if (this.dragId === null || !this.reorderable()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropTarget.set(row.id);
  }

  /** drop: the dragged row takes the target's position; emit the new
   *  full list (SECONDARY mechanism — the page submits it through the
   *  same endpoint as the buttons). */
  onDrop(event: DragEvent, targetRow: AdminGuidancePostDto): void {
    event.preventDefault();
    const draggedId = this.dragId;
    this.dragId = null;
    this.dropTarget.set(null);
    if (draggedId === null || draggedId === targetRow.id || !this.reorderable() || this.busy()) {
      return;
    }
    const rows = this.rows() ?? [];
    const from = rows.findIndex((r) => r.id === draggedId);
    const to = rows.findIndex((r) => r.id === targetRow.id);
    if (from < 0 || to < 0) {
      return; // stale list (a concurrent change) — nothing to submit
    }
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.reorder.emit(next);
  }

  /** dragend: the drag finished (anywhere) — clear the highlight. */
  onDragEnd(): void {
    this.dragId = null;
    this.dropTarget.set(null);
  }
}
