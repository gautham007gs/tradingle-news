#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Tradingle — Local Dev Setup
# Auto-installs missing runtime (bun / node) and starts dev server
# Usage: bash scripts/dev-local.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()     { echo -e "${RED}[error]${NC} $*" >&2; }

# ── 1. Bun ────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  warn "bun not found — installing..."
  if command -v curl &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
  elif command -v wget &>/dev/null; then
    wget -qO- https://bun.sh/install | bash
  else
    err "Neither curl nor wget found. Please install bun manually: https://bun.sh/docs/installation"
    exit 1
  fi
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  info "bun installed: $(bun --version)"
else
  info "bun $(bun --version) ✓"
fi

# ── 2. Node (fallback via bun's bundled node) ─────────────────
if ! command -v node &>/dev/null; then
  warn "node not found — adding bun's bundled node shim..."
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

# ── 3. Dependencies ───────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  info "node_modules not found — running bun install..."
  bun install
else
  info "node_modules present ✓"
fi

# Verify next is available after install
if [ ! -f "node_modules/.bin/next" ] && [ ! -f "node_modules/next/dist/bin/next" ]; then
  warn "next.js binary not found — re-running bun install..."
  bun install
fi

# ── 4. Env file check ─────────────────────────────────────────
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
  warn ".env.local not found — copying from .env.example"
  cp .env.example .env.local
  warn "Edit .env.local with your local database credentials before proceeding."
fi

# ── 5. Start dev server ───────────────────────────────────────
info "Starting Next.js dev server on http://localhost:3000 ..."
exec bun run dev
