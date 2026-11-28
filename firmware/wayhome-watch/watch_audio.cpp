#include "watch_audio.h"

#include <Arduino.h>
#include <ESP_I2S.h>
#include <FFat.h>
#include <HWCDC.h>
#include <Wire.h>
#include <math.h>

extern HWCDC USBSerial;

namespace {

constexpr uint8_t ES8311_ADDR = 0x18;
constexpr int PIN_MCLK = 16, PIN_BCLK = 41, PIN_WS = 45, PIN_DOUT = 40;
constexpr int PIN_PA = 46;
constexpr uint32_t RATE = 16000;

I2SClass i2s;
bool ready = false;
bool fsReady = false;

enum class Job : uint8_t { Idle, Ring, Recording };
volatile Job job = Job::Idle;
volatile uint8_t recordingIndex = 0;
TaskHandle_t task = nullptr;

bool codecWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(ES8311_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

// Minimal ES8311 playback setup: slave mode, MCLK from pin (256 x 16 kHz),
// 16-bit I2S in, DAC to the speaker output. Values follow Espressif's
// es8311 driver for 4.096 MHz MCLK / 16 kHz.
bool codecInit() {
  if (!codecWrite(0x00, 0x1F)) return false;  // reset
  delay(20);
  const uint8_t seq[][2] = {
      {0x00, 0x00}, {0x00, 0x80},               // power on, slave
      {0x01, 0x3F},                             // MCLK from pin, clocks on
      {0x02, 0x00}, {0x05, 0x00},               // pre-div 1, x1; adc/dac div 1
      {0x03, 0x10}, {0x04, 0x10},               // ADC / DAC oversampling
      {0x07, 0x00}, {0x08, 0xFF},               // LRCK divider
      {0x06, 0x03},                             // BCLK divider
      {0x09, 0x0C}, {0x0A, 0x0C},               // 16-bit I2S in / out
      {0x0B, 0x00}, {0x0C, 0x00},
      {0x10, 0x1F}, {0x11, 0x7F},
      {0x0D, 0x01},                             // analog power up
      {0x0E, 0x02},
      {0x12, 0x00},                             // DAC power up
      {0x13, 0x10},                             // speaker / HP drive on
      {0x1C, 0x6A}, {0x37, 0x08},               // bypass EQ
      {0x32, 0xBF},                             // DAC volume 0 dB
      {0x31, 0x00},                             // unmute
      {0x45, 0x00},
  };
  for (auto &r : seq)
    if (!codecWrite(r[0], r[1])) return false;
  return true;
}

void writeSilence(int ms) {
  static int16_t zero[64] = {0};
  int frames = RATE * ms / 1000;
  while (frames > 0 && job != Job::Idle) {
    int n = frames > 32 ? 32 : frames;
    i2s.write((uint8_t *)zero, n * 4);
    frames -= n;
  }
}

// Two-frequency tone (like a phone ring), stereo frames, stops early if the
// job changes.
void writeTone(float f1, float f2, int ms, int16_t amp) {
  int16_t buf[64];
  int frames = RATE * ms / 1000;
  static uint32_t n = 0;
  while (frames > 0 && job == Job::Ring) {
    int k = frames > 32 ? 32 : frames;
    for (int i = 0; i < k; i++, n++) {
      float t = (float)n / RATE;
      int16_t v = (int16_t)(amp * 0.5f *
                            (sinf(2 * PI * f1 * t) + sinf(2 * PI * f2 * t)));
      buf[2 * i] = v;
      buf[2 * i + 1] = v;
    }
    i2s.write((uint8_t *)buf, k * 4);
    frames -= k;
  }
}

void chime() {
  Job prev = job;
  job = Job::Ring;  // let writeTone run
  writeTone(660, 660, 150, 6000);
  writeTone(880, 880, 200, 6000);
  job = prev;
}

void playFile(uint8_t index) {
  char path[20];
  snprintf(path, sizeof(path), "/call-%u.wav", (unsigned)index);
  File f = fsReady ? FFat.open(path) : File();
  if (!f) {
    USBSerial.printf("[AUDIO] %s not found - short chime instead\n", path);
    chime();
    return;
  }
  USBSerial.printf("[AUDIO] playing %s\n", path);
  f.seek(44);  // plain PCM WAV header
  int16_t mono[128];
  int16_t stereo[256];
  while (job == Job::Recording && f.available()) {
    int got = f.read((uint8_t *)mono, sizeof(mono)) / 2;
    for (int i = 0; i < got; i++) stereo[2 * i] = stereo[2 * i + 1] = mono[i];
    i2s.write((uint8_t *)stereo, got * 4);
  }
  f.close();
}

void audioTask(void *) {
  for (;;) {
    Job j = job;
    if (j == Job::Idle) {
      digitalWrite(PIN_PA, LOW);
      vTaskDelay(pdMS_TO_TICKS(30));
      continue;
    }
    digitalWrite(PIN_PA, HIGH);
    if (j == Job::Ring) {
      writeTone(400, 450, 400, 8000);
      writeSilence(200);
      writeTone(400, 450, 400, 8000);
      writeSilence(2000);
    } else {
      playFile(recordingIndex);
      if (job == Job::Recording) job = Job::Idle;
    }
  }
}

}  // namespace

namespace audio {

void begin() {
  pinMode(PIN_PA, OUTPUT);
  digitalWrite(PIN_PA, LOW);
  if (!codecInit()) {
    USBSerial.println("[AUDIO] ES8311 did not answer - no sound");
    return;
  }
  i2s.setPins(PIN_BCLK, PIN_WS, PIN_DOUT, -1, PIN_MCLK);
  if (!i2s.begin(I2S_MODE_STD, RATE, I2S_DATA_BIT_WIDTH_16BIT,
                 I2S_SLOT_MODE_STEREO)) {
    USBSerial.println("[AUDIO] I2S start failed - no sound");
    return;
  }
  fsReady = FFat.begin(false);
  USBSerial.printf("[AUDIO] ready (recordings %s)\n",
                   fsReady ? "partition found" : "partition empty");
  ready = true;
  xTaskCreatePinnedToCore(audioTask, "audio", 4096, nullptr, 1, &task, 0);
}

void ringStart() {
  if (!ready || job == Job::Ring) return;
  USBSerial.println("[AUDIO] ring");
  job = Job::Ring;
}

void ringStop() {
  if (job == Job::Ring) job = Job::Idle;
}

void playRecording(uint8_t index) {
  if (!ready) return;
  recordingIndex = index;
  job = Job::Recording;
}

}  // namespace audio
