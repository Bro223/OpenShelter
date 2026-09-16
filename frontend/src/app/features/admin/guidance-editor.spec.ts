import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import type {
  AdminGuidancePostDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  UpdateGuidancePostRequest,
} from '../../core/models';
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

/** The host: post null = create mode, a post = edit mode (the prefill runs
 *  in the editor's ngOnInit — so the inputs are set BEFORE the first
 *  detectChanges, like the page binds them). */
@Component({
  imports: [GuidanceEditor],
  template: `<app-guidance-editor
    [post]="post"
    [mediaAssets]="assets"
    [busy]="busy"
    [serverError]="error"
    (save)="onSave($event)"
    (cancel)="cancelled = true"
  />`,
})
class Host {
  post: AdminGuidancePostDto | null = EDIT_POST;
  assets: MediaAssetDto[] | null = MEDIA_ASSETS;
  busy = false;
  error: string | null = null;
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
}

function createHost(
  post: AdminGuidancePostDto | null = EDIT_POST,
  assets: MediaAssetDto[] | null = MEDIA_ASSETS,
): EditorHarness {
  TestBed.configureTestingModule({ imports: [Host] });
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
  };
}

function inputById(
  root: HTMLElement,
  id: string,
): HTMLInputElement | HTMLTextAreaElement | null {
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
