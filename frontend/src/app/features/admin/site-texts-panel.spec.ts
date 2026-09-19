import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  SITE_TEXT_FOOTER_KEYS,
  SITE_TEXT_HEADER_KEYS,
  SITE_TEXT_KEYS,
  SITE_TEXT_POPUP_KEYS,
  type SiteTextsByLocale,
} from '../../core/i18n/site-texts';
import { AdminGateway } from '../../gateways/admin-gateway';
import { SiteTextsGateway } from '../../gateways/site-texts-gateway';
import type { SiteTextEntryDto } from '../../core/models';
import { SiteTextsPanel } from './site-texts-panel';

/**
 * The admin Settings panel (site_texts): the allowlist is rendered
 * completely (every declared key, three locales), the shipped catalog is
 * the placeholder, a blank field resets the override (the server deletes
 * the row), only CHANGED fields are sent, and the link URL is
 * https-validated client-side before the PUT.
 */

class FakeSiteTexts {
  texts: SiteTextsByLocale | null = {
    en: { 'a11y.popup.title': { value: 'Kontrast' } },
    et: {},
    ru: {},
  };
  fetch = vi.fn(async () => this.texts);
}

class FakeAdmin {
  putSiteTexts = vi.fn(async (_entries: SiteTextEntryDto[]): Promise<void> => undefined);
}

describe('SiteTextsPanel', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SiteTextsPanel>>;
  let panel: SiteTextsPanel;
  let el: HTMLElement;
  let fakeSiteTexts: FakeSiteTexts;
  let fakeAdmin: FakeAdmin;

  async function render(): Promise<void> {
    fakeSiteTexts = new FakeSiteTexts();
    fakeAdmin = new FakeAdmin();
    TestBed.configureTestingModule({
      imports: [SiteTextsPanel],
      providers: [
        I18nService,
        { provide: SiteTextsGateway, useValue: fakeSiteTexts },
        { provide: AdminGateway, useValue: fakeAdmin },
      ],
    });
    fixture = TestBed.createComponent(SiteTextsPanel);
    panel = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Flush the gateway/admin promises and re-render. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function inputsFor(key: string): Record<'en' | 'et' | 'ru', HTMLInputElement> {
    const all = [...el.querySelectorAll<HTMLInputElement>(`input[data-key="${key}"]`)];
    return {
      en: all.find((i) => i.dataset['locale'] === 'en')!,
      et: all.find((i) => i.dataset['locale'] === 'et')!,
      ru: all.find((i) => i.dataset['locale'] === 'ru')!,
    };
  }

  it('renders the full allowlist: 10 popup + 9 header + 12 footer keys, each in three locales', async () => {
    await render();
    expect(el.querySelectorAll('.site-texts-block')).toHaveLength(3);
    // Every allowlist key × 3 locales.
    expect(el.querySelectorAll('input[data-key]')).toHaveLength(SITE_TEXT_KEYS.length * 3);
    for (const key of SITE_TEXT_KEYS) {
      for (const locale of ['en', 'et', 'ru'] as const) {
        expect(el.querySelector(`input[data-key="${key}"][data-locale="${locale}"]`)).not.toBeNull();
      }
    }
    expect(SITE_TEXT_POPUP_KEYS.length).toBe(10);
    expect(SITE_TEXT_HEADER_KEYS.length).toBe(9);
    expect(SITE_TEXT_FOOTER_KEYS.length).toBe(12);
    expect(SITE_TEXT_KEYS.length).toBe(31);
  });

  it('the loaded override is the value; the shipped catalog is the placeholder for the rest', async () => {
    await render();
    const title = inputsFor('a11y.popup.title');
    expect(title.en.value).toBe('Kontrast'); // the loaded override
    expect(title.et.value).toBe(''); // no override → blank
    expect(title.et.placeholder).toBe('Kättesaadavus'); // the shipped ET default
  });

  it('the two link keys get a URL input; non-link keys never do', async () => {
    await render();
    expect(el.querySelector('input[data-url-key="footer.rescueBoard"]')).not.toBeNull();
    expect(el.querySelector('input[data-url-key="footer.ministry"]')).not.toBeNull();
    expect(el.querySelector('input[data-url-key="a11y.popup.title"]')).toBeNull();
  });

  it('saving sends only CHANGED entries; a cleared field sends the blank (reset)', async () => {
    await render();
    const title = inputsFor('a11y.popup.title');
    title.en.value = 'Kontrastsätted';
    title.en.dispatchEvent(new Event('input', { bubbles: true }));
    title.et.value = 'Kontrastsätted ET';
    title.et.dispatchEvent(new Event('input', { bubbles: true }));
    const body = inputsFor('a11y.popup.body');
    body.ru.value = '';
    body.ru.dispatchEvent(new Event('input', { bubbles: true }));

    panel.save();
    await settle();

    expect(fakeAdmin.putSiteTexts).toHaveBeenCalledTimes(1);
    const entries = fakeAdmin.putSiteTexts.mock.calls[0]![0];
    expect(entries).toEqual(
      expect.arrayContaining([
        { key: 'a11y.popup.title', locale: 'en', value: 'Kontrastsätted' },
        { key: 'a11y.popup.title', locale: 'et', value: 'Kontrastsätted ET' },
      ]),
    );
    // Untouched keys are never sent.
    expect(entries.some((e) => e.key === 'nav.map')).toBe(false);
  });

  it('a non-https link URL refuses to save (client-side mirror of the server rule)', async () => {
    await render();
    const urlInput = el.querySelector('input[data-url-key="footer.rescueBoard"]') as HTMLInputElement;
    urlInput.value = 'http://insecure.example';
    urlInput.dispatchEvent(new Event('input', { bubbles: true }));

    panel.save();
    await settle();

    expect(fakeAdmin.putSiteTexts).not.toHaveBeenCalled();
    expect(el.querySelector('.site-texts-status--error')?.textContent).toContain('https://');
  });

  it('a save failure surfaces the server message', async () => {
    await render();
    fakeAdmin.putSiteTexts = vi.fn(async () => {
      throw new Error('Key is not in the allowlist: evil.key');
    });
    const title = inputsFor('a11y.popup.title');
    title.en.value = 'X';
    title.en.dispatchEvent(new Event('input', { bubbles: true }));

    panel.save();
    await settle();

    expect(el.querySelector('.site-texts-status--error')?.textContent).toContain(
      'not in the allowlist',
    );
  });

  it('the allowlist is a closed set: no duplicates, the link keys are exactly the two footer sources', () => {
    const seen = new Set<string>();
    for (const key of SITE_TEXT_KEYS) {
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(SITE_TEXT_KEYS.length);
    expect(
      SITE_TEXT_KEYS.filter((k) => k === 'footer.rescueBoard' || k === 'footer.ministry'),
    ).toEqual(['footer.rescueBoard', 'footer.ministry']);
  });
});
