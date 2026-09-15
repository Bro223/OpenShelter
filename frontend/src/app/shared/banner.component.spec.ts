import { TestBed } from '@angular/core/testing';
import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BannerComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(BannerComponent);
  });

  it('renders nothing while the message is null', () => {
    fixture.componentRef.setInput('message', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.banner')).toBeNull();
  });

  it('renders an error banner with role="alert"', () => {
    fixture.componentRef.setInput('message', 'Something failed');
    fixture.componentRef.setInput('severity', 'error');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.banner') as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Something failed');
    expect(banner.classList.contains('banner--error')).toBe(true);
  });

  it.each(['info', 'success', 'warning'] as const)(
    'uses role="status" for %s banners',
    (severity) => {
      fixture.componentRef.setInput('message', 'Heads up');
      fixture.componentRef.setInput('severity', severity);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.banner') as HTMLElement;
      expect(banner.getAttribute('role')).toBe('status');
      expect(banner.classList.contains(`banner--${severity}`)).toBe(true);
    },
  );

  it('clears when the message becomes null again', () => {
    fixture.componentRef.setInput('message', 'x');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.banner')).not.toBeNull();

    fixture.componentRef.setInput('message', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.banner')).toBeNull();
  });
});
