#pragma once
#include <stdint.h>

// Speaker on the Waveshare ESP32-S3-Touch-AMOLED-2.06: ES8311 codec (I2C 0x18,
// I2S on GPIO16/41/45/40) + NS4150B amplifier (enable GPIO46). The board has
// no vibration motor, so the ring is sound only.
namespace audio {
// Call once in setup(), after Wire.begin(): sets up the codec while nothing
// else uses the I2C bus. Safe if the codec does not answer (logs, stays quiet).
void begin();
// Phone-style ring (two short tones every 3 s) until ringStop().
void ringStart();
void ringStop();
// Answered call: play the person's message — SD card /wayhome/calls/<name>.wav
// (jamie, sam, mei), else /call-<index>.wav on the FAT partition. 16 kHz,
// 16-bit, mono PCM WAV. Missing file = one short "answered" chime.
void playRecording(uint8_t index);
// V1 — Momo speaks: play /wayhome/voice/<name>.wav from the SD card (made by
// firmware/voice/make_voice.sh). No card or no file = silent (logged).
// A new line replaces the one playing; a ring asked for while Momo speaks
// starts right after her line.
void say(const char *name);
}  // namespace audio
