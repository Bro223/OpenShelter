import { type AbstractControl, type ValidationErrors } from '@angular/forms';

/**
 * Shared form helpers (A3/N3-F): the shelter-form logic that /submit and the
 * contributions panel used to carry as verbatim copies (the panel's comment
 * even said "same as POST" — now it literally IS the shared helper). One
 * implementation, both consumers.
 */

/** A 6-digit OTP (backend sixDigitCode()) — password-reset and the
 *  account change-proof codes. The input pattern only mirrors the
 *  generator — never stricter (reviewer N3: the regex lived in 3 pages). */
export const CODE_SIX_DIGITS = /^\d{6}$/;

/** The capacity bounds (backend CreateShelterRequest / UpdateShelterRequest:
 *  1..100_000 — the backend keeps both in one shared validation path). */
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 100_000;

/**
 * Read a coordinate out of a number control (Angular's NumberValueAccessor
 * stores a number for a filled input and null for an empty one).
 */
export function readCoordinate(value: number | string | null): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Capacity is optional (null); when present it must be an integer in 1..100_000. */
export function capacityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined) {
    return null; // optional — empty input
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < CAPACITY_MIN || numeric > CAPACITY_MAX) {
    return { capacity: true };
  }
  return null;
}

/**
 * Whitespace-only names pass Validators.required — mirrors the backend
 * @NotBlank so the UI never POSTs/PUTs "   " (reviewer N3).
 */
export function nameBlankValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { blank: true } : null;
}
