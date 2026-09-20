import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TermsPage } from './terms-page';

@Component({ imports: [TermsPage], template: '<app-terms-page />' })
class Host {}

describe('TermsPage', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function text(): string {
    return element.textContent ?? '';
  }

  it('renders the title, the last-updated line and a table of contents', () => {
    expect(text()).toContain('Terms of use');
    expect(text()).toContain('Last updated');
    const toc = element.querySelector('.legal-page__toc');
    expect(toc).not.toBeNull();
    expect(toc?.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(10);
  });

  it('renders the section headings', () => {
    for (const heading of [
      'Acceptance of these terms',
      'What OpenShelter is',
      'Eligibility and accounts',
      'Account security',
      'Rules for contributions',
      'Prohibited content and behaviour',
      'Official versus community information',
      'Emergency disclaimer',
      'No warranty',
      'Open-source license',
    ]) {
      expect(text()).toContain(heading);
    }
  });

  it('keeps the app-wide safety framing: not official, 112 first', () => {
    expect(text()).toContain('not an official emergency service');
    expect(text()).toContain('not an emergency service');
    expect(text()).toContain('112');
  });

  it('states the emergency disclaimer plainly', () => {
    expect(text()).toContain('must not be your only source of emergency information');
    expect(text()).toContain('Do not enter private property');
  });

  it('states the contribution limits honestly (caps, not bans)', () => {
    expect(text()).toContain('daily cap');
    expect(text()).toContain('one-time codes');
    expect(text()).toContain('not a ban');
  });

  it('pins the verified-user vs verified-shelter gap', () => {
    expect(text()).toContain('verified user is not a verified shelter');
    expect(text()).toContain('not automatically a safe, legal, accessible');
  });

  it('carries visible placeholders for unconfirmed legal details', () => {
    expect(text()).toContain('[APPLICABLE LAW TO BE CONFIRMED]');
    expect(text()).toContain('[DISPUTE RESOLUTION TO BE CONFIRMED]');
    expect(text()).toContain('[CONTACT EMAIL]');
  });

  it('links to the privacy policy', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/privacy');
  });

  it('re-renders on a language switch (fully catalog-driven, i18n M4)', async () => {
    expect(text()).toContain('Terms of use');
    const i18n = TestBed.inject(I18nService);
    i18n.setLocale('et');
    await i18n.ensureCatalog('et'); // bundle-lazy-i18n: the et chunk is on demand
    fixture.detectChanges();
    expect(text()).toContain('Kasutustingimused');
    expect(text()).toContain('Mis on OpenShelter');
    expect(text()).toContain('Hädaolukorras helista 112');
    // The switch persists to localStorage — restore the default locale so
    // the EN assertions in the other tests hold regardless of order.
    i18n.setLocale('en');
    fixture.detectChanges();
    expect(text()).toContain('Terms of use');
  });
});
