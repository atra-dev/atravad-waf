#!/usr/bin/env bash
#
# Fix npm modsecurity build when libmodsecurity was installed to
# /usr/local/modsecurity (default). The npm package expects headers in
# /usr/local/include and lib in /usr/local/lib. This script creates
# symlinks so the existing install is found without rebuilding.
#
# Run with sudo if you already ran install-libmodsecurity.sh and then
# npm install still failed with "modsecurity/modsecurity.h: No such file or directory".
#
set -e

INC_SRC="/usr/local/modsecurity/include/modsecurity"
LIB_SRC="/usr/local/modsecurity/lib"
INC_DEST="/usr/local/include/modsecurity"
LIB_DEST="/usr/local/lib"

if [ ! -d "$INC_SRC" ]; then
  echo "Not found: $INC_SRC (libmodsecurity not installed under /usr/local/modsecurity?)"
  exit 1
fi

echo "[fix-modsecurity-paths] Linking headers and lib so npm modsecurity can build..."
sudo ln -sfn "$INC_SRC" "$INC_DEST" 2>/dev/null || true
for so in "$LIB_SRC"/libmodsecurity.so*; do
  [ -e "$so" ] || continue
  base=$(basename "$so")
  sudo ln -sfn "$so" "$LIB_DEST/$base" 2>/dev/null || true
done
if [ -d /etc/ld.so.conf.d ]; then
  echo "$LIB_SRC" | sudo tee /etc/ld.so.conf.d/modsecurity.conf >/dev/null
  sudo ldconfig
fi
echo "[fix-modsecurity-paths] Done. Run: npm install"
