#include "ble_service.h"
#include "watch_state.h"

#include <NimBLEDevice.h>

namespace ble {

const char *SERVICE_UUID = "5a9c1f2e-4a01-4c31-9a48-d1b7f30e6c21";
const char *CHAR_BATTERY_UUID = "5a9c1f2e-4a02-4c31-9a48-d1b7f30e6c21";
const char *CHAR_SOS_UUID = "5a9c1f2e-4a03-4c31-9a48-d1b7f30e6c21";
const char *CHAR_GPS_UUID = "5a9c1f2e-4a04-4c31-9a48-d1b7f30e6c21";
const char *CHAR_WEAR_MOTION_UUID = "5a9c1f2e-4a05-4c31-9a48-d1b7f30e6c21";
const char *CHAR_ATTACHMENT_UUID = "5a9c1f2e-4a06-4c31-9a48-d1b7f30e6c21";

namespace {

NimBLECharacteristic *chrBattery = nullptr;
NimBLECharacteristic *chrSos = nullptr;
NimBLECharacteristic *chrGps = nullptr;
NimBLECharacteristic *chrWearMotion = nullptr;
NimBLECharacteristic *chrAttachment = nullptr;

// Set from NimBLE host-task callbacks; handled in loopTick().
volatile bool snapshotPending = false;

uint8_t wearMotionByte() { return (uint8_t)watch.wearMotion; }

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *server, NimBLEConnInfo &connInfo) override {
    watch.bleConnected = true;
    // The web store resets wear observations on reconnect: re-push everything.
    snapshotPending = true;
  }

  void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connInfo, int reason) override {
    watch.bleConnected = false;
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

  chrGps->setCallbacks(new GpsCallbacks());
  chrAttachment->setCallbacks(new AttachmentCallbacks());

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
  advertising->enableScanResponse(true);
  NimBLEDevice::startAdvertising();

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
