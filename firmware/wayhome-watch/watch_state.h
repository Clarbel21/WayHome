#pragma once
#include <Arduino.h>

// Wear motion input measured on-device from the QMI8658 IMU.
// Encoded on BLE as: 0 = unknown, 1 = yes, 2 = no.
enum class WearMotion : uint8_t { Unknown = 0, Yes = 1, No = 2 };

// Attachment kinds, indexed to match the WayHome web app strings.
enum class Attachment : uint8_t { Wristwatch = 0, Pendant = 1, Clip = 2 };

inline const char *attachmentName(Attachment a) {
  switch (a) {
    case Attachment::Pendant: return "pendant";
    case Attachment::Clip: return "clip";
    default: return "wristwatch";
  }
}

// Shared watch state: written by the sensors and BLE callbacks, read by the UI.
// Fields touched from NimBLE callbacks are volatile; UI refreshes happen in loop().
struct WatchState {
  uint8_t batteryPercent = 0;       // 0-100 from AXP2101
  bool batteryValid = false;        // false when no battery detected
  bool charging = false;
  volatile uint8_t gpsProgress = 0; // route step index 0-6 (simulated GPS)
  WearMotion wearMotion = WearMotion::Unknown;
  volatile uint8_t attachmentRaw = 0;  // Attachment as uint8_t
  volatile bool bleConnected = false;
  volatile bool sosActive = false;

  Attachment attachment() const { return (Attachment)attachmentRaw; }
  void setAttachment(Attachment a) { attachmentRaw = (uint8_t)a; }
};

extern WatchState watch;
