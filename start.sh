#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Shinodroid 忍ドロイド — Production Startup Script
#
# This script:
#   1. Validates the environment configuration
#   2. Starts all Docker services
#   3. Pulls the AI model into the Ollama container
#   4. Verifies all services are healthy
#
# Usage:
#   chmod +x start.sh && ./start.sh
#
# Requirements:
#   - Docker Desktop running
#   - .env file configured (copy from .env.example)
#   - web/.env.local configured (Convex credentials)
# ══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo ""
echo -e "${PURPLE}  ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}  ║   🥷 Shinodroid — Production Launcher            ║${NC}"
echo -e "${PURPLE}  ╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Validate environment ─────────────────────────────────────────
echo -e "${CYAN}[1/5]${NC} Checking environment files..."

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "   Copy .env.example to .env and fill in your values:"
    echo "   cp .env.example .env"
    exit 1
fi

if [ ! -f web/.env.local ]; then
    echo -e "${RED}❌ web/.env.local not found!${NC}"
    echo "   This file must contain your Convex credentials."
    exit 1
fi

# Check required vars
source .env
if [ -z "$MOBSF_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  MOBSF_API_KEY is empty in .env${NC}"
fi

echo -e "${GREEN}✅ Environment files found${NC}"

# ── Step 2: Build and start services ─────────────────────────────────────
echo ""
echo -e "${CYAN}[2/5]${NC} Building and starting Docker services..."
echo -e "      ${YELLOW}(This may take 5-10 minutes on first run)${NC}"
echo ""

# Use only the production compose file (skip override)
docker compose -f docker-compose.yml build --parallel
docker compose -f docker-compose.yml up -d

echo ""
echo -e "${GREEN}✅ All containers started${NC}"

# ── Step 3: Pull AI model ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/5]${NC} Pulling AI model into Ollama container..."
echo -e "      ${YELLOW}(This downloads ~4GB on first run, be patient)${NC}"
echo ""

# Wait for Ollama to be ready
MAX_RETRIES=30
RETRY=0
until docker exec Shinodroid-ollama curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ Ollama failed to start after ${MAX_RETRIES} attempts${NC}"
        docker compose -f docker-compose.yml logs ollama --tail=20
        exit 1
    fi
    echo "   Waiting for Ollama... (${RETRY}/${MAX_RETRIES})"
    sleep 2
done

# Pull the model
OLLAMA_MODEL="${OLLAMA_MODEL:-minimax-text-01:cloud}"
echo -e "   Pulling model: ${CYAN}${OLLAMA_MODEL}${NC}"
docker exec Shinodroid-ollama ollama pull "$OLLAMA_MODEL"

echo ""
echo -e "${GREEN}✅ AI model ready${NC}"

# ── Step 4: Verify services ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}[4/5]${NC} Verifying service health..."
echo ""

sleep 5

check_service() {
    local name=$1
    local container=$2
    local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
    local running=$(docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null || echo "false")
    
    if [ "$running" = "true" ]; then
        if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
            echo -e "   ${GREEN}✅ ${name}${NC} — running"
        else
            echo -e "   ${YELLOW}⏳ ${name}${NC} — starting (${status})"
        fi
    else
        echo -e "   ${RED}❌ ${name}${NC} — not running"
    fi
}

check_service "Web Dashboard" "Shinodroid-web"
check_service "Scan Worker" "Shinodroid-worker"  
check_service "MobSF Engine" "Shinodroid-mobsf"
check_service "Ollama AI" "Shinodroid-ollama"

# ── Step 5: Print access info ────────────────────────────────────────────
echo ""
echo -e "${CYAN}[5/5]${NC} Ready!"
echo ""
echo -e "${PURPLE}  ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}  ║   🌐 Dashboard:  ${GREEN}http://localhost:3000${PURPLE}           ║${NC}"
echo -e "${PURPLE}  ║   📊 Status:     ${GREEN}docker compose ps${PURPLE}               ║${NC}"
echo -e "${PURPLE}  ║   📋 Logs:       ${GREEN}docker compose logs -f worker${PURPLE}   ║${NC}"
echo -e "${PURPLE}  ║   🛑 Stop:       ${GREEN}docker compose down${PURPLE}             ║${NC}"
echo -e "${PURPLE}  ╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Upload an APK from the dashboard to start scanning! 🚀${NC}"
echo ""
