#pragma once
#include <Arduino.h>

// WayHome GATT server (NimBLE-Arduino v2).
// The UUIDs and payload formats mirror src/services/ble.ts in the web app.
// Characteristic payloads are <= 20 bytes so they work at the default ATT MTU.
namespace ble {

// 128-bit UUIDs, shared with the WayHome web app.
extern const char *SERVICE_UUID;
extern const char *CHAR_BATTERY_UUID;
extern const char *CHAR_SOS_UUID;
extern const char *CHAR_GPS_UUID;
extern const char *CHAR_WEAR_MOTION_UUID;
extern const char *CHAR_ATTACHMENT_UUID;

// Initialize NimBLE, build the service and start advertising as "Sprout Watch".
bool begin();

// Push the current watch state to any connected subscriber.
void publishBattery();
void publishGps();
void publishWearMotion();
void publishAttachment();
void publishSos();

// Ask for a full snapshot re-push (used right after a client connects,
// because the web store resets wear observations on reconnect).
void requestSnapshot();

// Deferred work for the main loop (snapshot push after connect settles).
void loopTick();

}  // namespace ble
