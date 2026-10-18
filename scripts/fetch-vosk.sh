#!/bin/sh
# Fetch vosk-browser and the Vosk models into vendor/vosk/ (not in git; run before deploy).
# Downloads are sha256-pinned. Models are repacked as .tar.gz with one model folder at the root.
# VOSK_DL=<dir> reuses/keeps downloads there instead of a throwaway temp dir.
set -eu

cd "$(dirname "$0")/.."
OUT=vendor/vosk
LIB=vosk-browser-0.0.8.tgz
LIB_SHA=fd16fc7e64c935d7a79cf07c8f67d84232b6485376a59144af8a234979a9a4b4
MODELS="vosk-model-small-pl-0.22:c4cd16498ea544f446f9e9a55cbd602b71cfe5a2b6f2b0834d81e1b6fce15f0d
vosk-model-small-en-us-0.15:30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498"

sha() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
DL=${VOSK_DL:-$TMP}
mkdir -p "$OUT" "$DL"

# fetch <url> <sha256>: download into $DL (unless already there) and verify
fetch() {
  f="$DL/${1##*/}"
  [ -f "$f" ] || { echo "download $1"; curl -fsSL --retry 3 -o "$f.part" "$1"; mv "$f.part" "$f"; }
  [ "$(sha "$f")" = "$2" ] || { echo "sha256 mismatch: $f" >&2; rm -f "$f"; exit 1; }
}

if [ ! -f "$OUT/vosk.js" ]; then
  fetch "https://registry.npmjs.org/vosk-browser/-/$LIB" "$LIB_SHA"
  tar xzf "$DL/$LIB" -C "$TMP" package/dist/vosk.js
  mv "$TMP/package/dist/vosk.js" "$OUT/vosk.js.part" && mv "$OUT/vosk.js.part" "$OUT/vosk.js"
fi

echo "$MODELS" | while IFS=: read -r name hash; do
  [ -f "$OUT/$name.tar.gz" ] && continue
  fetch "https://alphacephei.com/vosk/models/$name.zip" "$hash"
  rm -rf "$TMP/x" && mkdir "$TMP/x"
  unzip -q "$DL/$name.zip" -d "$TMP/x"
  COPYFILE_DISABLE=1 tar czf "$OUT/$name.tar.gz.part" --format=ustar -C "$TMP/x" "$name"
  mv "$OUT/$name.tar.gz.part" "$OUT/$name.tar.gz"
done
ls -l "$OUT"
