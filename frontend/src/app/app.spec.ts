import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

/** Stub routed page for the route-change focus test (same idiom as
    page-shell.spec.ts). */
@Component({ template: '<p>stub page</p>' })
class StubPage {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'map', component: StubPage },
          { path: 'login', component: StubPage },
        ]),
        provideHttpClient(),
      ],
    }).compileComponents();
  });

  it('boots the page shell with the OpenShelter brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('OpenShelter');
    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.querySelector('header')).not.toBeNull();
  });

  it('keeps the session anonymous when no refresh token is stored', async () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Log in');
    expect(element.textContent).not.toContain('Log out');
  });

  /* The consent banner is mounted at the APP ROOT (next to the shell), not
     inside the page shell: a modal belongs at the root, and as a direct
     child of <app-root> no shell ancestor can ever box it (an ancestor
     transform/filter/etc. would become the containing block of its
     position:fixed overlay) or clip it. The overlay sizes itself to the
     viewport — see consent-banner.component.scss. */
  describe('consent banner at the app root', () => {
    it('mounts the banner next to the shell, as a direct child of the root', async () => {
      localStorage.clear();
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      // The root's two element children, in order: the shell, then the modal.
      expect(element.children).toHaveLength(2);
      expect(element.children[0].tagName).toBe('APP-PAGE-SHELL');
      expect(element.children[1].tagName).toBe('APP-CONSENT-BANNER');
      expect(
        (element.children[1] as HTMLElement).closest('app-page-shell'),
        'the banner is not inside the shell',
      ).toBeNull();
    });

    // Moved here from page-shell.spec.ts (accessibility F-04): the banner no
    // longer renders inside the shell, so the "never steal focus from the
    // open dialog" assertion lives where the dialog actually renders.
    it('never pulls focus out of the open dialog on a route change', async () => {
      localStorage.clear();
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const dialog = element.querySelector('.consent-dialog') as HTMLElement;
      expect(dialog, 'the consent modal renders while undecided').not.toBeNull();
      dialog.focus();

      const router = TestBed.inject(Router);
      // The shell reads its FIRST NavigationEnd as the document load (the
      // browser's own focus start wins there), so prime one navigation and
      // assert on the next — same idiom as page-shell.spec.ts.
      await router.navigate(['/map']);
      await fixture.whenStable();
      fixture.detectChanges();

      await router.navigate(['/login']);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(document.activeElement).toBe(dialog);
    });
  });
});
