#!/usr/bin/env sh
# 執行：sh scripts/preview-openapi.sh
# VS Code / Swagger 單檔預覽：.cache/openapi/openapi.yaml
# 可直接開啟的網頁文件：.cache/openapi/index.html
# 兩者皆為自動產生、已忽略的預覽檔；只修改 specs/truth/contracts/ 的分檔來源。
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
preview_dir="$project_root/.cache/openapi"
mkdir -p "$preview_dir"

npx --yes @redocly/cli@2.75.0 bundle \
  "$project_root/specs/truth/contracts/openapi.yaml" \
  --dereferenced --output "$preview_dir/openapi.yaml"

npx --yes @redocly/cli@2.75.0 build-docs \
  "$preview_dir/openapi.yaml" \
  --inlineBundle --output "$preview_dir/index.html"

printf '%s\n' "$preview_dir/openapi.yaml" "$preview_dir/index.html"
