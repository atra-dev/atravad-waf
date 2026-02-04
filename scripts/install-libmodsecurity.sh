#!/usr/bin/env bash
#
# Install libmodsecurity v3 (ModSecurity library + headers) so the
# `modsecurity` npm package can build its native addon.
#
# Use on Ubuntu, Debian, or WSL (Ubuntu/Debian). Run from project root or
# pass a directory; ModSecurity is cloned and built in /tmp or BUILD_DIR.
#
# After this script succeeds, run: npm install
# Then the native modsecurity addon should compile and the proxy will use
# the full ModSecurity engine instead of the pattern-based fallback.
#
set -e

BUILD_DIR="${1:-/tmp/modsecurity-build}"
REPO_URL="https://github.com/owasp-modsecurity/ModSecurity"
BRANCH="v3/master"

echo "[install-libmodsecurity] Build directory: $BUILD_DIR"

# Detect package manager
if command -v apt-get >/dev/null 2>&1; then
  PKG_MGR="apt"
elif command -v dnf >/dev/null 2>&1; then
  PKG_MGR="dnf"
elif command -v yum >/dev/null 2>&1; then
  PKG_MGR="yum"
else
  echo "[install-libmodsecurity] Unsupported system: need apt-get, dnf, or yum."
  exit 1
fi

# Install build dependencies
echo "[install-libmodsecurity] Installing build dependencies..."
if [ "$PKG_MGR" = "apt" ]; then
  sudo apt-get update -qq
  sudo apt-get install -y \
    git g++ apt-utils autoconf automake build-essential \
    libcurl4-openssl-dev libgeoip-dev liblmdb-dev libpcre2-dev \
    libtool libxml2-dev libyajl-dev pkg-config zlib1g-dev
elif [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
  if [ "$PKG_MGR" = "dnf" ]; then
    sudo dnf install -y 'dnf-command(config-manager)' || true
    sudo dnf install -y gcc-c++ flex bison yajl-devel curl-devel curl \
      GeoIP-devel doxygen zlib-devel libxml2-devel automake libtool \
      pcre2-devel lmdb-devel
  else
    sudo yum groupinstall -y 'Development Tools' || true
    sudo yum install -y gcc-c++ flex bison yajl-devel curl-devel curl \
      GeoIP-devel doxygen zlib-devel libxml2-devel automake libtool \
      pcre2-devel lmdb-devel
  fi
fi

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

if [ ! -d ModSecurity ]; then
  echo "[install-libmodsecurity] Cloning ModSecurity $BRANCH..."
  git clone --depth 1 -b "$BRANCH" --single-branch "$REPO_URL" ModSecurity
fi

cd ModSecurity
echo "[install-libmodsecurity] Updating submodules..."
git submodule init
git submodule update

echo "[install-libmodsecurity] Running build.sh..."
./build.sh

echo "[install-libmodsecurity] Configuring..."
# Use --prefix=/usr/local so headers go to /usr/local/include and lib to /usr/local/lib,
# which is where the modsecurity npm package (binding.gyp) looks for them.
if [ "$PKG_MGR" = "apt" ]; then
  # Ubuntu 22.10+ / Debian with PCRE2
  ./configure --prefix=/usr/local --with-pcre2
else
  ./configure --prefix=/usr/local
fi

echo "[install-libmodsecurity] Building (this may take several minutes)..."
make -j"$(nproc 2>/dev/null || echo 2)"

echo "[install-libmodsecurity] Installing to /usr/local..."
sudo make install

# Ensure the dynamic linker can find libmodsecurity at runtime
if [ -d /etc/ld.so.conf.d ]; then
  echo "[install-libmodsecurity] Updating library path..."
  echo '/usr/local/lib' | sudo tee /etc/ld.so.conf.d/modsecurity.conf >/dev/null
  sudo ldconfig
fi

echo "[install-libmodsecurity] Done. Run: npm install"
echo "[install-libmodsecurity] Then the modsecurity native addon should build successfully."
