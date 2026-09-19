#!/usr/bin/env bash
# check-guidance-bodies.sh — durable guard for the guidance blog bodies.
#
# Re-reads EVERY guidance post in every language (drafts included) from the
# admin API and FAILS (exit 1) if any stored body still contains raw
# markdown markers:
#   • `**`  anywhere          (unconverted bold marker)
#   • `##`  anywhere          (unconverted heading marker)
#   • a line starting with `# ` (unconverted h1 marker)
#
# The 2026-07 bodies were copy-pasted from .md files; MarkdownToHtml +
# MarkdownMigrationDriver converted them to the sanitizer's allow-listed
# HTML. This script is the tripwire that catches any future regression
# (a re-paste, a bad import, a manual edit) the next time it runs.
#
# Prereqs: a RUNNING backend (default http://localhost:8080, override with
# BASE=...), an admin account in .env (ADMIN_EMAIL / ADMIN_PASSWORD), and jq.
#
# Usage: qa/check-guidance-bodies.sh
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

BASE="${BASE:-http://localhost:8080}"
LOCALES="${LOCALES:-en et ru}"

if [[ ! -f .env ]]; then
  echo "check-guidance-bodies: .env not found in the repo root" >&2
  exit 2
fi
ADMIN_EMAIL="$(grep -E '^ADMIN_EMAIL=' .env | head -1 | cut -d= -f2-)"
ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2-)"
if [[ -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "check-guidance-bodies: ADMIN_EMAIL/ADMIN_PASSWORD missing from .env" >&2
  exit 2
fi

token="$(curl -fsS -X POST "$BASE/auth/login" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" \
        '{emailOrPhone: $e, password: $p}')" \
  | jq -er .accessToken)" || {
    echo "check-guidance-bodies: login against $BASE failed" >&2
    exit 2
  }

checked=0
failures=0
for locale in $LOCALES; do
  list="$(curl -fsS -H "authorization: Bearer $token" \
            "$BASE/admin/guidance?locale=$locale")"
  while IFS= read -r row; do
    id="$(jq -r .id <<<"$row")"
    slug="$(jq -r .slug <<<"$row")"
    status="$(jq -r .status <<<"$row")"
    body="$(jq -r '.bodyHtml // ""' <<<"$row")"
    checked=$((checked + 1))

    bad=()
    if grep -qF '**' <<<"$body"; then bad+=("'*' bold marker **"); fi
    if grep -qF '##' <<<"$body"; then bad+=('heading marker ##'); fi
    if grep -qE '^# ' <<<"$body"; then bad+=('h1 marker "# "'); fi

    if (( ${#bad[@]} > 0 )); then
      echo "FAIL [$locale] id=$id status=$status slug=$slug — raw markdown: ${bad[*]}"
      failures=$((failures + 1))
    fi
  done < <(jq -c '.[]' <<<"$list")
done

if (( failures > 0 )); then
  echo "check-guidance-bodies: $failures of $checked stored bodies still carry raw markdown — FAIL"
  exit 1
fi
echo "check-guidance-bodies: $checked stored bodies checked, no raw markdown markers — OK"
