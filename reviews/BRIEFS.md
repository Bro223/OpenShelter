# Review sweep — shared brief

Agents 1–11: read the COMMON RULES below, then your own task. Save your report to
`reviews/NN-topic.md` (NN = your agent number, topic = the name in brackets in your task),
created from the repository root. Agent 12 runs last and reads all the other reports.

Project: Java Spring Boot backend + Angular frontend (locate the backend and frontend
folders yourself). Subagents do not share context, so the COMMON RULES apply to
agents 1–11.

## COMMON RULES

- READ-ONLY review: do not modify, delete or reformat any source file. The only file you may create is your own report.
- First detect the versions in use (Java, Spring Boot, Angular, Maven/Gradle, test frameworks) from pom.xml / build.gradle / package.json and judge the code against best practices for those versions.
- Ignore generated and vendor folders: target, build, node_modules, dist, .angular.
- Report only real issues found in this code, never generic advice. For each issue give: severity (Critical / High / Medium / Low), file path and line, what is wrong, why it matters, suggested fix. If an area is clean, say so explicitly.
- Before calling anything unused or missing, search the whole repo to confirm (including tests, templates, reflection and Spring annotations).
- Save the report to reviews/NN-topic.md (NN = agent number, topic = the name in brackets) and end it with the top 5 findings.

## agent1 task (architecture)

Review overall architecture and structure. Backend: package structure, layering (controller, service, repository), business logic in controllers or repositories, JPA entities returned directly from the API instead of DTOs, circular dependencies, field injection instead of constructor injection, configuration classes and profiles. Frontend: folder structure, core / shared / feature separation, module or standalone-component organization, routing and lazy loading, circular imports. Point out where the structure will hurt maintainability.

## agent2 task (backend-clean-code)

Review the Java code for clean code and dead code. Find: unused classes, methods, fields, imports, beans, endpoints and config properties; unused or duplicate dependencies in pom.xml / build.gradle; commented-out code; leftover TODO / FIXME and debug code (System.out, printStackTrace); duplicated logic; long methods and classes doing too much; magic numbers and strings; poor naming; deep nesting; misuse of Optional, streams or Lombok; SOLID violations.

## agent3 task (backend-tests)

Review the backend tests. Find: classes and methods without tests (prioritize services, business logic, security config, validators); missing edge cases and error paths; tests with weak or no assertions; over-mocking; order-dependent or flaky tests (Thread.sleep, real clock, random data); wrong test scope (@SpringBootTest where @WebMvcTest, @DataJpaTest or a plain unit test is enough); missing integration tests for repositories and REST endpoints; naming and structure. Use the JaCoCo report if one exists. End with a prioritized list of the tests to add first.

## agent4 task (backend-security)

Do a security review of the Spring Boot backend: Spring Security config (public vs protected endpoints, role checks, method security), authentication and JWT / session handling, missing authorization checks (IDOR), CORS and CSRF, missing input validation (@Valid on request bodies and params), SQL / JPQL injection in native or concatenated queries, mass assignment through entity binding, secrets or credentials in config files, sensitive data in logs or error responses, exposed actuator endpoints, file uploads, password hashing, and dependencies with known vulnerabilities.

## agent5 task (backend-database-performance)

Review data access and performance: N+1 queries and lazy-loading problems, list endpoints without pagination, wrong @Transactional boundaries (missing, too broad, readOnly not set), loading full entities where projections would do, missing DB indexes, bidirectional relation and cascade problems, equals / hashCode on entities, migration quality (Flyway / Liquibase), blocking or heavy work in request threads, missing caching, and connection pool / JPA settings (open-in-view, ddl-auto in non-dev profiles).

## agent6 task (backend-api-errors-logging)

Review REST API design, error handling and logging: REST conventions (URLs, methods, status codes), consistent request / response DTOs, global exception handling (@ControllerAdvice) and a consistent error format, swallowed or overly broad catch blocks, generic RuntimeException usage, validation error responses, API versioning, OpenAPI / Swagger docs, log levels and message quality, sensitive data in logs, and consistent use of SLF4J.

## agent7 task (frontend-clean-code)

Review the Angular code for clean code and dead code: unused components, services, pipes, directives, modules, routes, models and imports; unused npm dependencies; commented-out code, console.log and debugger statements; use of any and disabled strict TypeScript checks; duplicated or copy-pasted logic; oversized components or functions; business logic in components or templates that belongs in services; naming inconsistencies; hardcoded URLs, strings and magic numbers that belong in environment files or constants.

## agent8 task (frontend-angular-rxjs)

Review Angular and RxJS best practices for the version in use: nested subscribes, missing unsubscribe / takeUntilDestroyed (memory leaks), missing async pipe, wrong use of switchMap / mergeMap / concatMap / exhaustMap, streams without error handling, change detection (OnPush, function calls or heavy logic in templates), signals where the version supports them, standalone components vs NgModules consistency, typed reactive forms, smart vs presentational components, state management approach, ngFor without trackBy (or @for without track), deprecated APIs, and HTTP layer design (interceptors, typed responses instead of any).

## agent9 task (frontend-tests)

Review the Angular tests (Jasmine / Karma, Jest or whatever is configured, plus Cypress / Playwright if present): components, services, guards, interceptors, pipes and resolvers with no tests or only the default generated spec; tests that only assert the component is created; missing tests for forms, error states and route guards; wrong use of TestBed, fakeAsync / waitForAsync and HttpTestingController; tests coupled to real HTTP or shared state; missing e2e coverage of critical user flows. End with a prioritized list of the tests to add first.

## agent10 task (frontend-security-perf-a11y)

Review the Angular frontend for security, performance and accessibility. Security: XSS risks (bypassSecurityTrust*, innerHTML, dynamic URLs), where auth tokens are stored, guards and interceptors, secrets in environment files. Performance: bundle size and heavy dependencies, lazy loading, large lists without virtual scroll, unoptimized images, source maps in production builds. Accessibility: semantic HTML, alt text, form labels, keyboard navigation, ARIA usage, color contrast.

## agent11 task (integration-devops)

Review the integration between frontend and backend, and the project setup. Integration: mismatches between backend DTOs and frontend TypeScript interfaces (names, types, nullability, enums), frontend calls to endpoints that do not exist and backend endpoints never used, inconsistent error format handling, validation rules duplicated in both places that can drift apart. Setup: Dockerfile(s), CI/CD config, environment / profile separation (application-*.yml, environment.ts), .gitignore, README accuracy (can a new developer run the project from it?), and outdated dependencies (Java, Spring Boot, Angular, npm packages) with EOL or security concerns.

## agent12 task (summary) — runs LAST, after 1–11

Read all reports in reviews/ written by the previous agents. Do not review the code again and do not modify any file except your own report. Your report must contain: an executive summary with an overall health rating from 1 to 10 for backend and frontend, with justification; the merged, de-duplicated list of findings sorted by severity; a top-10 action plan split into quick wins and larger refactors, with rough effort (S / M / L); the areas that were found clean; and any findings where two reports contradict each other.
