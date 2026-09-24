import { TestBed } from '@angular/core/testing';
import { ReportGauge } from './report-gauge';

/**
 * The semicircular report gauge (community pulse): the needle angle
 * follows the weighted share (50/50 → straight up at 90°, all-one-way →
 * the 0°/180° extremes), zero data renders the explicit empty state
 * (NO neutral arrow), and the count line + end labels are visible text —
 * the angle is never the only carrier of meaning.
 */
describe('ReportGauge (community pulse)', () => {
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

  it('the count line carries a wbr break opportunity between every pair of tokens — the line wraps BETWEEN tokens, never mid-phrase', () => {
    render(0.5, 'Reports: 2 open, 2 closed');

    const host = fixture.nativeElement as HTMLElement;
    const caption = host.querySelector('.report-gauge__text')!;
    const tokens = [...caption.querySelectorAll('.report-gauge__token')];
    expect(tokens.length).toBe(2);
    // The tokens are adjacent in the markup (Angular control flow strips
    // the loop's whitespace) and each is nowrap, so without an explicit
    // break opportunity between them the whole line would be unbreakable
    // and overflow its box — the wbr restores the between-token breaks.
    expect(caption.querySelectorAll('wbr').length, 'a wbr between every pair of tokens').toBe(
      tokens.length - 1,
    );
    // the wbrs add no characters — the visible + accessible text is the
    // count text verbatim
    expect(caption.textContent).toBe('Reports: 2 open, 2 closed');
  });

  describe('detached caption (the count line separated from the arrow)', () => {
    it('describedBy mode renders the arrow only — the figure references the external caption, no figcaption', () => {
      fixture.componentRef.setInput('share', 0.5);
      fixture.componentRef.setInput('text', 'Reports: 2 open, 2 closed');
      fixture.componentRef.setInput('leftLabel', 'Closed');
      fixture.componentRef.setInput('rightLabel', 'Open');
      fixture.componentRef.setInput('emptyText', 'No recent reports');
      fixture.componentRef.setInput('describedBy', 'external-caption');
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const figure = host.querySelector('.report-gauge') as HTMLElement | null;
      expect(figure, 'the arrow figure renders').not.toBeNull();
      expect(figure!.getAttribute('aria-describedby')).toBe('external-caption');
      expect(figure!.querySelector('figcaption'), 'no figcaption in arrow-only mode').toBeNull();
      // the arrow still renders (the needle, the aria-hidden SVG, the
      // end labels)
      expect(figure!.querySelector('.report-gauge__needle')).not.toBeNull();
      expect((figure!.querySelector('svg') as SVGElement).getAttribute('aria-hidden')).toBe('true');
      expect(figure!.textContent).toContain('Closed');
      expect(figure!.textContent).toContain('Open');
    });

    it('captionOnly mode renders the count line on its own — the given id, the tokens verbatim, no arrow', () => {
      fixture.componentRef.setInput('captionOnly', true);
      fixture.componentRef.setInput('captionId', 'external-caption');
      fixture.componentRef.setInput('text', 'Reports: 2 open, 2 closed');
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const caption = host.querySelector('.report-gauge__text');
      expect(caption, 'the count line renders as a standalone paragraph').not.toBeNull();
      expect(caption!.id).toBe('external-caption');
      expect(caption!.textContent).toBe('Reports: 2 open, 2 closed');
      const tokens = [...caption!.querySelectorAll('.report-gauge__token')];
      expect(tokens.map((t) => t.textContent).join(''), 'the tokens are the text verbatim').toBe(
        'Reports: 2 open, 2 closed',
      );
      expect(caption!.querySelectorAll('wbr').length, 'a wbr between every token pair').toBe(
        tokens.length - 1,
      );
      // the arrow itself is NOT rendered
      expect(host.querySelector('svg')).toBeNull();
      expect(host.querySelector('figure')).toBeNull();
    });
  });
});
