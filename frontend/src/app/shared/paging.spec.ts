/**
 * The paging policy (shared/paging.ts) — the ONE place the clamp /
 * normalize rules are pinned (the previous copies each had their own
 * spec, so drift passed CI). Every paged surface parses the URL through
 * parsePage/parseSize, derives its page count through lastPage, clamps a
 * size-flip through clampPage, and reads the total through parseTotal.
 */
import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  PAGE_SIZE_MIN,
  PAGE_SIZE_STEP,
  PAGE_SIZES,
  clampPage,
  lastPage,
  parsePage,
  parseSize,
  parseTotal,
} from './paging';

describe('shared paging policy', () => {
  describe('the size contract (the paging contract)', () => {
    it('offers exactly 10..100 in steps of 10, derived from the bounds', () => {
      expect(PAGE_SIZES).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      expect(PAGE_SIZES[0]).toBe(PAGE_SIZE_MIN);
      expect(PAGE_SIZES[PAGE_SIZES.length - 1]).toBe(PAGE_SIZE_MAX);
      expect(PAGE_SIZE_DEFAULT).toBe(20);
      // Every member is a legal step member — the list cannot carry a
      // value the bounds would not produce.
      for (const s of PAGE_SIZES) {
        expect(s % PAGE_SIZE_STEP).toBe(0);
      }
    });
  });

  describe('parsePage (URL -> legal page)', () => {
    it('accepts a 1-based integer verbatim', () => {
      expect(parsePage('1')).toBe(1);
      expect(parsePage('7')).toBe(7);
      expect(parsePage('100000')).toBe(100000);
    });

    it('normalizes missing / non-numeric / below-1 / fractional to 1', () => {
      expect(parsePage(null)).toBe(1);
      expect(parsePage('abc')).toBe(1);
      expect(parsePage('0')).toBe(1);
      expect(parsePage('-3')).toBe(1);
      expect(parsePage('2.5')).toBe(1);
    });
  });

  describe('parseSize (URL -> legal size, the clamp)', () => {
    it('accepts a step member verbatim', () => {
      for (const s of PAGE_SIZES) {
        expect(parseSize(String(s))).toBe(s);
      }
    });

    it('clamps to the NEAREST step member, 10..100', () => {
      expect(parseSize('37')).toBe(40); // 37 -> 40 (nearest member)
      expect(parseSize('15')).toBe(20); // 15 -> 20 (nearest member)
      expect(parseSize('5')).toBe(10); // below the floor -> the floor
      expect(parseSize('1')).toBe(10);
      expect(parseSize('104')).toBe(100); // above the cap -> the cap
      expect(parseSize('1000')).toBe(100);
      expect(parseSize('-50')).toBe(10);
    });

    it('degrades missing / non-numeric to the default', () => {
      expect(parseSize(null)).toBe(PAGE_SIZE_DEFAULT);
      expect(parseSize('abc')).toBe(PAGE_SIZE_DEFAULT);
      expect(parseSize('20.4')).toBe(20);
    });
  });

  describe('lastPage (total + size -> page count)', () => {
    it('is 1 for an empty scope (never "of 0")', () => {
      expect(lastPage(0, 20)).toBe(1);
    });

    it('ceil-divides and floors at 1', () => {
      expect(lastPage(1, 20)).toBe(1);
      expect(lastPage(20, 20)).toBe(1);
      expect(lastPage(21, 20)).toBe(2);
      expect(lastPage(100, 30)).toBe(4);
      expect(lastPage(90, 50)).toBe(2);
    });
  });

  describe('clampPage (a size-flip must never strand the view)', () => {
    it('clamps a stranded page to the last page AT THE NEW SIZE', () => {
      // 90 rows, on page 9 at 10; the size flips to 50 -> 2 pages -> page 2.
      expect(clampPage(9, 90, 50)).toBe(2);
    });

    it('keeps a legal page and floors at 1', () => {
      expect(clampPage(2, 90, 50)).toBe(2);
      expect(clampPage(1, 90, 50)).toBe(1);
      expect(clampPage(0, 90, 50)).toBe(1);
      expect(clampPage(-4, 90, 50)).toBe(1);
    });

    it('is a no-op for an empty scope (lastPage 1)', () => {
      expect(clampPage(7, 0, 20)).toBe(1);
    });
  });

  describe('parseTotal (X-Total-Count -> un-paged total)', () => {
    it('reads a legal header verbatim', () => {
      expect(parseTotal('0', 2)).toBe(0);
      expect(parseTotal('27', 2)).toBe(27);
      expect(parseTotal('123', 5)).toBe(123);
    });

    it('degrades to the page length when the header is missing or illegal', () => {
      expect(parseTotal(null, 2)).toBe(2);
      expect(parseTotal('', 2)).toBe(2);
      expect(parseTotal('abc', 2)).toBe(2);
      expect(parseTotal('2.5', 2)).toBe(2);
      expect(parseTotal('-1', 2)).toBe(2);
    });
  });
});
