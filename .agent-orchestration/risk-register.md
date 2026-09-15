# Risk register

| Risk | Likelihood | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| Legal text not reviewed by a lawyer | high | medium | careful wording, placeholders, "intended to describe" | open (human) |
| Operator identity/contact unpublished | certain | medium | [OPERATOR LEGAL NAME] etc. placeholders | open (owner) |
| Retention schedule undecided | certain | low | [RETENTION PERIOD TO BE CONFIRMED] + current-behaviour-only wording | open (owner) |
| Community data mistaken for official | medium | high | source labels, badges, how-block disclaimers, no-warranty terms | mitigated in UI |
| Optional services loaded without consent | n/a | low | none exist; nothing to gate | closed |
| Geolocation auto-requested | n/a | low | already user-initiated only | closed |
| Bad Estonian in translated chrome | medium | medium | careful translation, quoted UI terms, human review follow-up | partially open |
| 5 pre-existing map-page spec failures mask new regressions | medium | low | isolated to `.shelter-row--nearest`; documented | closed — `map-page.spec.ts` now asserts the class is ABSENT (`:752`, `:850`, `:1012`) and the frontend suite is green (953 tests across 45 spec files) |
| Build budget drift (map-page.scss) | medium | low | budget raised to 10kB with rationale | mitigated |
