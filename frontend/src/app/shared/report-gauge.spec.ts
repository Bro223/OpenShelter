import { TestBed } from '@angular/core/testing';
import { ReportGauge } from './report-gauge';

/**
 * The semicircular report gauge (M9 community pulse): the needle angle
 * follows the weighted share (50/50 → straight up at 90°, all-one-way →
 * the 0°/180° extremes), zero data renders the explicit empty state
 * (NO neutral arrow), and the count line + end labels are visible text —
 * the angle is never the only carrier of meaning.
 */
describe('ReportGauge (M9 community pulse)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ReportGauge>>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportGauge);
  });

  function render(share: number | null, text: string, left = 'Closed', right = 'Open'): void {
    fixture.componentRef.setInput('share', share);
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('leftLabel', left);
    fixture.componentRef.setInput('rightLabel', right);
    fixture.componentRef.setInput('emptyText', 'No recent reports');
    fixture.detectChanges();
  }

  it('an equal split (0.5) points the needle straight up (rotate 90°)', () => {
    render(0.5, 'Reports: 2 open, 2 closed');

    const needle = fixture.nativeElement.querySelector('.report-gauge__needle') as SVGElement;
    expect(needle).not.toBeNull();
    expect(needle.getAttribute('transform')).toBe('rotate(90 100 100)');
  });

  it('all-one-way reaches the extremes: 0 → 0° (left), 1 → 180° (right)', () => {
    render(0, 'Reports: 0 open, 3 closed');
    let needle = fixture.nativeElement.querySelector('.report-gauge__needle') as SVGElement;
    expect(needle.getAttribute('transform')).toBe('rotate(0 100 100)');

    render(1, 'Reports: 3 open, 0 closed');
    needle = fixture.nativeElement.querySelector('.report-gauge__needle') as SVGElement;
    expect(needle.getAttribute('transform')).toBe('rotate(180 100 100)');
  });

  it('renders the visible count line and the end labels (not colour-only)', () => {
    render(0.5, 'Reports: 2 open, 2 closed', 'Space available', 'Full');

    const host = fixture.nativeElement as HTMLElement;
    const caption = host.querySelector('.report-gauge__text');
    expect(caption?.textContent).toContain('Reports: 2 open, 2 closed');
    expect(host.textContent).toContain('Space available');
    expect(host.textContent).toContain('Full');
    // the SVG itself is decorative — the text carries the meaning
    const svg = host.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('zero data renders the explicit empty state — no gauge, no needle', () => {
    render(null, 'Reports: 0 open, 0 closed');

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('svg')).toBeNull();
    expect(host.querySelector('.report-gauge__needle')).toBeNull();
    const empty = host.querySelector('[role="status"]');
    expect(empty?.textContent).toContain('No recent reports');
  });
});
