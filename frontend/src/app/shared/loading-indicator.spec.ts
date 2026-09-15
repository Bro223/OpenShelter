import { TestBed } from '@angular/core/testing';
import { LoadingIndicator } from './loading-indicator';

describe('LoadingIndicator', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LoadingIndicator>>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LoadingIndicator);
  });

  it('renders the default message as an aria status', () => {
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toContain('Loading…');
  });

  it("renders the consuming page's message", () => {
    fixture.componentRef.setInput('message', 'Loading shelters…');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading shelters…');
  });
});
