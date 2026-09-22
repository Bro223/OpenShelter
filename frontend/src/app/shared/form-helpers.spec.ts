import { FormControl } from '@angular/forms';
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  CODE_SIX_DIGITS,
  capacityValidator,
  nameBlankValidator,
} from './form-helpers';

/**
 * Direct table spec of the shared form helpers. Each export gets a
 * table with valid / invalid / empty / boundary rows; the capacity table
 * reads the exported bounds, so a bounds change moves the boundary rows
 * with it.
 */

describe('CODE_SIX_DIGITS (the OTP input pattern)', () => {
  const rows = [
    { value: '000000', matches: true, note: 'all zeros — the lowest six-digit code (boundary)' },
    { value: '123456', matches: true, note: 'an ordinary six-digit code' },
    { value: '999999', matches: true, note: 'all nines — the highest six-digit code (boundary)' },
    { value: '12345', matches: false, note: 'five digits — one short (boundary)' },
    { value: '1234567', matches: false, note: 'seven digits — one long (boundary)' },
    { value: '12345a', matches: false, note: 'a letter sneaked in' },
    { value: '12 345', matches: false, note: 'an internal space' },
    { value: '12345 ', matches: false, note: 'a trailing space' },
    { value: '', matches: false, note: 'the empty string' },
  ];

  it.each(rows)('$note', ({ value, matches }) => {
    expect(CODE_SIX_DIGITS.test(value)).toBe(matches);
  });
});

describe('capacityValidator (optional; 1..100_000 when present)', () => {
  const rows = [
    { value: null, expected: null, note: 'null — the optional field is empty' },
    { value: undefined, expected: null, note: 'undefined — the optional field is empty' },
    { value: '', expected: null, note: 'an empty string — the optional field is empty' },
    { value: '   ', expected: null, note: 'whitespace-only — the optional field is empty' },
    { value: CAPACITY_MIN, expected: null, note: 'the lower bound is valid (boundary)' },
    { value: CAPACITY_MAX, expected: null, note: 'the upper bound is valid (boundary)' },
    { value: 500, expected: null, note: 'an interior value is valid' },
    {
      value: '250',
      expected: null,
      note: 'a numeric string is valid (the control value may not be a number)',
    },
    { value: 0, expected: { capacity: true }, note: 'below the lower bound (boundary)' },
    {
      value: CAPACITY_MAX + 1,
      expected: { capacity: true },
      note: 'one over the upper bound (boundary)',
    },
    { value: 10_000_000, expected: { capacity: true }, note: 'far above the upper bound' },
    { value: 1.5, expected: { capacity: true }, note: 'a fraction is not a capacity' },
    { value: '1.5', expected: { capacity: true }, note: 'a fractional string is not a capacity' },
    { value: 'abc', expected: { capacity: true }, note: 'a non-numeric string' },
    { value: Number.NaN, expected: { capacity: true }, note: 'NaN' },
  ];

  it('the capacity bounds mirror the backend (1..100_000)', () => {
    expect(CAPACITY_MIN).toBe(1);
    expect(CAPACITY_MAX).toBe(100_000);
  });

  it.each(rows)('$note', ({ value, expected }) => {
    expect(capacityValidator(new FormControl(value))).toEqual(expected);
  });
});

describe('nameBlankValidator (the @NotBlank mirror)', () => {
  const rows = [
    { value: 'OpenShelter', expected: null, note: 'a plain name' },
    { value: '  Tallinn  ', expected: null, note: 'a padded name (trim leaves text)' },
    { value: 'x', expected: null, note: 'a single character — the minimum (boundary)' },
    { value: '', expected: { blank: true }, note: 'the empty string' },
    { value: '   ', expected: { blank: true }, note: 'whitespace-only — the @NotBlank case' },
    { value: '\t\n ', expected: { blank: true }, note: 'tabs and newlines are whitespace too' },
    { value: null, expected: { blank: true }, note: 'null — the control was never filled' },
    { value: undefined, expected: { blank: true }, note: 'undefined' },
  ];

  it.each(rows)('$note', ({ value, expected }) => {
    expect(nameBlankValidator(new FormControl(value))).toEqual(expected);
  });
});
