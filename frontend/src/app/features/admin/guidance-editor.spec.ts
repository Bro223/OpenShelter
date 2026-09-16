import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import type {
  AdminGuidancePostDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  UpdateGuidancePostRequest,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { ApiError } from '../../core/api-error';
import { GuidanceEditor, type GuidanceEditorSave, slugShapeValidator } from './guidance-editor';

// ---- fixtures ----------------------------------------------------------------

const MEDIA_ASSETS: MediaAssetDto[] = [
  {
    id: 5,
    url: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    storedFilename: '0123456789abcdef0123456789abcdef.jpg',
    originalFilename: 'kelder.jpg',
    contentType: 'image/jpeg',
    width: 1600,
    height: 900,
    sizeBytes: 204800,
    createdAt: '2026-09-01T09:00:00Z',
    reusedBy: 1,
  },
  {
    id: 6,
    url: '/api/media/fedcba9876543210fedcba9876543210.png',
    storedFilename: 'fedcba9876543210fedcba9876543210.png',
    originalFilename: 'maapilt.png',
    contentType: 'image/png',
    width: 800,
    height: 600,
    sizeBytes: 51200,
    createdAt: '2026-09-02T09:00:00Z',
    reusedBy: 0,
  },
];

const EDIT_POST: AdminGuidancePostDto = {
  id: 11,
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: '<p>Pöördu peavarjendisse.</p>',
  locale: 'et',
  status: 'PUBLISHED',
  pinned: true,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

/** The edit-mode DRAFT counterpart of EDIT_POST (the draft-state tests). */
const DRAFT_POST: AdminGuidancePostDto = { ...EDIT_POST, id: 12, status: 'DRAFT' };

const NEW_ASSET: MediaAssetDto = {
  id: 7,
  url: '/api/media/0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f.webp',
  storedFilename: '0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f.webp',
  originalFilename: 'varjund.webp',
  contentType: 'image/webp',
  width: 1200,
  height: 800,
  sizeBytes: 102400,
  createdAt: '2026-09-03T09:00:00Z',
  reusedBy: 0,
};
/** The host: post null = create mode, a post = edit mode (the prefill runs
 *  in the editor's ngOnInit — so the inputs are set BEFORE the first
 *  detectChanges, like the page binds them). `error` is a REAL signal:
 *  the app runs zoneless, so a plain host property would not re-render
 *  the child's serverError input after creation (the repo's zoneless
 *  spec convention). */
@Component({
  imports: [GuidanceEditor],
  template: `<app-guidance-editor
    [post]="post"
    [mediaAssets]="assets"
    [busy]="busy"
    [serverError]="error()"
    (save)="onSave($event)"
    (cancel)="cancelled = true"
  />`,
})
class Host {
  post: AdminGuidancePostDto | null = EDIT_POST;
  assets: MediaAssetDto[] | null = MEDIA_ASSETS;
  busy = false;
  error = signal<string | null>(null);
  lastSave: GuidanceEditorSave | null = null;
  cancelled = false;
  onSave(event: GuidanceEditorSave): void {
    this.lastSave = event;
  }
}

interface EditorHarness {
  host: Host;
  editor: GuidanceEditor;
  element: HTMLElement;
  fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  admin: FakeAdminGateway;
}

// ---- hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics) ----

class FakeAdminGateway {
  uploadMediaAsset = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

function createHost(
  post: AdminGuidancePostDto | null = EDIT_POST,
  assets: MediaAssetDto[] | null = MEDIA_ASSETS,
): EditorHarness {
  const admin = new FakeAdminGateway();
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [{ provide: AdminGateway, useValue: admin }],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.post = post;
  fixture.componentInstance.assets = assets;
  fixture.detectChanges();
  const debug = fixture.debugElement.query(By.directive(GuidanceEditor))!;
  if (!debug) {
    throw new Error('GuidanceEditor not rendered');
  }
  return {
    host: fixture.componentInstance,
    editor: debug.componentInstance as GuidanceEditor,
    element: debug.nativeElement as HTMLElement,
    fixture,
    admin,
  };
}

function inputById(root: HTMLElement, id: string): HTMLInputElement | HTMLTextAreaElement | null {
  return root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => (b.textContent ?? '').trim() === text,
    ) ?? null
  );
}

/** Set a reactive control's value through the DOM (the page-spec
 *  convention: dispatch 'input', then change detection). */
function typeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  fx: { detectChanges(): void },
): void {
  el.value = value;
  el.dispatchEvent(new Event('input'));
  fx.detectChanges();
}

