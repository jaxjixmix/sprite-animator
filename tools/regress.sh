#!/bin/bash
# Regression sweep: load each local test sprite and report what the app detected.
cd "$(dirname "$0")/.." || exit 1
for L in petrel aituber bluey; do
  agent-browser open "http://localhost:8931/index.html" >/dev/null 2>&1
  sleep 2
  agent-browser eval "document.head.appendChild(Object.assign(document.createElement('script'),{src:'/.local-samples/$L-loader.js'})); 'loading'" >/dev/null 2>&1
  sleep 13
  agent-browser eval "document.head.appendChild(Object.assign(document.createElement('script'),{src:'/.local-samples/report.js'})); 'r'" >/dev/null 2>&1
  sleep 2
  printf '%s -> ' "$L"
  agent-browser eval "JSON.stringify(window.__report)" 2>&1 | tail -1
  if [ "$L" = "bluey" ]; then
    agent-browser eval "document.head.appendChild(Object.assign(document.createElement('script'),{src:'/.local-samples/sim-probe.js'})); 's'" >/dev/null 2>&1
    sleep 2
    printf '   similarity: '
    agent-browser eval "JSON.stringify(window.__simProbe)" 2>&1 | tail -1
  fi
done
