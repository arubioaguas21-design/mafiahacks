#!/usr/bin/env bash
# Renderiza las dos versiones y deja el audio a -14 LUFS.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders
node generar.mjs
npx hyperframes check
npx hyperframes render -o renders/con-subs.mp4
node generar.mjs --sin-subtitulos
npx hyperframes render -o renders/sin-subs.mp4
node generar.mjs   # deja la composición con subtítulos para el preview
for v in con-subs:video-FINAL sin-subs:video-SIN-SUBTITULOS; do
  src="renders/${v%%:*}.mp4"; dst="${v##*:}.mp4"
  # pasada 1: medir; pasada 2: normalizar a -14 LUFS / -1 dBTP
  m=$(ffmpeg -hide_banner -i "$src" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  get() { echo "$m" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -y -hide_banner -loglevel error -i "$src" -c:v copy \
    -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
    -ar 48000 -c:a aac -b:a 192k "$dst"
  echo "$dst listo"
done
