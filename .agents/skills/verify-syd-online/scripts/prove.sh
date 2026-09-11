#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../../../.." && pwd)
run_id=${1:-}
port=${2:-4173}
[ -n "$run_id" ] || { echo "usage: $0 <run-id> [port] [evidence-dir]" >&2; exit 64; }
evidence_dir=${3:-"$repo_root/.verification/evidence/$run_id"}

cleanup() {
  "$script_dir/server.sh" stop "$run_id"
}
"$script_dir/server.sh" start "$run_id" "$port"
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$script_dir/server.sh" doctor "$run_id"
python3 "$script_dir/verify.py" \
  --url "http://127.0.0.1:$port" \
  --evidence-dir "$evidence_dir"

python3 "$script_dir/editorial.py" \
  --url "http://127.0.0.1:$port" \
  --evidence-dir "$evidence_dir/editorial"

python3 "$script_dir/pixel_wishes.py" \
  --url "http://127.0.0.1:$port" \
  --evidence-dir "$evidence_dir/pixel-wishes"

"$script_dir/server.sh" stop "$run_id"
trap - EXIT INT TERM

test -s "$evidence_dir/report.json"
test -s "$evidence_dir/browser_walkthrough.webm"
test -s "$evidence_dir/editorial/report.json"
test -s "$evidence_dir/pixel-wishes/report.json"
test -s "$evidence_dir/pixel-wishes/pixel_wishes_walkthrough.webm"
echo "PROVED $evidence_dir"
