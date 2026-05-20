#!/usr/bin/env bash
# Banned-vocabulary lint for content/.
# CI-enforced terms: `extension`, `Dev Console`.
# Other terms (manifest, synapse, gateway, *-extension) are review-enforced — see CONTRIBUTING.md.
set -euo pipefail

CONTENT_DIR="${1:-content}"

# Two banned terms, case-insensitive.
# `extension` as a standalone word (word boundaries); "Dev Console" as the exact two-word phrase.
BANNED='\bextension\b|Dev Console'

if [ ! -d "$CONTENT_DIR" ]; then
  echo "lint-vocab: $CONTENT_DIR does not exist; nothing to check"
  exit 0
fi

# Exclude /concepts/glossary/ where banned terms are documented intentionally.
MATCHES=$(grep -rnE -i \
  --include="*.mdx" --include="*.md" \
  --exclude-dir="glossary" \
  "$BANNED" "$CONTENT_DIR" 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  echo ""
  echo "ERROR: banned vocabulary detected in $CONTENT_DIR/. See AGENTS.md and CONTRIBUTING.md."
  exit 1
fi

echo "lint-vocab: $CONTENT_DIR clean"
exit 0
