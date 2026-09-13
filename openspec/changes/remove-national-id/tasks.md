# Tasks: remove-national-id

## Phase 1 — Backend

- [x] V12 migration: `ALTER TABLE users DROP COLUMN national_id_code`
- [x] Domain: `UserData` drops the component; `RegisteredUser` drops the field, `changeNationalIdCode`, and the constructor param (public + admin-only ctor); `AdminUser` ctor + `provisioned` drop the param (SMART_ID claim ref = admin e-mail)
- [x] Persistence: `UserEntity` field/accessors, `UserMapper` mapping + 3-arg ctor calls
- [x] DTOs: `RegisterRequest`, `ProfileUpdateRequest` (name-only), `MeResponse` lose the component; `AccountController` javadoc
- [x] Services: `UserService.register` (3-arg), `AuthService.register`, `AccountService.updateProfile` (name-only), `AdminSeeder` call site
- [x] SMART_ID preserved: enum value, stub provider, controller 400 rejection, FE-hidden state — no changes, verified by existing tests still green
- [x] Tests: every IT register payload + `AccountControllerIT` (me/profile assertions, name-only validation), `UserServiceTest`, `UserHierarchyTest`, `UserRepositoryIT`, verification-provider/service unit tests
- [x] Targeted mvn tests green (full suite by orchestrator)

## Phase 2 — Frontend

- [x] Models: `RegisterRequest`, `ProfileUpdateRequest`, `MeResponse` drop `nationalIdCode`
- [x] Register page: form control + template field + spec
- [x] Account page: identity card row + edit input + spec (name-only edit); `auth-store` signal + spec; gateway comments + specs
- [x] Shell/interceptor/verify/admin spec fixtures lose the field
- [x] tsc + ng test + prettier green

## Phase 3 — Orchestrator

- [x] Full gates (mvn test, ng test, tsc)
- [x] Spec delta (this directory) + docs/context sync (BE 03/04/07, FE 02/03/04/07, README, whitepaper)
- [x] Commit `M1: remove national ID code`
