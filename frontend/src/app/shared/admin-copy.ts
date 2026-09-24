import type {
  AdminAlertKind,
  AdminAuditAction,
  AdminShelterHistoryEvent,
  ShelterReportType,
} from '../core/models';

/**
 * The admin area's machine-value → human-copy label maps.
 *
 * Single-sourced here (extracted from admin-page.ts) so every admin
 * surface that renders a queue/audit/history/alert label — the page's
 * remaining tabs and the extracted admin panels — reads the SAME copy
 * instead of forking it.
 */

/** Shelter-report type labels (queue column + row meta). OPEN_CONFIRMED
 *  stays mapped for historical rows — the detail-page picker no longer
 *  offers it (server-side deprecation), the queue renders it read-only. */
export const SHELTER_REPORT_TYPE_LABEL: Record<ShelterReportType, string> = {
  NON_EXISTENT: 'Does not exist',
  CLOSED: 'Reported closed',
  OPEN_CONFIRMED: 'Confirmed open',
  WRONG_LOCATION: 'Wrong location',
  OTHER: 'Other',
};

/** Audit-log action labels: human copy for the
 *  machine action values. */
export const AUDIT_ACTION_LABEL: Record<AdminAuditAction, string> = {
  STATUS_CHANGE: 'Status change',
  DELETE: 'Delete',
  REPORT_DISMISS: 'Report dismissed',
  REVIEW_HIDE: 'Review hidden',
  REVIEW_RESTORE: 'Review restored',
  CONFIRM: 'Confirmed',
  AUTO_CONFIRM: 'Auto-confirmed',
  REJECT: 'Rejected',
  USER_SUSPEND: 'User suspended',
  USER_UNSUSPEND: 'User unsuspended',
  MARK_INACCURATE: 'Marked inaccurate',
  CLEAR_INACCURATE: 'Inaccurate cleared',
  // Guidance/media rows: the subject is the row's
  // subjectLabel snapshot ("Guidance post \"…\" (slug)" / "Media asset
  // \"…\" (stored)") — the tab's Subject column renders it verbatim.
  GUIDANCE_PUBLISH: 'Guidance published',
  GUIDANCE_UNPUBLISH: 'Guidance unpublished',
  GUIDANCE_DELETE: 'Guidance post deleted',
  GUIDANCE_REORDER: 'Guidance order changed',
  MEDIA_DELETE: 'Media asset deleted',
};

/** Shelter-history action labels (the Shelters-tab panel). */
export const SHELTER_HISTORY_ACTION_LABEL: Record<AdminShelterHistoryEvent['action'], string> = {
  CREATED: 'Created',
  EDITED: 'Edited',
  DELETED: 'Deleted',
};

/** Alert kind labels: human copy for the
 *  machine kind values. */
export const ALERT_KIND_LABEL: Record<AdminAlertKind, string> = {
  'submission-daily-cap': 'Daily submission cap',
  'otp-contact-cap': 'OTP contact cap',
  'near-duplicate': 'Near-duplicate submission',
};

/** Reporter identity for a report-queue row: name + e-mail, null-safe
 *  (extracted from admin-page.ts with the reports-tab panel). */
export function reporterText(row: {
  reporterName: string | null;
  reporterEmail: string | null;
}): string {
  const name = row.reporterName ?? 'Unknown';
  return row.reporterEmail === null ? name : `${name} <${row.reporterEmail}>`;
}
