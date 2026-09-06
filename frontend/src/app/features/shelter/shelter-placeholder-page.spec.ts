import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PageShell } from '../../shared/page-shell';
import { ShelterPlaceholderPage } from './shelter-placeholder-page';

describe('ShelterPlaceholderPage (/shelters/:id stub)', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PageShell],
      providers: [
        provideRouter([{ path: 'shelters/:id', component: ShelterPlaceholderPage }]),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('is a public stub: an anonymous visit lands on it (no login redirect) and explains M5', async () => {
    const fixture = TestBed.createComponent(PageShell);
    fixture.detectChanges();
    await router.navigateByUrl('/shelters/7');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/shelters/7'); // no guard redirect
    expect(element.textContent).toContain('Shelter details');
    expect(element.textContent).toContain('M5');
    expect(element.querySelector('a[href="/map"]')).not.toBeNull(); // back to the map
  });
});
