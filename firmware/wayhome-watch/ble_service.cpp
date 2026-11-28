#include "ble_service.h"
#include "watch_state.h"

#include <NimBLEDevice.h>
#include <HWCDC.h>

// Defined in wayhome-watch.ino; the same USB serial the Serial Monitor shows.
extern HWCDC USBSerial;

namespace ble {

const char *SERVICE_UUID = "5a9c1f2e-4a01-4c31-9a48-d1b7f30e6c21";
const char *CHAR_BATTERY_UUID = "5a9c1f2e-4a02-4c31-9a48-d1b7f30e6c21";
const char *CHAR_SOS_UUID = "5a9c1f2e-4a03-4c31-9a48-d1b7f30e6c21";
const char *CHAR_GPS_UUID = "5a9c1f2e-4a04-4c31-9a48-d1b7f30e6c21";
const char *CHAR_WEAR_MOTION_UUID = "5a9c1f2e-4a05-4c31-9a48-d1b7f30e6c21";
const char *CHAR_ATTACHMENT_UUID = "5a9c1f2e-4a06-4c31-9a48-d1b7f30e6c21";
const char *CHAR_COMPANION_UUID = "5a9c1f2e-4a07-4c31-9a48-d1b7f30e6c21";
const char *CHAR_WATCH_STATE_UUID = "5a9c1f2e-4a08-4c31-9a48-d1b7f30e6c21";

namespace {

NimBLECharacteristic *chrBattery = nullptr;
NimBLECharacteristic *chrSos = nullptr;
NimBLECharacteristic *chrGps = nullptr;
NimBLECharacteristic *chrWearMotion = nullptr;
NimBLECharacteristic *chrAttachment = nullptr;
NimBLECharacteristic *chrCompanion = nullptr;
NimBLECharacteristic *chrWatchState = nullptr;

// Set from NimBLE host-task callbacks; handled in loopTick().
volatile bool snapshotPending = false;

uint8_t wearMotionByte() { return (uint8_t)watch.wearMotion; }

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *server, NimBLEConnInfo &connInfo) override {
    watch.bleConnected = true;
    USBSerial.println("[BLE] connected to the WayHome web app");
    // The web store resets wear observations on reconnect: re-push everything.
    snapshotPending = true;
  }

