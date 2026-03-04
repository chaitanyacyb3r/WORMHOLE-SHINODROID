#!/bin/sh
# ══════════════════════════════════════════════════════════════════════════
# ShinobiDroid — Docker Entrypoint for Next.js
#
# Replaces build-time placeholder env vars with actual runtime values.
# This is required because NEXT_PUBLIC_* vars are inlined into the
# JavaScript bundle during `next build` and cannot be overridden at runtime.
# ══════════════════════════════════════════════════════════════════════════

set -e

# Define placeholder → runtime variable mappings
PLACEHOLDER_URL="https://placeholder.supabase.co"
PLACEHOLDER_KEY="placeholder-anon-key-for-build-only"

RUNTIME_URL="${NEXT_PUBLIC_SUPABASE_URL}"
RUNTIME_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# Only replace if runtime values are set (not empty)
if [ -n "$RUNTIME_URL" ] && [ "$RUNTIME_URL" != "$PLACEHOLDER_URL" ]; then
    echo "🔧 Injecting NEXT_PUBLIC_SUPABASE_URL into client bundle..."
    find /app/.next -name "*.js" -exec sed -i "s|$PLACEHOLDER_URL|$RUNTIME_URL|g" {} + 2>/dev/null || true
fi

if [ -n "$RUNTIME_KEY" ] && [ "$RUNTIME_KEY" != "$PLACEHOLDER_KEY" ]; then
    echo "🔧 Injecting NEXT_PUBLIC_SUPABASE_ANON_KEY into client bundle..."
    find /app/.next -name "*.js" -exec sed -i "s|$PLACEHOLDER_KEY|$RUNTIME_KEY|g" {} + 2>/dev/null || true
fi

echo "✅ Environment injected — starting Next.js server..."

# Execute the original CMD
exec "$@"
