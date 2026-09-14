# Checkout session status (QA)

| Session | Role | Model | Task | Status | Last checkpoint |
| --- | --- | --- | --- | --- | --- |
| sa-8bcab93c | qa-lang-detect | Qwen3.8-27B | language-coverage check | done | full hardcoded-string report delivered |
| sa-733373d0 | design-rework | Qwen3.8-27B | "How OpenShelter works" de-AI rework | done | map-page.html/.scss edited, gates green |
| sa-dd69a3cc | i18n-auth | Qwen3.8-27B | auth pages EN/ET translation | running | catalogs done, wiring login |
| sa-ab954f33 | qa-openstatus | Qwen3.8-27B | open-status "No static resource" root cause | running | inspecting served chunk |
| sa-b4b3c433 | review-security | Qwen3.8-27B | backend security/authorization review | running | - |
| sa-9ea4a9bf | review-privacy | Qwen3.8-27B | privacy/data review | running | - |
| sa-8e5efe82 | review-frontend | Qwen3.8-27B | frontend correctness/UX/a11y review | running | - |

Backend test baseline: `mvn test` exit 0 (green).
Frontend baseline: 865 pass / 5 fail (the 5 `.shelter-row--nearest` tests, now being fixed by fix-map-tests).
