import { ResendCountdown } from './resend-countdown';

describe('ResendCountdown', () => {
  let countdown: ResendCountdown;

  beforeEach(() => {
    vi.useFakeTimers();
    countdown = new ResendCountdown();
  });

  afterEach(() => {
    countdown.stop();
    vi.useRealTimers();
  });

  it('is inactive with zero remaining until start', () => {
    expect(countdown.active).toBe(false);
    expect(countdown.remaining()).toBe(0);
    expect(countdown.label()).toBe('');
  });

  it('start activates with the full duration, no one-tick lag', () => {
    countdown.start(23);

    expect(countdown.active).toBe(true);
    expect(countdown.remaining()).toBe(23);
    expect(countdown.label()).toBe('23s');
  });

  it('formats the label compactly at the boundaries', () => {
    const expectLabel = (seconds: number, label: string) => {
      countdown.start(seconds);
      expect(countdown.label(), `${seconds}s`).toBe(label);
    };
    expectLabel(59, '59s'); // below a minute: plain seconds
    expectLabel(60, '1m 00s'); // minute boundary: seconds zero-padded
    expectLabel(65, '1m 05s');
    expectLabel(599, '9m 59s');
    expectLabel(3599, '59m 59s');
    expectLabel(3600, '1h 00m'); // hour boundary: minutes zero-padded
    expectLabel(3662, '1h 01m');
    expectLabel(3722, '1h 02m');
  });

  it('counts down one second per tick', () => {
    countdown.start(3);

    vi.advanceTimersByTime(1000);
    expect(countdown.remaining()).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(countdown.remaining()).toBe(1);
    expect(countdown.label()).toBe('1s');
  });

  it('re-starts cleanly when already active — the new value wins, one interval', () => {
    countdown.start(60);
    vi.advanceTimersByTime(30_000);
    expect(countdown.remaining()).toBe(30);
    expect(vi.getTimerCount()).toBe(1);

    countdown.start(10);

    expect(vi.getTimerCount()).toBe(1); // the old interval was cleared
    expect(countdown.remaining()).toBe(10);

    vi.advanceTimersByTime(10_000);
    expect(countdown.active).toBe(false);
    expect(countdown.remaining()).toBe(0);
  });

  it('stop clears the interval and resets (idempotent)', () => {
    countdown.start(30);

    countdown.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(countdown.active).toBe(false);
    expect(countdown.remaining()).toBe(0);
    expect(countdown.label()).toBe('');

    countdown.stop(); // safe a second time
    expect(vi.getTimerCount()).toBe(0);
  });

  it('expires at zero — inactive with remaining 0 and no interval left', () => {
    countdown.start(2);

    vi.advanceTimersByTime(1000);
    expect(countdown.active).toBe(true);
    expect(countdown.remaining()).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(countdown.active).toBe(false);
    expect(countdown.remaining()).toBe(0);
    expect(countdown.label()).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clamps below-one-second starts to one second', () => {
    countdown.start(0);

    expect(countdown.active).toBe(true);
    expect(countdown.remaining()).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(countdown.active).toBe(false);
  });

  it('stays drift-free — the remainder is recomputed from the deadline', () => {
    countdown.start(3);

    // The value at any moment is whatever the last tick computed from the
    // deadline (ceil of what is actually left) — not a decrement of a
    // previous value, so a jittery or delayed tick cannot accumulate drift.
    vi.advanceTimersByTime(2500);
    expect(countdown.remaining()).toBe(1); // the t=2s tick saw 1 s left

    // The t=3s tick lands exactly on the deadline — expired, no timer left.
    vi.advanceTimersByTime(500);
    expect(countdown.active).toBe(false);
    expect(countdown.remaining()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
