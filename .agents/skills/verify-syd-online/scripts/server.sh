#!/bin/sh
set -eu

usage() {
  echo "usage: $0 start <run-id> [port] | doctor <run-id> | stop <run-id>" >&2
  exit 64
}

command_name=${1:-}
run_id=${2:-}
[ -n "$command_name" ] && [ -n "$run_id" ] || usage

case "$run_id" in
  *[!A-Za-z0-9._-]*|'') echo "run-id may contain only letters, numbers, dot, underscore, and hyphen" >&2; exit 64 ;;
esac

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../../../.." && pwd)
runtime_dir="/tmp/syd-online-verify-$run_id"
lock_dir="/tmp/syd-online-verify.lock"
lock_owner_file="$lock_dir/run-id"
pid_file="$runtime_dir/server.pid"
port_file="$runtime_dir/server.port"
log_file="$runtime_dir/server.log"
build_log="$runtime_dir/build.log"

read_recorded_pid() {
  [ -s "$pid_file" ] || { echo "missing PID record for run $run_id" >&2; return 1; }
  recorded_pid=$(sed -n '1p' "$pid_file")
  case "$recorded_pid" in *[!0-9]*|'') echo "invalid PID record for run $run_id" >&2; return 1 ;; esac
}

read_recorded_port() {
  [ -s "$port_file" ] || { echo "missing port record for run $run_id" >&2; return 1; }
  recorded_port=$(sed -n '1p' "$port_file")
  case "$recorded_port" in *[!0-9]*|'') echo "invalid port record for run $run_id" >&2; return 1 ;; esac
}

require_recorded_server_identity() {
  process_command=$(ps -p "$recorded_pid" -o command=)
  case "$process_command" in
    "next-server (v"*|*"node_modules/.bin/next"*"start"*) ;;
    *) echo "PID $recorded_pid is not the recorded Next.js server: $process_command" >&2; return 1 ;;
  esac
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -a -p "$recorded_pid" -iTCP:"$recorded_port" -sTCP:LISTEN >/dev/null 2>&1 || {
      echo "PID $recorded_pid does not own recorded port $recorded_port" >&2
      return 1
    }
  fi
}

require_lock_owner() {
  [ -s "$lock_owner_file" ] || { echo "verification ownership lock is missing or invalid" >&2; return 1; }
  lock_owner=$(sed -n '1p' "$lock_owner_file")
  [ "$lock_owner" = "$run_id" ] || { echo "verification lock belongs to $lock_owner, not $run_id" >&2; return 1; }
}

release_owned_lock() {
  if [ -d "$lock_dir" ] && [ -s "$lock_owner_file" ]; then
    lock_owner=$(sed -n '1p' "$lock_owner_file")
    if [ "$lock_owner" = "$run_id" ]; then
      rm "$lock_owner_file"
      rmdir "$lock_dir"
    fi
  fi
}

case "$command_name" in
  start)
    port=${3:-4173}
    case "$port" in *[!0-9]*|'') echo "port must be numeric" >&2; exit 64 ;; esac
    [ "$port" -ge 1024 ] && [ "$port" -le 65535 ] || { echo "port must be between 1024 and 65535" >&2; exit 64; }
    [ ! -e "$runtime_dir" ] || { echo "runtime already exists: $runtime_dir" >&2; exit 1; }
    if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "port $port is already owned; choose another port" >&2
      exit 1
    fi
    if ! mkdir -m 700 "$lock_dir" 2>/dev/null; then
      active_owner=$(sed -n '1p' "$lock_owner_file" 2>/dev/null || echo unknown)
      echo "verification is already owned by run $active_owner; clean it up before starting another run" >&2
      exit 1
    fi
    printf '%s\n' "$run_id" > "$lock_owner_file"
    mkdir -m 700 "$runtime_dir"
    printf '%s\n' "$port" > "$port_file"
    if ! (cd "$repo_root" && npm run build) > "$build_log" 2>&1; then
      echo "production build failed; see $build_log" >&2
      exit 1
    fi
    (
      cd "$repo_root"
      exec "$repo_root/node_modules/.bin/next" start -H 127.0.0.1 -p "$port"
    ) > "$log_file" 2>&1 &
    server_pid=$!
    printf '%s\n' "$server_pid" > "$pid_file"
    ready=0
    attempt=0
    while [ "$attempt" -lt 60 ]; do
      if ! kill -0 "$server_pid" 2>/dev/null; then
        echo "server exited before readiness; see $log_file" >&2
        exit 1
      fi
      if curl --silent --show-error --fail --max-time 2 "http://127.0.0.1:$port/" 2>/dev/null | rg -q '<title>Sydney Essex - Product Engineer</title>'; then
        ready=1
        break
      fi
      attempt=$((attempt + 1))
      sleep 0.25
    done
    [ "$ready" -eq 1 ] || { echo "server did not become ready; see $log_file" >&2; exit 1; }
    echo "READY http://127.0.0.1:$port pid=$server_pid"
    ;;
  doctor)
    read_recorded_pid
    read_recorded_port
    require_lock_owner
    kill -0 "$recorded_pid" 2>/dev/null || { echo "recorded server PID $recorded_pid is not alive" >&2; exit 1; }
    require_recorded_server_identity
    page=$(curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:$recorded_port/")
    printf '%s' "$page" | rg -q '<title>Sydney Essex - Product Engineer</title>' || { echo "unexpected app identity" >&2; exit 1; }
    python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    browser.close()
PY
    build_id=$(sed -n '1p' "$repo_root/.next/BUILD_ID")
    echo "HEALTHY http://127.0.0.1:$recorded_port pid=$recorded_pid build=$build_id"
    ;;
  stop)
    if [ ! -e "$runtime_dir" ]; then
      release_owned_lock
      echo "CLEAN no runtime for $run_id"
      exit 0
    fi
    if read_recorded_pid; then
      if kill -0 "$recorded_pid" 2>/dev/null; then
        read_recorded_port
        require_recorded_server_identity
        kill "$recorded_pid"
        attempt=0
        while kill -0 "$recorded_pid" 2>/dev/null && [ "$attempt" -lt 40 ]; do
          attempt=$((attempt + 1))
          sleep 0.1
        done
        if kill -0 "$recorded_pid" 2>/dev/null; then
          echo "server PID $recorded_pid did not stop cleanly" >&2
          exit 1
        fi
      fi
    fi
    rm -r "$runtime_dir"
    release_owned_lock
    echo "CLEAN $runtime_dir"
    ;;
  *) usage ;;
esac
