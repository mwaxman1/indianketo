#!/bin/bash
# Dispatch the indianketo design rebuild + ketolife.in build to the Opus 5 tier.
# Foreground would be killed at 420s (see claude-code-orchestration
# references/opus-foreground-timeout-recovery.md) — run detached and poll.
set -euo pipefail
cd /home/mike/projects/indianketo
mkdir -p logs
LOG=logs/opus-rebuild-$(date +%s).log
echo "log: $LOG"
# --no-bare is implicit for the opus tier (the harness drops --bare because bare
# mode breaks Anthropic OAuth). No OLLAMA_API_KEY needed on this tier.
setsid ~/.local/bin/cc --opus --worktree --branch indianketo-showpiece \
  --inline-refs "Complete the work described in specs/showpiece-rebuild.md. Read that spec first and follow it exactly — it is the whole task. Key points: use the 16 photographs already in src/assets/photos via src/data/photos.ts, delete the Google Fonts link so the self-hosted fonts in public/fonts actually load, rebuild the homepage and all pages mobile-first, then build the ketolife.in sister site in ~/projects/ketolife. A placeholder is a defect. Run every verification command in the spec and paste the real output." \
  --output-format json > "$LOG" 2>&1 &
echo "dispatched pid $!"
