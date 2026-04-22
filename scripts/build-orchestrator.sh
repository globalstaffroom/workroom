#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building orchestrator bundle..."
cd orchestrator && npm run build:bundle
cd ..

echo "Copying native modules..."
mkdir -p src-tauri/resources/node_modules
cp -r orchestrator/node_modules/better-sqlite3 src-tauri/resources/node_modules/better-sqlite3
cp -r orchestrator/node_modules/bindings src-tauri/resources/node_modules/bindings
cp -r orchestrator/node_modules/file-uri-to-path src-tauri/resources/node_modules/file-uri-to-path
# Remove stale .js bundle if present
rm -f src-tauri/resources/orchestrator.js

echo "Orchestrator packaged."
