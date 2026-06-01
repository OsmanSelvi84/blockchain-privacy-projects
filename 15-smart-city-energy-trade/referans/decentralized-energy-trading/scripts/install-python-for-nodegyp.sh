#!/bin/bash
# Node 10's node-gyp needs Python <= 3.10 (3.11+ removes 'rU' mode → ValueError).
set -e

pick_python() {
  for py in python3.10 python3.9 python3.8; do
    if command -v "$py" >/dev/null 2>&1; then
      echo "$(command -v "$py")"
      return 0
    fi
  done
  return 1
}

if PY=$(pick_python); then
  echo "Using $PY"
  npm config set python "$PY"
  exit 0
fi

echo "Python 3.10 not found. Installing via deadsnakes PPA (Ubuntu)..."
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.10 python3.10-dev python3.10-venv

npm config set python /usr/bin/python3.10
echo "OK: npm python -> /usr/bin/python3.10"
python3.10 --version
