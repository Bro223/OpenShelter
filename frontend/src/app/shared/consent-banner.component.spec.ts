import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConsentStore } from '../core/consent-store';
import { I18nService } from '../core/i18n/i18n.service';
import { ConsentBanner } from './consent-banner.component';

/**
 * The first-level data-usage notice, rendered as a centered modal overlay:
 * appears only until the necessary-only acknowledgment is stored, then
 * disappears. The single explicit "Got it" button is the only dismissal
 * path (no silent close-to-consent).
 */
describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  function setup(): {
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<ConsentBanner>>;
    store: ConsentStore;
  } {
    TestBed.configureTestingModule({
      imports: [ConsentBanner],
      providers: [provideRouter([{ path: 'privacy', component: class {} }])],
    });
    const fixture = TestBed.createComponent(ConsentBanner);
    fixture.detectChanges();
    return {
      element: fixture.nativeElement as HTMLElement,
      fixture,
      store: TestBed.inject(ConsentStore),
    };
  }

  it('renders a centered modal dialog with title, body, acknowledgment and privacy link', () => {
    const { element } = setup();

    const overlay = element.querySelector('.consent-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    const dialog = element.querySelector('.consent-dialog') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('consent-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('consent-body');
    expect(element.textContent).toContain('About cookies and browser storage');
    expect(element.textContent).toContain('never sells your data');
    const button = [...element.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Got it',
    );
    expect(button).toBeDefined();
    const privacy = element.querySelector('a[href="/privacy"]');
    expect(privacy?.textContent?.trim()).toBe('Read the Privacy Policy');
  });

  it('does not offer an accept/reject split (no optional categories exist)', () => {
    const { element } = setup();
    expect(element.textContent).not.toContain('Accept');
    expect(element.textContent).not.toContain('Reject');
    expect(element.textContent).not.toContain('Manage');
  });

  it('acknowledging hides the overlay and persists the decision', () => {
    const { element, fixture, store } = setup();
    const button = [...element.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Got it',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(store.decided()).toBe(true);
    expect(localStorage.getItem('openshelter-consent')).toContain('"necessary"');
    expect(element.querySelector('.consent-overlay')).toBeNull();
  });

  it('stays hidden when a valid decision is already stored', () => {
    localStorage.setItem(
      'openshelter-consent',
      JSON.stringify({ version: 1, decision: 'necessary', acknowledgedAt: 't' }),
    );
    const { element } = setup();
    expect(element.querySelector('.consent-overlay')).toBeNull();
  });

  it('renders in Estonian after a locale switch (both catalogs ship the text)', async () => {
    TestBed.configureTestingModule({
      imports: [ConsentBanner],
      providers: [provideRouter([])],
    });
    TestBed.inject(I18nService).setLocale('et'); // bundle-lazy-i18n: starts the on-demand et chunk
    const fixture = TestBed.createComponent(ConsentBanner);
    await TestBed.inject(I18nService).ensureCatalog('et'); // the chunk lands before the assertions
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Küpsistest ja brauseri salvestusruumist');
    expect(text).toContain('Sain aru');
    expect(text).toContain('Loe privaatsuspoliitikat');
    expect(document.documentElement.lang).toBe('et');
  });

  it('suppresses the UA ring on the dialog container (no dark box while it holds focus)', () => {
    // The section takes focus on open (afterNextRender) purely so the screen
    // reader announces it; Chromium's default ring drew a dark box around the
    // whole banner until the next click (owner-reported). BOTH pseudo-classes
    // are required: a script focus() call can match :focus-visible.
    const scss = readFileSync(
      `${process.cwd()}/src/app/shared/consent-banner.component.scss`,
      'utf8',
    );
    expect(scss, 'the dialog container must suppress the UA focus ring').toMatch(
      /&:focus,\s*&:focus-visible \{\s*outline: none;\s*\}/,
    );
  });
});
