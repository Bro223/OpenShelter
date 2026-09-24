import { type AbstractControl, type FormGroup, type ValidationErrors } from '@angular/forms';

/**
 * Shared form helpers: one implementation of the shelter-form rules for both
 * the /submit form and the contributions panel, so the two cannot drift apart.
 */

/** A 6-digit OTP (backend sixDigitCode()) — password-reset and the
 *  account change-proof codes. The input pattern only mirrors the
 *  generator — never stricter. */
export const CODE_SIX_DIGITS = /^\d{6}$/;

/** The capacity bounds (backend CreateShelterRequest / UpdateShelterRequest:
 *  1..100_000 — the backend keeps both in one shared validation path). */
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 100_000;

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
 * @NotBlank so the UI never POSTs/PUTs "   ".
 */
export function nameBlankValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { blank: true } : null;
}

/**
 * Moves keyboard focus to the first field that blocks submission — the
 * web-guidelines "focus first error on submit" rule. `fields` are the
 * page's fields in visual order: the form control key + the input's DOM
 * id. The first invalid control's input receives focus.
 * @returns whether it focused a field — a page-managed field with no
 *   control (e.g. the /submit location, captured outside the form) is the
 *   caller's fallback.
 */
export function focusFirstInvalidField(
  form: FormGroup,
  fields: ReadonlyArray<readonly [string, string]>,
): boolean {
  for (const [key, id] of fields) {
    const control = form.get(key);
    if (control === null || control.valid) {
      continue;
    }
    document.getElementById(id)?.focus();
    return true;
  }
  return false;
}
