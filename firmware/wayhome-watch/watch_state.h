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
  // Web sent a check-in request (companion characteristic, 0x01). The UI
  // consumes this flag in sync() and shows the "How are you feeling?" screen.
  volatile bool checkInPending = false;
  // Screen mirror from the web app (watch_state characteristic): the web
  // watch's current screen, so the AMOLED shows the same thing.
  // 0 home, 1 check-in question, 2 help options, 3 guided route,
  // 4 emergency, 5 acknowledged, 6 other (check the app), 255 none yet.
  volatile uint8_t remoteScreen = 255;
  volatile uint8_t remotePosition = 0;
  volatile bool watchStatePending = false;

  Attachment attachment() const { return (Attachment)attachmentRaw; }
  void setAttachment(Attachment a) { attachmentRaw = (uint8_t)a; }
};

extern WatchState watch;
