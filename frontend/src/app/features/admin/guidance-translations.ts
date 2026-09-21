import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LOCALES } from '../../core/i18n/locale';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { AdminGuidancePostDto, GuidanceTranslationDto } from '../../core/models';
import { ConfirmAction } from '../../shared/confirm-action';

/**
 * The translations section (bilingual-guidance): the open post's
 * per-locale rows under the editor form (edit mode only — a create-mode
 * post has no id yet).
 *
 * The rows, the translation-authoring mode and the delete outcomes live
 * on the AdminPage (they interlock with the editor state machine); this
 * section renders the rows and owns the two-tap delete strip's UI.
 *
 * Add a missing locale (the editor recreates in translation-authoring
 * mode, prefilled from the on-screen row); delete a foreign one (the
 * two-tap confirm — the home-locale row is the post itself and is never
 * offered the trigger). Editing an existing one is the ordinary scoped
 * edit (the content-language select).
 */
@Component({
  selector: 'app-guidance-translations',
  imports: [TranslatePipe],
  templateUrl: './guidance-translations.html',
  styleUrl: './guidance-translations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceTranslations {
  /** The open post (edit mode — the section never renders in create
   *  mode: a create-mode post has no id yet). The page instantiates the
   *  panel only once the post is open (the template's @if), so null
   *  never reaches the rendered form; the default keeps the input
   *  binding total, the editor's own convention. */
  readonly post = input<AdminGuidancePostDto | null>(null);
  /** The post's translation rows (null = loading; [] = loaded and
   *  empty — a shell post). The home-locale row is always present (the
   *  server guarantees it). */
  readonly rows = input<GuidanceTranslationDto[] | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The locale a NEW translation is being authored in (null = the
   *  ordinary edit form) — while set, the add-buttons are held and the
   *  delete triggers stay hidden (the editor is recreating). */
  readonly translationTarget = input<string | null>(null);
  /** The two-tap delete confirm, keyed by LOCALE: the PAGE owns the
   *  instance (the editor-close paths disarm it); this template renders
   *  the trigger and the strip. (Repo convention: explicit default —
   *  null = "no armed state". */
  readonly deleteConfirm = input<ConfirmAction<string> | null>(null);

  /** The two-tap delete's armed state for a locale (a null instance —
   *  the standalone default — is simply "not armed"). */
  protected armed(locale: string): boolean {
    return this.deleteConfirm()?.isArmed(locale) ?? false;
  }

  /** The add-buttons' target locale (the editor recreates in
   *  translation-authoring mode — the page's startTranslation). */
  readonly start = output<string>();
  /** The two-tap delete: tap 1 (arm) / Cancel / tap 2 (the DELETE goes
   *  out from the page). */
  readonly requestDelete = output<string>();
  readonly cancelDelete = output<void>();
  readonly confirmDelete = output<string>();

  // ---- template event handlers (the repo's emit-through-method convention) --

  onStart(locale: string): void {
    this.start.emit(locale);
  }

  onRequestDelete(locale: string): void {
    this.requestDelete.emit(locale);
  }

  onCancelDelete(): void {
    this.cancelDelete.emit();
  }

  onConfirmDelete(locale: string): void {
    this.confirmDelete.emit(locale);
  }

  /** The locales the add-buttons offer: every supported locale minus the
   *  ones the post already has a translation row in (the list loads
   *  locale-ordered; an empty list offers every locale). */
  protected readonly addableLocales = computed(() => {
    const rows = this.rows() ?? [];
    return LOCALES.filter((l) => !rows.some((t) => t.locale === l));
  });

  /** The post's home locale (the null-post default never renders). */
  protected get homeLocale(): string {
    return this.post()?.homeLocale ?? '';
  }
}
