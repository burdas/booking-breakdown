#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist

npx web-ext build --overwrite-dest --artifacts-dir ./dist \
  --ignore-files "*.md" LICENSE package.json package-lock.json scripts

ZIP="$(ls dist/*.zip)"
python3 -m zipfile -e "$ZIP" "${ZIP%.zip}"
