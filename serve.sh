#!/usr/bin/env sh
set -eu
python scripts/build_data.py
printf '%s\n' 'Open http://localhost:8000'
python -m http.server 8000
