#!/usr/bin/env bash
#
# dev-start.sh — start the OpenShelter backend for LOCAL DEVELOPMENT.
#
# WHY THIS SCRIPT EXISTS
#   Since the 2026-09-08 security-review hardening the app is FAIL-CLOSED at
#   boot, via two guards (do not "fix" this by loosening them):
#     • ProdJwtGuard      — refuses the published dev-default / < 32-byte JWT_SECRET
#     • DevEndpointsGuard — refuses the /dev/email-test + /dev/sms-test
#                           diagnostic endpoints when they are enabled
#   Both refuse to boot UNLESS the active Spring profile is exactly `dev` or
#   `test` (dev parity). Your local .env turns those /dev/* diagnostic
#   endpoints ON (real SMTP + Twilio) and does not set a strong JWT_SECRET,
#   so a bare
#       mvn spring-boot:run
#   now exits at startup with "PRODUCTION REFUSED TO START".
#
#   This script pins SPRING_PROFILES_ACTIVE=dev for the JVM so a normal local
#   run carries the dev profile and both guards are satisfied. The .env itself
#   (SMTP / Twilio / dev-test flags) is still loaded into the JVM automatically
#   by spring-dotenv — this script only adds the one thing spring-dotenv should
#   not decide for you, the active profile.
#
# USAGE
#   ./dev-start.sh                 # normal dev start (port 8080)
#   ./dev-start.sh --run-registry  # also run a one-shot Päästeamet import
#
#   Equivalent one-liners (if you prefer to skip the script):
#     SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
#     SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run \
#         -Dspring-boot.run.arguments="--app.registry.client=dev --app.registry.run-on-startup=true"
#
#   The test suite is unaffected: `mvn test` runs under profile `test` from its
#   own classpath application.yml and does not use this script.
#
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SPRING_PROFILES_ACTIVE=dev

# Postgres preflight: Flyway runs before the web server starts, so a database
# that is not accepting connections turns into a wall of Hikari retries and a
# stack trace that buries the one fact that matters. Check the socket first
# (briefly waiting, because a container that just restarted needs a moment)
# and, on failure, say what to do about it instead of letting Maven dump 25 s
# of connection errors.
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
for _ in $(seq 1 15); do
  (exec 3<>"/dev/tcp/${DB_HOST}/${DB_PORT}") 2>/dev/null && break
  sleep 1
done
if ! (exec 3<>"/dev/tcp/${DB_HOST}/${DB_PORT}") 2>/dev/null; then
  echo "dev-start.sh: Postgres is not accepting connections on ${DB_HOST}:${DB_PORT}." >&2
  echo "  The backend cannot boot without it — Flyway migrates before the web server starts." >&2
  echo "  Start it:   docker compose up -d db" >&2
  echo "  Wait for:   docker compose ps        # until the db reports 'healthy'" >&2
  echo "  Then rerun: ./dev-start.sh" >&2
  exit 1
fi

# ./dev-start.sh --run-registry → one-shot Päästeamet import on startup.
if [[ "${1:-}" == "--run-registry" ]]; then
  exec mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.run-on-startup=true"
fi

exec mvn spring-boot:run
