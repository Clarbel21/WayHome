#!/usr/bin/env bash
# Make Momo's voice clips for the ESP32 SD card (TEAM_PLAN V1).
#   pip install piper-tts ; get a Piper voice (.onnx + .onnx.json)
#   firmware/voice/make_voice.sh path/to/voice.onnx out/
# Writes out/wayhome/voice/*.wav and out/wayhome/calls/*.wav:
# 16 kHz, 16-bit, mono PCM WAV (what watch_audio.cpp plays).
# calls/*.wav are placeholders until the family records real messages.
set -euo pipefail
model="$1"; out="$2"
here="$(cd "$(dirname "$0")" && pwd)"
while IFS=$'\t' read -r name text; do
  [ -z "$name" ] && continue
  mkdir -p "$out/wayhome/$(dirname "$name")"
  echo "$text" | python3 -m piper -m "$model" -f "$out/tmp.wav" >/dev/null 2>&1
  ffmpeg -nostdin -loglevel error -y -i "$out/tmp.wav" -ar 16000 -ac 1 -c:a pcm_s16le \
    -fflags +bitexact -map_metadata -1 "$out/wayhome/$name.wav"
  echo "$name.wav"
done < "$here/lines.tsv"
rm -f "$out/tmp.wav"
