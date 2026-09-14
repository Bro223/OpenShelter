# Task ledger

| Task ID | Workstream | Description | Status | Files | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| T-A1 | A | Privacy Policy audit + rewrite | done | legal/privacy-policy-page.html/.scss/.spec.ts | 9 pass | placeholders + ToC + last-updated |
| T-A2 | A | Terms of Use audit + rewrite | done | legal/terms-page.html/.scss/.spec.ts | 7 pass | placeholders + ToC + emergency disclaimer |
| T-A3 | A | "How OpenShelter works" block on map | done | map/map-page.html/.scss/.ts/.spec.ts | 3 new pass | i18n EN+ET |
| T-B1 | B | First-level consent store | done | core/consent-store.ts/.spec.ts | 5 pass | necessary-only, versioned |
| T-B2 | B | Consent banner component | done | shared/consent-banner.component.* | 6 pass | a11y region, single explicit action |
| T-B3 | B | i18n en/et for consent + how | done | core/i18n/{messages,en,et}.ts | parity pass | proper ET translations |
| T-C | C | Design/UX review | done (audit) | (report) | - | tokens already coherent; no arbitrary changes |
| T-D | A | Legal links in register/login/account | done | auth/register, auth/login, account | existing pass | + fixed stale "reviews" copy |
| T-F | F | Validation | done | - | 865 pass / 5 pre-existing | tsc, prettier, ng build green |

Pre-existing failures (present at HEAD, not from this workstream): 5 map-page tests asserting a
`.shelter-row--nearest` emphasis class the committed template never renders.
