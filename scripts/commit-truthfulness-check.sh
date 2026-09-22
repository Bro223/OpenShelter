#!/usr/bin/env bash
# Commit-truthfulness check (review 18 F6 + 15's F1; review 18 top-5 fix 5).
#
# A commit message in this repo is a CLAIM: it describes what the diff
# delivers. Two mechanical classes of false claim have actually occurred:
#   (a) an EMPTY commit whose message describes a diff that does not exist
#       anywhere in the commit (9aff085);
#   (b) a message that NAMES report files the commit does not contain
#       (15's F1: three "wave-N report" messages).
#
# Entry points (wired as .githooks/pre-commit and .githooks/commit-msg):
#   commit-truthfulness-check.sh empty          — pre-commit: the staged
#       diff must not be empty (merge commits are exempt — a merge
#       legitimately carries no staged diff of its own).
#   commit-truthfulness-check.sh message <file> — commit-msg: every
#       reviews/… or docs/… path named in the message must be a file the
#       staged diff contains (a name ending in '/' is a directory
#       mention: at least one staged file under it).
#
# Message discipline this encodes: a file NAMED in the message is a file
# the commit DELIVERS. Citing an unchanged report as context (an anchor,
# a cross-reference) is done without its path form, or with a deliberate
# `git commit --no-verify` + the reason recorded — the hook's job is to
# make the exception visible, not to hide it.
#
# Enable per clone: git config core.hooksPath .githooks
# Dependency-free on purpose: bash + git only (no Node, no Python).

set -u

fail() {
  printf '\ncommit-truthfulness: %s\n' "$1" >&2
  printf 'refusing the commit. Deliberate exception: git commit --no-verify\n' >&2
  printf '(and record why in the PR or the next commit).\n' >&2
  exit 1
}

MODE="${1:-empty}"

# --- rule 1: the empty-commit rule (pre-commit) -----------------------------
# 9aff085: a message describing work that no diff anywhere contains.
if [[ "$MODE" == "empty" ]]; then
  if [[ -n "$(git rev-parse --verify -q MERGE_HEAD 2>/dev/null)" ]]; then
    exit 0
  fi
  if git diff --cached --quiet; then
    fail "the staged diff is EMPTY, but a commit message will claim work.
An empty commit cannot deliver what it names (the 9aff085 finding).
Stage the work, amend the message to what the diff IS, or use --no-verify."
  fi
  exit 0
fi

# --- rule 2: named report paths must be in the staged diff (commit-msg) -----
if [[ "$MODE" != "message" || $# -lt 2 ]]; then
  echo "usage: commit-truthfulness-check.sh {empty | message <message-file>}" >&2
  exit 1
fi
MSG_FILE="$2"
MSG=""
if [[ -f "$MSG_FILE" ]]; then
  MSG=$(cat "$MSG_FILE")
fi

STAGED=$(git diff --cached --name-only)

# Every reviews/… or docs/… path token the message names. A ":line" anchor
# is cut naturally (':' is not a path character); trailing sentence
# punctuation is stripped; git strips comment lines from the message file
# itself, so the check sees only what the author wrote.
NAMES=$(printf '%s\n' "$MSG" \
  | grep -oE '(reviews|docs)/[A-Za-z0-9._/-]+' \
  | sed -E 's#[.,;:]+$##' \
  | sort -u)

MISSING=""
for name in $NAMES; do
  if [[ "$name" == */ ]]; then
    # directory mention: at least one staged file under the prefix
    printf '%s\n' "$STAGED" | grep -q "^$name" || MISSING="$MISSING
  $name (no staged file under it)"
  else
    printf '%s\n' "$STAGED" | grep -qxF "$name" || MISSING="$MISSING
  $name"
  fi
done

if [[ -n "$MISSING" ]]; then
  fail "the message names report path(s) the staged diff does NOT contain:$MISSING
A message claims what the diff delivers: stage the file(s), remove the
name from the message (cite the unchanged file without its path form),
or use --no-verify with a reason."
fi
