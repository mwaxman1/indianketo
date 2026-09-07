#!/bin/bash
# Dispatch indianketo Astro 6→7 migration via cc (T1 bulk glm-5.3-flash)
set -e
cd /home/mike/projects/indianketo
export OLLAMA_API_KEY=$(grep '^OLLAMA_API_KEY=' ~/.hermes/.env | cut -d= -f2-)
mkdir -p logs
exec ~/.local/bin/cc --worktree --branch indianketo-cc-$(date +%s%N) --inline-refs "$(cat BUILD_PROMPT_astro7.md)" --output-format json 2>&1 | tee logs/astro7-migration.log
