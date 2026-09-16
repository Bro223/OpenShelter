import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  input,
  output,
  signal,
} from '@angular/core';
import {
  type AbstractControl,
  type ValidationErrors,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type {
  AdminGuidancePostDto,
  GuidanceStatus,
  MediaAssetDto,
  UpdateGuidancePostRequest,
  CreateGuidancePostRequest,
} from '../../core/models';
import { nameBlankValidator } from '../../shared/form-helpers';
import { BannerComponent } from '../../shared/banner.component';

/**
 * The generated-slug shape (the backend's SlugFactory validator
 * `^[a-z0-9]+(-[a-z0-9]+)*$`). The UI enforces the same shape up front so
 * an admin-supplied slug never spends a round trip on a 400; a BLANK slug
 * is always allowed (create: the server derives it from the title; edit:
 * the post keeps its current one).
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What Save emits — the page routes `id === null` to the create endpoint
 *  (the POST body) and a given id to the update endpoint (the PUT body). */
export interface GuidanceEditorSave {
  /** null = create (no id yet); the post id for an edit. */
  id: number | null;
  /** Create mode: the POST /admin/guidance payload. */
  create?: CreateGuidancePostRequest;
  /** Edit mode: the PUT /admin/guidance/{id} payload. `status` is NOT part
   *  of it — the publication state moves only through publish/unpublish. */
  update?: UpdateGuidancePostRequest;
}

/**
 * The slug's shape, enforced ONLY when non-blank (blank = optional — the
 * server derives the slug from the title on create and keeps the current
 * one on update). Mirrors the backend validator so the UI and the 400
 * agree.
 */
export function slugShapeValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return null;
  }
  return SLUG_PATTERN.test(value) ? null : { slug: true };
}

/**
 * The guidance create/edit form (crisis-guidance D8/D9 — the admin
 * authoring surface). Pure form component: the PARENT (AdminPage) owns
 * every gateway call and the page-level banners — this component validates
 * (incl. the hero/alt cross-field rule, shown up front so the server's
 * 400 never fires for it) and emits the wire payload on Save.
 *
 * The body is a plain `<textarea>` over the stored (server-sanitized)
 * HTML — no WYSIWYG: sanitization is defence in depth on the server, and
 * the editor round-trips exactly what is stored — the server re-sanitizes on every write.
 */