  void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connInfo, int reason) override {
    watch.bleConnected = false;
    USBSerial.printf("[BLE] disconnected (reason %d), advertising again\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

class GpsCallbacks : public NimBLECharacteristicCallbacks {
  // "Move one step" on the web writes a new route step back to the watch.
  void onWrite(NimBLECharacteristic *chr, NimBLEConnInfo &connInfo) override {
    NimBLEAttValue value = chr->getValue();
    if (value.size() >= 1) {
      uint8_t step = value[0];
      if (step > 6) step = 6;
      watch.gpsProgress = step;
    }
  }
};

class AttachmentCallbacks : public NimBLECharacteristicCallbacks {
  // The caregiver side can change how the device is worn.
  void onWrite(NimBLECharacteristic *chr, NimBLEConnInfo &connInfo) override {
    NimBLEAttValue value = chr->getValue();
    String text((const char *)value.data(), value.size());
    text.trim();
    if (text == "pendant") {
      watch.setAttachment(Attachment::Pendant);
    } else if (text == "clip") {
      watch.setAttachment(Attachment::Clip);
    } else if (text == "wristwatch") {
      watch.setAttachment(Attachment::Wristwatch);
    }
  }
};

class CompanionCallbacks : public NimBLECharacteristicCallbacks {
  // Web → device commands: 0x01 = show the check-in question.
  void onWrite(NimBLECharacteristic *chr, NimBLEConnInfo &connInfo) override {
    NimBLEAttValue value = chr->getValue();
    if (value.size() >= 1 && value[0] == 0x01) {
      USBSerial.println("[BLE] web -> watch: show check-in");
      watch.checkInPending = true;
    }
  }
};

class WatchStateCallbacks : public NimBLECharacteristicCallbacks {
  // Web → device screen mirror: byte0 = screen code, byte1 = route position,
  // byte2 = current landmark stop, bytes 3+ = "Wearer|Companion" names.
  // Older web payloads had names at byte2; those remain readable.
  void onWrite(NimBLECharacteristic *chr, NimBLEConnInfo &connInfo) override {
    NimBLEAttValue value = chr->getValue();
    if (value.size() >= 1) {
      USBSerial.printf("[BLE] web -> watch: screen %u, step %u, stop %u\n",
                       (unsigned)value[0],
                       value.size() >= 2 ? (unsigned)value[1] : 0u,
                       value.size() >= 3 ? (unsigned)value[2] : 0u);
      // byte0 bit 7 = wearer outside the safe zone (Talk asks to guide home).
      watch.remoteScreen = value[0] & 0x7F;
      watch.outsideZone = (value[0] & 0x80) != 0;
      if (value.size() >= 2 && value[1] <= 6) {
        watch.remotePosition = value[1];
      }
      if (value.size() >= 3) {
        // Low 4 bits = landmark stop, bits 4–5 = turn (see src/services/ble.ts).
        uint8_t stop = value[2] & 0x0f;
        watch.remoteLandmark = stop < BUILTIN_LANDMARK_COUNT ? stop : UINT8_MAX;
        watch.remoteTurn = (value[2] >> 4) & 0x03;
        watch.remoteContact = (value[2] >> 6) & 0x03;
      }
      size_t nameOffset = value.size() >= 3 ? 3 : 2;
      if (value.size() > nameOffset) {
        // "Wearer|Companion" (or just "Wearer" from older web).
        const uint8_t *text = value.data() + nameOffset;
        size_t len = value.size() - nameOffset;
        size_t bar = len;
        for (size_t i = 0; i < len; i++) {
          if (text[i] == '|') { bar = i; break; }
        }
        size_t n = bar;
        if (n > sizeof(watch.wearerName) - 1) n = sizeof(watch.wearerName) - 1;
        memcpy(watch.wearerName, text, n);
        watch.wearerName[n] = '\0';
        size_t c = bar < len ? len - bar - 1 : 0;
        if (c > sizeof(watch.companionName) - 1) c = sizeof(watch.companionName) - 1;
        if (c) memcpy(watch.companionName, text + bar + 1, c);
        watch.companionName[c] = '\0';
        watch.wearerNameDirty = true;
      }
      watch.watchStatePending = true;
    }
  }
};

}  // namespace

bool begin() {
  NimBLEDevice::init("Sprout Watch");
  NimBLEDevice::setDeviceName("Sprout Watch");

  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService *service = server->createService(SERVICE_UUID);

  chrBattery = service->createCharacteristic(
      CHAR_BATTERY_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  chrSos = service->createCharacteristic(
      CHAR_SOS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  chrGps = service->createCharacteristic(
      CHAR_GPS_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
  chrWearMotion = service->createCharacteristic(
      CHAR_WEAR_MOTION_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  chrAttachment = service->createCharacteristic(
      CHAR_ATTACHMENT_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
  chrCompanion = service->createCharacteristic(
      CHAR_COMPANION_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
  chrWatchState = service->createCharacteristic(
      CHAR_WATCH_STATE_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);

  chrGps->setCallbacks(new GpsCallbacks());
  chrAttachment->setCallbacks(new AttachmentCallbacks());
  chrCompanion->setCallbacks(new CompanionCallbacks());
  chrWatchState->setCallbacks(new WatchStateCallbacks());

  // Initial values (also served on read before the first notify).
  uint8_t battery = watch.batteryValid ? watch.batteryPercent : UINT8_MAX;
  chrBattery->setValue(&battery, 1);
  uint8_t gps = watch.gpsProgress;
  chrGps->setValue(&gps, 1);
  uint8_t wear = wearMotionByte();
  chrWearMotion->setValue(&wear, 1);
  chrAttachment->setValue(attachmentName(watch.attachment()));

  service->start();

  NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  // The name travels in the scan response, so Chrome's picker shows
  // "Sprout Watch" and the web's name filter also matches.
  advertising->enableScanResponse(true);
  advertising->setName("Sprout Watch");
  NimBLEDevice::startAdvertising();
  USBSerial.println("[BLE] advertising as \"Sprout Watch\"");

  return true;
}

void publishBattery() {
  if (chrBattery == nullptr || !watch.bleConnected) return;
  uint8_t battery = watch.batteryValid ? watch.batteryPercent : UINT8_MAX;
  chrBattery->setValue(&battery, 1);
  chrBattery->notify();
}

void publishGps() {
  if (chrGps == nullptr) return;
  uint8_t gps = watch.gpsProgress;
  chrGps->setValue(&gps, 1);
  if (watch.bleConnected) chrGps->notify();
}

void syncGpsValue() {
  if (chrGps == nullptr) return;
  uint8_t gps = watch.gpsProgress;
  chrGps->setValue(&gps, 1);
}

void publishWearMotion() {
  if (chrWearMotion == nullptr) return;
  uint8_t wear = wearMotionByte();
  chrWearMotion->setValue(&wear, 1);
  if (watch.bleConnected) chrWearMotion->notify();
}

void publishAttachment() {
  if (chrAttachment == nullptr) return;
  chrAttachment->setValue(attachmentName(watch.attachment()));
  if (watch.bleConnected) chrAttachment->notify();
}

void publishSos() {
  if (chrSos == nullptr || !watch.bleConnected) return;
  uint8_t trigger = 1;
  chrSos->setValue(&trigger, 1);
  chrSos->notify();
}

void publishCheckIn(uint8_t code, uint8_t arg) {
  if (chrCompanion == nullptr || !watch.bleConnected) {
    USBSerial.printf("[BLE] not connected: command 0x%02x not sent\n", code);
    return;
  }
  USBSerial.printf("[BLE] watch -> web: command 0x%02x %u\n", code, arg);
  uint8_t payload[2] = {code, arg};
  chrCompanion->setValue(payload, 2);
  chrCompanion->notify();
}

void requestSnapshot() { snapshotPending = true; }

void loopTick() {
  // Deferred snapshot push: notifying from onConnect() can race with the
  // client still enabling notifications, so wait for the loop to settle.
  static uint32_t snapshotRequestedAt = 0;
  if (snapshotPending) {
    if (snapshotRequestedAt == 0) {
      snapshotRequestedAt = millis();
    } else if (millis() - snapshotRequestedAt > 300) {
      snapshotPending = false;
      snapshotRequestedAt = 0;
      publishBattery();
      publishGps();
      publishWearMotion();
      publishAttachment();
    }
  }
}

}  // namespace ble
