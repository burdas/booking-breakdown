#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

OUTPUT_DIR="${PROJECT_DIR}/dist"
SOURCE_DIR="$PROJECT_DIR"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    --ext-name) EXT_NAME="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--output-dir <dir>] [--source-dir <dir>] [--ext-name <name>]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -f "${SOURCE_DIR}/manifest.json" ]]; then
  echo "Error: manifest.json not found in ${SOURCE_DIR}"
  exit 1
fi

VERSION=$(grep '"version"' "${SOURCE_DIR}/manifest.json" | head -1 | sed 's/.*"version": "\(.*\)",/\1/')
EXT_NAME="${EXT_NAME:-$(grep '"name"' "${SOURCE_DIR}/manifest.json" | head -1 | sed 's/.*"name": "\(.*\)",/\1/' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')}"
OUTPUT_FILE="${OUTPUT_DIR}/${EXT_NAME}-v${VERSION}.zip"

FILES=(
  manifest.json
  content.js
  styles.css
  popup.html
  popup.js
  popup.css
  icon16.png
  icon32.png
  icon48.png
  icon128.png
)

echo "Packaging ${EXT_NAME} v${VERSION}..."
echo "Output: ${OUTPUT_FILE}"
mkdir -p "$OUTPUT_DIR"

EXISTING_FILES=()
for f in "${FILES[@]}"; do
  if [[ -f "${SOURCE_DIR}/${f}" ]]; then
    EXISTING_FILES+=("$f")
  else
    echo "Warning: ${f} not found, skipping"
  fi
done

if command -v zip &>/dev/null; then
  (cd "$SOURCE_DIR" && zip -r "$OUTPUT_FILE" "${EXISTING_FILES[@]}")
else
  python3 - "$SOURCE_DIR" "$OUTPUT_FILE" "${EXISTING_FILES[@]}" <<'PYEOF'
import zipfile, os, sys
source_dir, output_file = sys.argv[1], sys.argv[2]
files = sys.argv[3:]
with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.write(os.path.join(source_dir, f), arcname=f)
PYEOF
fi

echo "Done: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
