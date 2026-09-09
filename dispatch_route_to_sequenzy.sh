#!/bin/bash
# Dispatch IndianKeto Sequenzy routing fix to Claude Code (glm-5.3-flash bulk tier)
set -e
cd "$(dirname "$0")"

export OLLAMA_API_KEY=$(grep '^OLLAMA_API_KEY=' ~/.hermes/.env | cut -d= -f2-)
if [ -z "$OLLAMA_API_KEY" ]; then
  export OLLAMA_API_KEY=$(grep '^OLLAMA_API_KEY=' ~/.hermes/profiles/coder/.env | cut -d= -f2-)
fi

mkdir -p logs
exec ~/.local/bin/cc --worktree --inline-refs "Read the full spec at specs/route-to-sequenzy.md and implement it exactly." --output-format json 2>&1 | tee logs/route-to-sequenzy.log
