#!/bin/bash
set -e

INSTALL_DIR="${HOME}/.zokrates-0.6.4/bin"
VERSION="0.6.4"
ARCH="$(uname -m)"

case "$(uname -s)-${ARCH}" in
  Darwin-arm64) TARBALL="zokrates-${VERSION}-x86_64-apple-darwin.tar.gz" ;;
  Darwin-x86_64) TARBALL="zokrates-${VERSION}-x86_64-apple-darwin.tar.gz" ;;
  Linux-x86_64) TARBALL="zokrates-${VERSION}-x86_64-unknown-linux-gnu.tar.gz" ;;
  Linux-aarch64|Linux-arm64)
    TARBALL="zokrates-${VERSION}-aarch64-unknown-linux-gnu.tar.gz"
    ;;
  *)
    echo "Unsupported platform: $(uname -s) ${ARCH}" >&2
    exit 1
    ;;
esac

URL="https://github.com/Zokrates/ZoKrates/releases/download/${VERSION}/${TARBALL}"

mkdir -p "${INSTALL_DIR}"
echo "Downloading ZoKrates ${VERSION}..."
curl -sL "${URL}" | tar -xz -C "${INSTALL_DIR}"
chmod +x "${INSTALL_DIR}/zokrates"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ln -sf "${PROJECT_ROOT}/scripts/zokrates-cli.sh" "${HOME}/.zokrates-0.6.4/bin/zokrates-wrapper"
echo "Installed: ${INSTALL_DIR}/zokrates"
echo "Add to ~/.zshrc:"
echo "  export PATH=\"${PROJECT_ROOT}/scripts:\$PATH\""
echo "  alias zokrates='${PROJECT_ROOT}/scripts/zokrates-cli.sh'"
