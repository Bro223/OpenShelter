import { gaugeAngle } from './gauge-math';

describe('gaugeAngle (M9 gauge maths)', () => {
  it('an equal split (0.5) points straight up at 90°', () => {
    expect(gaugeAngle(0.5)).toBe(90);
  });

  it('all-one-way reaches the extremes: 0 → 0° (left), 1 → 180° (right)', () => {
    expect(gaugeAngle(0)).toBe(0);
    expect(gaugeAngle(1)).toBe(180);
  });

  it('is linear in between: 2/3 → 120°, 1/4 → 45°', () => {
    expect(gaugeAngle(2 / 3)).toBeCloseTo(120, 9);
    expect(gaugeAngle(0.25)).toBe(45);
  });

  it('zero data (null) is the empty state — never a neutral arrow', () => {
    expect(gaugeAngle(null)).toBeNull();
  });

  it('treats NaN as no data', () => {
    expect(gaugeAngle(Number.NaN)).toBeNull();
  });

  it('clamps out-of-range server values to the semicircle', () => {
    expect(gaugeAngle(1.5)).toBe(180);
    expect(gaugeAngle(-0.2)).toBe(0);
  });
});
