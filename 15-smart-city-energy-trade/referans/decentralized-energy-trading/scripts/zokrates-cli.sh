#!/bin/bash
# Wrapper so `zokrates` works on Apple Silicon (0.6.4 is x86_64 only).
set -e

ZOKRATES_BIN="${ZOKRATES_BIN:-${HOME}/.zokrates-0.6.4/bin/zokrates}"
export ZOKRATES_STDLIB="${ZOKRATES_STDLIB:-${HOME}/.zokrates-0.6.4/bin/stdlib}"

if [[ ! -x "${ZOKRATES_BIN}" ]]; then
  echo "ZoKrates 0.6.4 not found at ${ZOKRATES_BIN}" >&2
  echo "Run: ./scripts/install_zokrates.sh" >&2
  exit 127
fi

if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  exec arch -x86_64 "${ZOKRATES_BIN}" "$@"
fi

exec "${ZOKRATES_BIN}" "$@"
