import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import type {
  AdminGuidancePostDto,
  GuidanceTranslationDto,
  MediaAssetDto,
} from '../../core/models';
import type { Locale } from '../../core/i18n/locale';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';
import { GuidanceEditor, type GuidanceEditorSave } from './guidance-editor';
import { GuidanceOrderList } from './guidance-order-list';
import { GuidanceTranslations } from './guidance-translations';

/**
 * The Guidance tab panel: the authoring surface —
 * the content-language select (the ONE admin-controlled language: it
 * scopes the list, the editor prefill, saves and reorders), the search
 * (submit-based, the term is URL-backed), the inline editor + the
 * translation rows under it, and the paged post list with its shared
 * page + size control.
 *
 * Presentation only (the extracted-panel contract): the page owns every
 * state signal, the confirm instances, the fetch sequence guards and the
 * gateway calls; the panel renders the surface and emits the intents.
 *
 * The editor's hero picker reuses the MEDIA library's rows — the current
 * PAGE of the paged library (the owner's "every admin list pages" rule
 * made the picker page-scoped; the default page 1 / size 20 is what the
 * picker sees, and the picker's own scroll covers a long list).
 */
@Component({
  selector: 'app-guidance-panel',
  imports: [
    ReactiveFormsModule,
    LoadingIndicator,
    ListState,
    Pagination,
    TranslatePipe,
    GuidanceEditor,
    GuidanceOrderList,
    GuidanceTranslations,
  ],
  templateUrl: './guidance-panel.html',
  styleUrl: './guidance-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidancePanel {
  /** The admin's CONTENT language (the select's value). */
  readonly contentLocale = input.required<Locale>();
  /** The supported locales — the select renders from this list. */
  readonly locales = input.required<readonly Locale[]>();
  /** The search input (the PAGE owns the control). */
  readonly search = input.required<FormControl<string>>();
  /** The APPLIED search term (the URL's `q` — distinct from the input's
   *  unsubmitted draft). */
  readonly appliedQuery = input('');
  /** The open editor: null = closed; 'new' = create mode; a post = edit
   *  mode (the page's id-keyed detail fetch). */
  readonly editor = input<AdminGuidancePostDto | 'new' | null>(null);
  /** The editor detail's load state (edit mode's id-keyed GET). */
  readonly editorLoading = input(false);
  /** The failed save's server message (the editor stays open). */
  readonly editorError = input<string | null>(null);
  /** The open post in EDIT mode (null in create mode / closed). */
  readonly editorPost = input<AdminGuidancePostDto | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The editor's hero picker rows: the media library's current page
   *  (newest first); null = not loaded yet. */
  readonly mediaAssets = input<MediaAssetDto[] | null>(null);
  /** The locale the open editor is authoring a NEW translation in;
   *  null = the ordinary create/edit form. */
  readonly translationTarget = input<string | null>(null);
  /** The locale whose EXISTING translation row the open editor is
   *  editing in place; null = not in translation-edit mode. */
  readonly translationEditTarget = input<string | null>(null);
  /** The open post's translation rows (null = not loaded). */
  readonly translations = input<GuidanceTranslationDto[] | null>(null);
  /** The translation delete's two-tap confirm (the PAGE owns the
   *  instance — the home-locale row is never offered the trigger). */
  readonly translationDeleteConfirm = input.required<ConfirmAction<string>>();
  /** The list's current page (server-paged, scoped + search-filtered);
   *  null = loading; [] = loaded and empty. */
  readonly rows = input<AdminGuidancePostDto[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** Manual order (the DnD, the move buttons AND the full-list order PUT)
   *  is ALL-ROWS-by-nature: only while the whole (searched, scoped) list
   *  fits the current page. */
  readonly reorderable = input(false);
  /** The Published column's instants (slug -> publishedAt) — merged from
   *  the permit-all public index (a failed merge degrades to "—"). */
  readonly publishedAt = input<Map<string, string>>(new Map());
  /** The two-tap delete confirm (the PAGE owns the instance). */
  readonly deleteConfirm = input.required<ConfirmAction<number>>();
  /** The current page (1-based), its count and the out-of-range flag —
   *  a past-the-end page renders the explicit notice, never a bare
   *  empty list (the shared component). */
  readonly page = input(1);
  readonly pages = input(1);
  readonly size = input(20);
  readonly outOfRange = input(false);
  /** The SELECTABLE SIZES — the range the endpoint serves (limit 1..200
   *  honours all of 10..100 step 10): a plain property, the app's fixed
   *  paging vocabulary (the shared control's own default input). */
  protected readonly pageSizes = PAGE_SIZES;

  readonly contentLanguageChange = output<Event>();
  readonly searchSubmit = output<void>();
  readonly searchClear = output<void>();
  readonly openEditor = output<AdminGuidancePostDto | null>();
  readonly closeEditor = output<void>();
  readonly savePost = output<GuidanceEditorSave>();
  readonly startTranslation = output<string>();
  readonly editTranslation = output<string>();
  readonly requestDeleteTranslation = output<string>();
  readonly cancelDeleteTranslation = output<void>();
  readonly confirmDeleteTranslation = output<string>();
  readonly retry = output<void>();
  readonly edit = output<AdminGuidancePostDto>();
  readonly publish = output<AdminGuidancePostDto>();
  readonly unpublish = output<AdminGuidancePostDto>();
  readonly requestDelete = output<number>();
  readonly confirmDelete = output<number>();
  readonly cancelDelete = output<void>();
  readonly reorder = output<AdminGuidancePostDto[]>();
  readonly navigate = output<{ page: number; size: number }>();
  readonly goFirstPage = output<void>();

  onContentLanguageChange(event: Event): void {
    this.contentLanguageChange.emit(event);
  }

  onSearchSubmit(): void {
    this.searchSubmit.emit();
  }

  onSearchClear(): void {
    this.searchClear.emit();
  }

  onOpenEditor(post: AdminGuidancePostDto | null): void {
    this.openEditor.emit(post);
  }

  onCloseEditor(): void {
    this.closeEditor.emit();
  }

  onSavePost(save: GuidanceEditorSave): void {
    this.savePost.emit(save);
  }

  onStartTranslation(locale: string): void {
    this.startTranslation.emit(locale);
  }

  onEditTranslation(locale: string): void {
    this.editTranslation.emit(locale);
  }

  onRequestDeleteTranslation(locale: string): void {
    this.requestDeleteTranslation.emit(locale);
  }

  onCancelDeleteTranslation(): void {
    this.cancelDeleteTranslation.emit();
  }

  onConfirmDeleteTranslation(locale: string): void {
    this.confirmDeleteTranslation.emit(locale);
  }

  onRetry(): void {
    this.retry.emit();
  }

  onEdit(post: AdminGuidancePostDto): void {
    this.edit.emit(post);
  }

  onPublish(post: AdminGuidancePostDto): void {
    this.publish.emit(post);
  }

  onUnpublish(post: AdminGuidancePostDto): void {
    this.unpublish.emit(post);
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

  onReorder(nextRows: AdminGuidancePostDto[]): void {
    this.reorder.emit(nextRows);
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }
}
