#!/usr/bin/env bash
# Test for scripts/lint-vocab.sh — verifies fail-on-banned and pass-on-clean.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINT="$ROOT/scripts/lint-vocab.sh"
FIX_DIR="$(mktemp -d -t lint-vocab-test.XXXXXX)"
trap 'rm -rf "$FIX_DIR"' EXIT

mkdir -p "$FIX_DIR/content/docs"

# Fixture: a markdown file with a banned term ("extension")
cat > "$FIX_DIR/content/docs/bad.mdx" <<'EOF'
# Deploy
Use the Lessly extension to do this.
EOF

# Lint should fail on bad fixture
if "$LINT" "$FIX_DIR/content" >/dev/null 2>&1; then
  echo "FAIL: lint passed but should have failed on banned vocab"
  exit 1
fi

# Remove the bad fixture, add a clean one
rm "$FIX_DIR/content/docs/bad.mdx"
cat > "$FIX_DIR/content/docs/good.mdx" <<'EOF'
# Deploy
Install the Lessly MCP in your agent.
EOF

# Lint should pass on clean fixture
if ! "$LINT" "$FIX_DIR/content" >/dev/null 2>&1; then
  echo "FAIL: lint failed but should have passed on clean content"
  exit 1
fi

# Bonus: lint should fail on "Dev Console" too
cat > "$FIX_DIR/content/docs/bad2.mdx" <<'EOF'
# Install
Open the Dev Console and click Deploy.
EOF
if "$LINT" "$FIX_DIR/content" >/dev/null 2>&1; then
  echo "FAIL: lint passed but should have failed on 'Dev Console'"
  exit 1
fi

# Bonus: lint should NOT fail on MCP (explicitly NOT banned)
rm "$FIX_DIR/content/docs/bad2.mdx"
cat > "$FIX_DIR/content/docs/good2.mdx" <<'EOF'
# Install
Install the Lessly MCP server in your agent.
EOF
if ! "$LINT" "$FIX_DIR/content" >/dev/null 2>&1; then
  echo "FAIL: lint failed but should have passed when only 'MCP' is present (not banned)"
  exit 1
fi

echo "PASS"
