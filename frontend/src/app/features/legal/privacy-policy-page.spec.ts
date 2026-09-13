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

  it('renders the policy title and the section headings', () => {
    expect(text()).toContain('Privacy policy');
    expect(text()).toContain('What we collect');
    expect(text()).toContain('Why we collect your e-mail and phone');
    expect(text()).toContain('How we store and protect your data');
    expect(text()).toContain('Your location');
    expect(text()).toContain('Who sees your data');
    expect(text()).toContain('Your choices');
    expect(text()).toContain('How long we keep your data');
  });

  it('states the why-we-collect reason: verification + account recovery', () => {
    expect(text()).toContain('verify your identity');
    expect(text()).toContain('recover your account');
  });

  it('states the storage facts without over-claiming', () => {
    expect(text()).toContain('encrypted at rest');
    expect(text()).toContain('one-way');
  });

  it('scopes geolocation to user-initiated use, no IP inference', () => {
    expect(text()).toContain('Show shelters around you');
    expect(text()).toContain('inside your browser');
    expect(text()).toContain('never infer your location from your IP');
  });

  it('lists the self-service rights (export, delete, change, reset)', () => {
    expect(text()).toContain('Download your data');
    expect(text()).toContain('Delete your account');
    expect(text()).toContain('Change your e-mail or phone');
    expect(text()).toContain('Reset your password');
  });

  it('links to the account page and the terms', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/account');
    expect(links).toContain('/terms');
  });
});
