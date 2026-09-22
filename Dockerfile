# syntax=docker/dockerfile:1
#
# Shelter Map backend image (W2-C, P2-16).
#
# Multi-stage: compile with Maven on a JDK image, run on a JRE-only base so
# the runtime layer carries no compiler and no build tooling. The app is the
# API jar — the SPA is built and deployed separately (README "Production
# deployment"; the backend serves no static resources), so there is no
# Node stage in this image.
#
# No secrets in the image: runtime configuration comes exclusively from
# environment variables read by application.yml (DB_URL, JWT_SECRET,
# PII_*, SMTP_*, ...) — the same variables .env.example documents.
# Nothing is baked in, and .dockerignore keeps .env out of the context.

# ---- Stage 1: build -------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src

# pom first: the dependency layer is cached until the pom changes. The PMD
# gate's ruleset + exclusion manifest live next to the pom and must be in
# the build for `verify` to run it.
COPY pom.xml pmd-ruleset.xml pmd-exclude-from-failure.properties ./
RUN mvn -B -ntp -q dependency:go-offline

COPY src ./src
# -DskipTests: the full suite (unit + IT against Postgres) runs in the
# `backend` CI job; the image build must not depend on a container runtime.
# -Ddependency-check.skip: the OWASP scan downloads the ~400k-record NVD
# feed and runs in the `backend` CI job instead — no NVD data cache exists
# inside the container, so running it here would add ~30 min to every image
# build for a result the CI job already produces.
RUN mvn -B -ntp -q verify -DskipTests -Ddependency-check.skip=true

# ---- Stage 2: run ---------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy

# curl for the healthcheck (not in the temurin JRE base); ca-certs are
# already present.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home sheltermap
WORKDIR /app

COPY --from=build /src/target/*.jar app.jar
RUN chown sheltermap /app /app/app.jar
USER sheltermap

EXPOSE 8080

# Spring Boot answers /actuator/health unauthenticated (SecurityConfig)
# with {"status":"UP"}; show-details=when-authorized keeps details out of
# anonymous probes. start-period covers Flyway on a fresh database.
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=12 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
