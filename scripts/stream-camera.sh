#!/usr/bin/env bash
#
# Republish a local RTSP camera into the Railway MediaMTX service so the YOLO
# detector can pull it.
#
#   ./scripts/stream-camera.sh                      # use the defaults below
#   ./scripts/stream-camera.sh rtsp://10.0.0.50/stream
#   CAMERA_PATH=<other-camera> ./scripts/stream-camera.sh
#
# Ctrl-C to stop (twice — once for ffmpeg, once for the loop).
#
# Why a script and not a pasted one-liner: a backslash continuation with a trailing
# space makes zsh read `\ ` as an escaped space, so ffmpeg gets " " as its output
# filename and the rest of the command runs as separate garbage. That has cost real
# time. Here the ffmpeg invocation is one line and can't be mangled by a copy-paste.

set -u

# ── Config ────────────────────────────────────────────────────────────────────
SOURCE="${1:-${SOURCE:-rtsp://10.0.0.244/stream}}"

# The path segment MUST be the camera's mediamtxPath or its database id.
# /api/cameras/stream-event matches $MTX_PATH against mediamtxPath OR id — get it
# wrong and the stream publishes fine but the app never links it to a camera, so it
# sits "offline" in the dashboard with no error logged anywhere.
CAMERA_PATH="${CAMERA_PATH:-cmpp0jiuu0001qm0cbvaei1y9}"

# Railway's TCP proxy, NOT the mediamtx-production-….up.railway.app HTTP domain.
# Railway → mediamtx → Settings → Networking if this ever changes.
MTX_HOST="${MTX_HOST:-zephyr.proxy.rlwy.net}"
MTX_PORT="${MTX_PORT:-46299}"

# From authInternalUsers in docker/mediamtx/mediamtx.yml.
MTX_USER="${MTX_USER:-admin}"
MTX_PASS="${MTX_PASS:-nexxau}"

# -c:v copy avoids re-encoding, which is why this runs fine on a laptop — but it
# needs the source to already be H.264. Set REENCODE=1 for a source that isn't.
REENCODE="${REENCODE:-0}"

RETRY_SECONDS="${RETRY_SECONDS:-3}"

DEST="rtsp://${MTX_USER}:${MTX_PASS}@${MTX_HOST}:${MTX_PORT}/${CAMERA_PATH}"

# ── Preflight ─────────────────────────────────────────────────────────────────
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found — brew install ffmpeg"; exit 1; }

# Check the SOURCE is actually listening before handing ffmpeg a target it can't
# reach. "Connection refused" buried in ffmpeg's banner spam is how an hour
# disappears; most often the phone's RTSP app simply isn't in the foreground.
src_host_port="${SOURCE#*://}"          # strip scheme
src_host_port="${src_host_port%%/*}"    # strip path
src_host="${src_host_port%%:*}"
src_port="${src_host_port##*:}"
[ "$src_port" = "$src_host" ] && src_port=554

echo "source : $SOURCE"
echo "dest   : rtsp://${MTX_USER}:***@${MTX_HOST}:${MTX_PORT}/${CAMERA_PATH}"
echo

if command -v nc >/dev/null 2>&1; then
  if ! nc -z -G 2 "$src_host" "$src_port" >/dev/null 2>&1; then
    echo "⚠  Nothing is listening on ${src_host}:${src_port}."
    echo
    echo "   If the camera is a phone: open the RTSP app and leave it in the"
    echo "   FOREGROUND. iOS suspends the app the moment the screen locks, which"
    echo "   kills the stream mid-session. Settings → Display & Brightness →"
    echo "   Auto-Lock → Never, and keep it charging."
    echo
    echo "   If the IP moved, pass the new one:  $0 rtsp://<new-ip>/stream"
    echo "   (Private Wi-Fi Address randomises the MAC, so the DHCP lease drifts —"
    echo "    turn it off for this network and give it a reservation.)"
    echo
    echo "   Continuing anyway — the loop will retry every ${RETRY_SECONDS}s."
    echo
  else
    echo "✓ source is reachable"
    echo
  fi
fi

# ── Stream ────────────────────────────────────────────────────────────────────
if [ "$REENCODE" = "1" ]; then
  VIDEO_ARGS=(-c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p)
  echo "re-encoding to H.264 (REENCODE=1)"
else
  VIDEO_ARGS=(-c:v copy)
fi

trap 'echo; echo "stopped."; exit 0' INT

while true; do
  ffmpeg -hide_banner -loglevel warning \
    -fflags +nobuffer -flags low_delay \
    -rtsp_transport tcp \
    -use_wallclock_as_timestamps 1 \
    -i "$SOURCE" \
    "${VIDEO_ARGS[@]}" -an \
    -f rtsp -rtsp_transport tcp \
    "$DEST"

  echo "stream dropped — reconnecting in ${RETRY_SECONDS}s (Ctrl-C to stop)"
  sleep "$RETRY_SECONDS"
done
