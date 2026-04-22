#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building orchestrator bundle..."
cd orchestrator && npm run build:bundle
cd ..

echo "Copying native modules..."
mkdir -p src-tauri/resources/node_modules
cp -r orchestrator/node_modules/better-sqlite3 src-tauri/resources/node_modules/better-sqlite3

echo "Orchestrator packaged."
