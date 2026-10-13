#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (what GitHub Pages serves).
set -euo pipefail
cd "$(dirname "$0")/.."
node build.mjs
REMOTE=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -r dist/. "$TMP"/
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(grep -o 'tbb-[0-9]*' sw.js)"
git push -q -f "$REMOTE" gh-pages
echo "Deployed to gh-pages"
