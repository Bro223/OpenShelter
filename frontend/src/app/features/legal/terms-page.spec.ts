import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TermsPage } from './terms-page';

@Component({ imports: [TermsPage], template: '<app-terms-page />' })
class Host {}

describe('TermsPage', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function text(): string {
    return element.textContent ?? '';
  }

  it('renders the terms title and the section headings', () => {
    expect(text()).toContain('Terms of use');
    expect(text()).toContain('What OpenShelter is');
    expect(text()).toContain('Accounts and verification');
    expect(text()).toContain('Contributions');
    expect(text()).toContain('Trust labels');
    expect(text()).toContain('Personal data');
    expect(text()).toContain('No warranty');
    expect(text()).toContain('Changes to these terms');
  });

  it('keeps the app-wide safety framing: not official, 112 first', () => {
    expect(text()).toContain('not an official emergency service');
    expect(text()).toContain('112');
  });

  it('states the contribution limits honestly (caps, not bans)', () => {
    expect(text()).toContain('daily cap');
    expect(text()).toContain('one-time codes');
    expect(text()).toContain('not a ban');
  });

  it('pins the verified-user vs verified-shelter gap', () => {
    expect(text()).toContain('verified user is not a verified shelter');
  });

  it('links to the privacy policy', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/privacy');
  });
});
