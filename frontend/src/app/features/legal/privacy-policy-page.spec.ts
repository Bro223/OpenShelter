import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPolicyPage } from './privacy-policy-page';

@Component({ imports: [PrivacyPolicyPage], template: '<app-privacy-policy-page />' })
class Host {}

describe('PrivacyPolicyPage', () => {
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

  it('renders the title, the last-updated line and a table of contents', () => {
    expect(text()).toContain('Privacy policy');
    expect(text()).toContain('Last updated');
    const toc = element.querySelector('.legal-page__toc');
    expect(toc).not.toBeNull();
    expect(toc?.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(10);
  });

  it('renders the section headings', () => {
    for (const heading of [
      'Who operates OpenShelter',
      'What personal data we collect',
      'Why we process each category',
      'Account creation and verification',
      'Location and geolocation',
      'Cookies and browser storage',
      'Third-party service providers',
      'Data retention',
      'Your rights under the GDPR',
      'Data security',
    ]) {
      expect(text()).toContain(heading);
    }
  });

  it('states the collection and verification facts without over-claiming', () => {
    expect(text()).toContain('full name');
    expect(text()).toContain('e-mail address');
    expect(text()).toContain('phone number');
    expect(text()).toContain('one-time code');
    expect(text()).toContain('Password resets');
    expect(text()).toContain('national identification code');
  });

  it('states the storage and security facts', () => {
    expect(text()).toContain('encrypted at rest');
    expect(text()).toContain('one-way');
    expect(text()).toContain('Argon2');
    expect(text()).toContain('rate limits');
  });

  it('scopes geolocation to user-initiated use, no IP inference', () => {
    expect(text()).toContain('Show shelters around you');
    expect(text()).toContain('inside your browser');
    expect(text()).toContain('never infer your location from your IP');
  });

  it('lists the self-service GDPR rights (access, rectify, erase)', () => {
    expect(text()).toContain('Access');
    expect(text()).toContain('Rectification');
    expect(text()).toContain('Erasure');
    expect(text()).toContain('download a JSON export');
  });

  it('states the decided retention horizons and the deployment-gated job', () => {
    // The owner's decision (retention-pruning): 24-month horizons, stated
    // as the app's rule, with the enforcing job flagged as a
    // deployment-level switch (off in this repository's dev config).
    expect(text()).toContain('24 months');
    expect(text()).toContain('no sign-in activity');
    expect(text()).toContain('RETENTION_ENABLED');
    expect(text()).not.toContain('[RETENTION PERIOD TO BE CONFIRMED]');
  });

  it('carries visible placeholders for unconfirmed operator and legal details', () => {
    expect(text()).toContain('[OPERATOR LEGAL NAME]');
    expect(text()).toContain('[CONTACT EMAIL]');
    expect(text()).toContain('[DATA PROTECTION CONTACT]');
    expect(text()).toContain('[LEGAL BASIS TO BE CONFIRMED]');
  });

  it('does not describe OpenShelter as an official government service', () => {
    expect(text()).toContain('not an official government service');
    expect(text()).not.toContain('is an official government service');
  });

  it('links to the account page and the terms', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/account');
    expect(links).toContain('/terms');
  });
});