@Component({
  selector: 'app-guidance-editor',
  imports: [ReactiveFormsModule, TranslatePipe, BannerComponent],
  templateUrl: './guidance-editor.html',
  styleUrl: './guidance-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceEditor implements OnInit {
  /** null = create mode; the post being edited for an edit (the PARENT
   *  passes the id-keyed GET result — the stored bodyHtml round-trips). */
  readonly post = input<AdminGuidancePostDto | null>(null);
  /** The media-library assets for the hero picker (null = still loading). */
  readonly mediaAssets = input<MediaAssetDto[] | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The failed save's server message (echoed in the editor banner); the
   *  editor stays open so the admin keeps the draft. */
  readonly serverError = input<string | null>(null);

  readonly save = output<GuidanceEditorSave>();
  readonly cancel = output<void>();

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        // Whitespace-only titles pass Validators.required — the shared
        // blank validator mirrors the backend @NotBlank.
        nameBlankValidator,
        Validators.maxLength(255),
      ],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200), slugShapeValidator],
    }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nameBlankValidator],
    }),
    locale: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(5)] }),
    pinned: new FormControl(false, { nonNullable: true }),
    /** The picked hero's media-library id; null = no hero. */
    heroImageId: new FormControl<number | null>(null, { nonNullable: true }),
    heroImageAlt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    /** Create mode only: DRAFT by default, PUBLISHED = one-shot
     *  write-and-publish. The edit form never sends it. */
    status: new FormControl<GuidanceStatus>('DRAFT', { nonNullable: true }),
  });

  /** The hero-picker panel's open state (toggled from the hero field). */
  protected readonly heroPickerOpen = signal(false);

  ngOnInit(): void {
    const post = this.post();
    if (post === null) {
      return; // create mode — the form starts blank
    }
    this.form.get('title')?.setValue(post.title);
    this.form.get('slug')?.setValue(post.slug);
    // The editor round-trips what is stored (the sanitizer output).
    this.form.get('body')?.setValue(post.bodyHtml);
    this.form.get('locale')?.setValue(post.locale);
    this.form.get('pinned')?.setValue(post.pinned);
    this.form.get('heroImageId')?.setValue(post.heroImageId);
    this.form.get('heroImageAlt')?.setValue(post.heroImageAlt ?? '');
  }

  // ---- form accessors (the template's error-line convention) -----------
  protected title(): FormControl<string> {
    return this.form.get('title') as FormControl<string>;
  }

  protected slug(): FormControl<string> {
    return this.form.get('slug') as FormControl<string>;
  }

  protected body(): FormControl<string> {
    return this.form.get('body') as FormControl<string>;
  }

  protected locale(): FormControl<string> {
    return this.form.get('locale') as FormControl<string>;
  }

  protected heroImageId(): FormControl<number | null> {
    return this.form.get('heroImageId') as FormControl<number | null>;
  }

  protected heroImageAlt(): FormControl<string> {
    return this.form.get('heroImageAlt') as FormControl<string>;
  }

  /**
   * The hero/alt cross-field rule (the server's 400, shown up front):
   * 'required' = a hero is set with a blank alt; 'forbidden' = an alt
   * without a hero; null = paired correctly. A plain method (not a
   * computed) — the form controls are not signals, so a computed would
   * cache its first evaluation.
   */
  protected heroAltViolation(): 'required' | 'forbidden' | null {
    const hero = this.heroImageId().value;
    const alt = this.heroImageAlt().value.trim();
    if (hero !== null && alt === '') {
      return 'required';
    }
    if (hero === null && alt !== '') {
      return 'forbidden';
    }
    return null;
  }

  /** The Save guard: the form's own validity AND the cross-field rule. */
  protected canSave(): boolean {
    return this.form.valid && this.heroAltViolation() === null;
  }

  /**
   * The selected hero for the current-image card: the library asset
   * matched by id, falling back to the post's stored hero reference when
   * the library list has not loaded it yet (the serving URL is public).
   */
  protected selectedHero(): { url: string; name: string } | null {
    const id = this.heroImageId().value;
    if (id === null) {
      return null;
    }
    const match = (this.mediaAssets() ?? []).find((a) => a.id === id);
    if (match) {
      return { url: match.url, name: match.originalFilename };
    }
    const post = this.post();
    if (post === null || post.heroImageUrl === null) {
      return null;
    }
    return { url: post.heroImageUrl, name: post.heroImageAlt ?? post.title };
  }

  // ---- hero picker -------------------------------------------------------
  /** Pick the asset as the hero (the picker closes; the alt stays as typed
   *  — the cross-field rule takes over when it is blank). */
  selectHero(asset: MediaAssetDto): void {
    this.heroImageId().setValue(asset.id);
    this.heroPickerOpen.set(false);
  }

  /** Clear the hero; the asset itself stays in the media library. */
  removeHero(): void {
    this.heroImageId().setValue(null);
  }

  // ---- submit / cancel ----------------------------------------------------
  /**
   * Validate and emit the wire payload. Blank slug/locale are OMITTED
   * (create: the server derives the slug and uses its default locale;
   * edit: the post keeps its current slug). The alt is trimmed and sent
   * as null when there is no hero (the pairing rule, both directions).
   */
  onSave(): void {
    this.form.markAllAsTouched();
    const alt = this.heroImageAlt().value.trim();
    const hero = this.heroImageId().value;
    if (this.form.invalid) {
      return; // the field errors are rendered from the touched state
    }
    if (hero !== null && alt === '') {
      return; // the altRequired error line is rendered from the violation
    }
    if (hero === null && alt !== '') {
      return; // the altForbidden error line is rendered from the violation
    }
    const title = this.title().value.trim();
    const slug = this.slug().value.trim();
    const body = this.body().value.trim();
    const locale = this.locale().value.trim();
    const pinned = this.form.get('pinned')?.value ?? false;
    const common = {
      title,
      ...(slug === '' ? {} : { slug }),
      body,
      ...(locale === '' ? {} : { locale }),
      pinned,
      heroImageId: hero,
      heroImageAlt: hero === null ? null : alt,
    };
    const post = this.post();
    if (post === null) {
      this.save.emit({
        id: null,
        create: { ...common, status: this.form.get('status')?.value ?? 'DRAFT' },
      });
    } else {
      this.save.emit({ id: post.id, update: common });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