/** Fill the required title + body (create-mode tests start blank). */
function fillRequired(h: EditorHarness, title = 'Uus post', body = '<p>Keha</p>'): void {
  typeValue(inputById(h.element, 'ge-title')!, title, h.fixture);
  typeValue(inputById(h.element, 'ge-body')!, body, h.fixture);
}

/** Drive the file input the way a real selection would: set `files`
 *  (a plain array — the page-spec convention) and dispatch 'change'. */
function selectFile(input: HTMLInputElement, file: File): void {
  // configurable: the busy-block test selects twice on the same input.
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

/** Let in-flight gateway promises + zone work settle, then re-detect
 *  (the page-spec settle shape). */
async function settle(fixture: {
  whenStable(): Promise<unknown>;
  detectChanges(): void;
}): Promise<void> {
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('GuidanceEditor', () => {
  // ---- create mode: prefill + the submit payload ---------------------------

  it('create mode starts blank (status DRAFT, no hero) and Save emits the create payload', () => {
    const h = createHost(null);
    expect(h.editor.form.get('title')?.value).toBe('');
    expect(h.editor.form.get('body')?.value).toBe('');
    expect(h.editor.form.get('status')?.value).toBe('DRAFT');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();

    fillRequired(h, 'Varjumine droonirünnaku ajal', '<p>Pöördu peavarjendisse.</p>');
    typeValue(inputById(h.element, 'ge-locale')!, 'et', h.fixture);
    (inputById(h.element, 'ge-pinned') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBeNull();
    expect(h.host.lastSave?.create).toEqual<CreateGuidancePostRequest>({
      title: 'Varjumine droonirünnaku ajal',
      body: '<p>Pöördu peavarjendisse.</p>',
      locale: 'et',
      pinned: true,
      heroImageId: null,
      heroImageAlt: null,
      status: 'DRAFT',
    });
    // The blank slug is OMITTED (the server derives it from the title).
    expect(h.host.lastSave?.create).not.toHaveProperty('slug');
  });

  it('Save trims the title (the backend sees no leading/trailing whitespace)', () => {
    const h = createHost(null);
    fillRequired(h, '  Varjumine droonirünnaku ajal  ');
    h.editor.onSave();
    expect(h.host.lastSave?.create?.title).toBe('Varjumine droonirünnaku ajal');
  });

  it('a blank/whitespace title is blocked with the required copy (nothing emitted)', () => {
    const h = createHost(null);
    fillRequired(h, '   ', '<p>Keha</p>');
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain('A title is required.');
  });

  it('Save (create) with the publish choice emits status PUBLISHED (one-shot write-and-publish)', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-status-published') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();

    expect(h.host.lastSave?.id).toBeNull();
    expect(h.host.lastSave?.create?.status).toBe('PUBLISHED');
  });

  it('an explicit slug that breaks the generated shape is blocked with the shape copy', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-slug')!, 'Minu post!', h.fixture);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave).toBeNull();
    expect(h.element.textContent).toContain(
      'Use lowercase letters, numbers and dashes (no leading or trailing dash).',
    );
  });

  it('a valid explicit slug is sent verbatim in the create payload', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-slug')!, 'minu-post', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.create?.slug).toBe('minu-post');
  });

  // ---- the hero/alt cross-field rule (the server's 400, shown up front) ----

  it('choosing a hero with a blank alt blocks Save with the altRequired copy; the alt unblocks', () => {
    const h = createHost(null);
    fillRequired(h);

    // Open the picker and select the first asset.
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    const items = h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item');
    expect(items.length).toBe(2);
    items[0]!.click();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);

    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();

    // Filling the alt unblocks (the rule resolves both ways).
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder, vaade sissepääsust', h.fixture);
    expect(save?.disabled).toBe(false);
    h.editor.onSave();
    expect(h.host.lastSave?.create?.heroImageId).toBe(5);
    expect(h.host.lastSave?.create?.heroImageAlt).toBe('Kelder, vaade sissepääsust');
  });

  it('an alt without a hero is blocked with the altForbidden copy (the 400, both directions)', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-alt')!, 'Ilma pildita', h.fixture);

    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');

    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
  });

  it('removing the hero (with a typed alt) blocks Save again — the rule holds in both directions', () => {
    const h = createHost(null);
    fillRequired(h);
    typeValue(inputById(h.element, 'ge-alt')!, 'Kelder', h.fixture);
    h.editor.selectHero(MEDIA_ASSETS[0]!);
    h.fixture.detectChanges();
    h.editor.removeHero();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('Remove the alt text or choose a hero image.');
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();
  });

  // ---- edit mode: prefill + the update payload ------------------------------

  it('edit mode prefills from the post (title, stored body, hero, alt, locale, pinned, slug)', () => {
    const h = createHost(EDIT_POST);
    expect(h.editor.form.get('title')?.value).toBe(EDIT_POST.title);
    expect(h.editor.form.get('slug')?.value).toBe(EDIT_POST.slug);
    // The stored (sanitized) HTML is what the editor round-trips.
    expect(h.editor.form.get('body')?.value).toBe(EDIT_POST.bodyHtml);
    expect(h.editor.form.get('locale')?.value).toBe('et');
    expect(h.editor.form.get('pinned')?.value).toBe(true);
    expect(h.editor.form.get('heroImageId')?.value).toBe(5);
    expect(h.editor.form.get('heroImageAlt')?.value).toBe('Kelder, vaade sissepääsust');

    // The hero card shows the selected asset (the picker is closed).
    expect(h.element.querySelector('.guidance-editor__hero-current')).not.toBeNull();
    // The status radios are ABSENT — the publication state is owned by the
    // row actions (the note explains it).
    expect(inputById(h.element, 'ge-status-published')).toBeNull();
    expect(h.element.textContent).toContain(
      'The publication state is changed with the Publish and Unpublish actions on the list.',
    );
    h.fixture.detectChanges();
  });

  it('Save (edit) emits {id, update} with NO status field (the PUT body)', () => {
    const h = createHost(EDIT_POST);
    // The prefill is already valid (hero + alt paired) — save as-is.
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update).toEqual<UpdateGuidancePostRequest>({
      title: EDIT_POST.title,
      slug: EDIT_POST.slug,
      body: EDIT_POST.bodyHtml,
      locale: 'et',
      pinned: true,
      heroImageId: 5,
      heroImageAlt: 'Kelder, vaade sissepääsust',
    });
    expect(h.host.lastSave?.update).not.toHaveProperty('status');
    expect(h.host.lastSave?.create).toBeUndefined();
  });

  it('a blanked slug in edit mode is OMITTED (the post keeps its current slug)', () => {
    const h = createHost(EDIT_POST);
    typeValue(inputById(h.element, 'ge-slug')!, '', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.id).toBe(11);
    expect(h.host.lastSave?.update).not.toHaveProperty('slug');
  });

  it('clearing the hero in edit mode emits heroImageId null + alt null', () => {
    const h = createHost(EDIT_POST);
    // Clearing the hero also blanks the alt (the pair stays consistent).
    buttonByText(h.element, 'Remove image')!.click();
    h.fixture.detectChanges();
    typeValue(inputById(h.element, 'ge-alt')!, '', h.fixture);

    h.editor.onSave();

    expect(h.host.lastSave?.update?.heroImageId).toBeNull();
    expect(h.host.lastSave?.update?.heroImageAlt).toBeNull();
  });

  // ---- picker states ---------------------------------------------------------

  it('the picker shows the loading line while the assets are null', () => {
    const h = createHost(null, null);
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('Loading the media library…');
  });

  it('the picker shows the empty line for an empty library', () => {
    const h = createHost(null, []);
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('No images in the media library yet');
  });

  it('Cancel emits cancel (the page closes the editor and keeps no draft)', () => {
    const h = createHost(null);
    buttonByText(h.element, 'Cancel')!.click();
    h.fixture.detectChanges();
    expect(h.host.cancelled).toBe(true);
  });

  // ---- hero upload (the picker's inline upload — no library detour) -------

  it('upload: choosing a file calls the gateway and auto-selects the new asset', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockResolvedValue(NEW_ASSET);
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp');
    const file = new File(['x'.repeat(102400)], 'varjund.webp', { type: 'image/webp' });

    selectFile(input, file);
    await settle(h.fixture);

    expect(h.admin.uploadMediaAsset).toHaveBeenCalledWith(file);
    expect(h.editor.form.get('heroImageId')?.value).toBe(NEW_ASSET.id);
    // The current-image card shows the new asset; the picker closed
    // (no second click needed).
    const thumb = h.element.querySelector<HTMLImageElement>('.guidance-editor__hero-current img');
    expect(thumb?.getAttribute('src')).toBe(NEW_ASSET.url);
    expect(h.element.querySelector('.hero-picker')).toBeNull();
    // The picker list refreshed: the new asset is FIRST (newest first).
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    const items = h.element.querySelectorAll<HTMLButtonElement>('.hero-picker__item');
    expect(items.length).toBe(3);
    expect(items[0]!.textContent).toContain('varjund.webp');
  });

  it('upload: the busy state blocks a second upload (the input is disabled, one gateway call)', async () => {
    const h = createHost(null);
    let resolveUpload: (asset: MediaAssetDto) => void = () => undefined;
    h.admin.uploadMediaAsset.mockReturnValue(
      new Promise<MediaAssetDto>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });

    selectFile(input, fileA);
    h.fixture.detectChanges();
    expect(h.editor.uploading()).toBe(true);
    expect(input.disabled).toBe(true);

    // A second selection while in flight is ignored (the guard, not the
    // disabled attribute, is what enforces it).
    selectFile(input, fileB);
    h.fixture.detectChanges();
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledWith(fileA);

    resolveUpload(NEW_ASSET);
    await settle(h.fixture);
    expect(h.admin.uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(false);
    expect(h.editor.form.get('heroImageId')?.value).toBe(NEW_ASSET.id);
  });

  it('upload: a 413 shows the cap message and selects nothing (the form is untouched)', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(
      apiError(413, 'image exceeds the 5 MB cap', '/admin/media'),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'.repeat(51200)], 'big.png', { type: 'image/png' }));
    await settle(h.fixture);

    // The MAPPED message names the cap (the server text is not echoed).
    expect(h.element.textContent).toContain('That image is larger than the 5 MB upload cap.');
    expect(h.element.textContent).not.toContain('image exceeds the 5 MB cap');
    // No partial state: nothing selected, the picker list unchanged,
    // the input reset (the same file stays re-selectable).
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
    expect(input.value).toBe('');
    buttonByText(h.element, 'Choose from the media library')!.click();
    h.fixture.detectChanges();
    expect(h.element.querySelectorAll('.hero-picker__item').length).toBe(2);
  });

  it('upload: a 400 shows the unsupported-type message (no server echo)', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(
      apiError(400, 'file is not a readable image', '/admin/media'),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'], 'mitte-pilt.webp', { type: 'image/webp' }));
    await settle(h.fixture);

    expect(h.element.textContent).toContain(
      'That file is not a supported image (JPEG, PNG or WebP), or its type does not match.',
    );
    expect(h.element.textContent).not.toContain('file is not a readable image');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
  });

  it('upload: an unhandled failure (5xx) shows the generic retry copy', async () => {
    const h = createHost(null);
    h.admin.uploadMediaAsset.mockRejectedValue(
      apiError(500, 'internal error', '/admin/media'),
    );
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'], 'a.png', { type: 'image/png' }));
    await settle(h.fixture);

    expect(h.element.textContent).toContain('The image upload failed. Please try again.');
    expect(h.editor.form.get('heroImageId')?.value).toBeNull();
  });

  it('upload: the alt-required rule applies after an auto-selected hero', async () => {
    const h = createHost(null);
    fillRequired(h);
    h.admin.uploadMediaAsset.mockResolvedValue(NEW_ASSET);
    const input = inputById(h.element, 'ge-hero-upload') as HTMLInputElement;

    selectFile(input, new File(['x'.repeat(102400)], 'varjund.webp', { type: 'image/webp' }));
    await settle(h.fixture);

    // Exactly as picking from the library: hero set + blank alt = the
    // altRequired copy, Save blocked; the alt unblocks.
    expect(h.element.textContent).toContain('Alt text is required when a hero image is chosen.');
    const save = h.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);
    h.editor.onSave();
    expect(h.host.lastSave).toBeNull();

    typeValue(inputById(h.element, 'ge-alt')!, 'Varjund, vaade seest', h.fixture);
    expect(save?.disabled).toBe(false);
    h.editor.onSave();
    expect(h.host.lastSave?.create?.heroImageId).toBe(NEW_ASSET.id);
    expect(h.host.lastSave?.create?.heroImageAlt).toBe('Varjund, vaade seest');
  });

  // ---- the draft consequence (a draft save is never silent) ---------------

  it('a create-mode draft save shows the "saved as a draft" notice (consequence + way out)', () => {
    const h = createHost(null);
    fillRequired(h);

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain(
      'Saved as a draft. It is not visible on /blog until you publish it',
    );
  });

  it('the draft-save notice names the publish action (the way out)', () => {
    const h = createHost(null);
    fillRequired(h);

    h.editor.onSave();
    h.fixture.detectChanges();

    // The info treatment (a normal state, not the error banner).
    const notice = h.element.querySelector('.banner--info');
    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('Publish');
    expect(notice!.textContent).toContain('save and publish');
    expect(h.element.querySelector('.banner--error')).toBeNull();
  });

  it('a create-mode save-and-publish shows no draft notice', () => {
    const h = createHost(null);
    fillRequired(h);
    (inputById(h.element, 'ge-status-published') as HTMLInputElement).click();
    h.fixture.detectChanges();

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('Saved as a draft.');
    expect(h.element.querySelector('.banner')).toBeNull();
  });

  it('editing a draft: the at-a-glance line shows on open, and saving shows the draft notice', () => {
    const h = createHost(DRAFT_POST);
    h.fixture.detectChanges();

    // At a glance (before any save): the state line names the consequence
    // and the way out (the published post's complementary note is gone).
    expect(h.element.textContent).toContain(
      'This post is a draft — it is not visible on /blog until you publish it',
    );
    expect(h.element.textContent).toContain('Publish');
    expect(h.element.textContent).not.toContain(
      'The publication state is changed with the Publish and Unpublish actions on the list.',
    );

    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain(
      'Saved. It is still a draft, so it is not visible on /blog until you publish it',
    );
    const notice = h.element.querySelector('.banner--info');
    expect(notice!.textContent).toContain('Publish');
  });

  it('editing a published post keeps the complementary note and shows no draft notice (no nag)', () => {
    const h = createHost(EDIT_POST);
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('This post is a draft');
    h.editor.onSave();
    h.fixture.detectChanges();

    expect(h.element.textContent).not.toContain('Saved as a draft.');
    expect(h.element.textContent).not.toContain('still a draft');
    expect(h.element.querySelector('.banner')).toBeNull();
  });

  it('a failed draft save shows the error banner, not the "saved as a draft" notice', () => {
    const h = createHost(null);
    fillRequired(h);
    h.editor.onSave();
    h.fixture.detectChanges();
    expect(h.element.textContent).toContain('Saved as a draft.');

    // The parent keeps the editor open on a failed save (the server
    // message comes down through the serverError input).
    h.host.error.set('slug "uus-juhis" is already in use');
    h.fixture.detectChanges();

    expect(h.element.textContent).toContain('slug "uus-juhis" is already in use');
    expect(h.element.textContent).not.toContain('Saved as a draft.');
  });

  // ---- the slug validator (the shared unit) ----------------------------------

  it('slugShapeValidator allows blank and the generated shape, rejects the rest', () => {
    const ctrl = (value: string): FormControl => new FormControl(value, { nonNullable: true });
    expect(slugShapeValidator(ctrl(''))).toBeNull();
    expect(slugShapeValidator(ctrl('varjumine'))).toBeNull();
    expect(slugShapeValidator(ctrl('varjumine-droonirunnaku-ajal'))).toBeNull();
    expect(slugShapeValidator(ctrl('Minu post!'))).toEqual({ slug: true });
    expect(slugShapeValidator(ctrl('-leading'))).toEqual({ slug: true });
    expect(slugShapeValidator(ctrl('trailing-'))).toEqual({ slug: true });
  });
});
