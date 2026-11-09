import { type DeviceEvent, type DeviceService, applyDeviceEvent } from "./device";
import { type Attachment, type Observation, type WearInputs } from "./safety";
import { useStore } from "../store";

/**
 * ESP32-S3 BLE adapter for the WayHome "Sprout" watch
 * (firmware/wayhome-watch). Implements the same `DeviceService` contract as
 * the simulated adapter and feeds events through `applyDeviceEvent`, so the
 * store and cross-tab sync behave identically.
 *
 * Pairing uses Web Bluetooth (Chrome/Edge/Android over HTTPS or localhost;
 * not iOS Safari). Everything the watch reports is part of the educational
 * simulation — the board has no GNSS and dispatches nothing.
 */

// GATT layout mirrored from firmware/wayhome-watch/ble_service.cpp.
export const WAYHOME_SERVICE_UUID = "5a9c1f2e-4a01-4c31-9a48-d1b7f30e6c21";
const BATTERY_UUID = "5a9c1f2e-4a02-4c31-9a48-d1b7f30e6c21";
const SOS_UUID = "5a9c1f2e-4a03-4c31-9a48-d1b7f30e6c21";
const GPS_UUID = "5a9c1f2e-4a04-4c31-9a48-d1b7f30e6c21";
const WEAR_MOTION_UUID = "5a9c1f2e-4a05-4c31-9a48-d1b7f30e6c21";
const ATTACHMENT_UUID = "5a9c1f2e-4a06-4c31-9a48-d1b7f30e6c21";
const COMPANION_UUID = "5a9c1f2e-4a07-4c31-9a48-d1b7f30e6c21";

const ATTACHMENTS: readonly Attachment[] = ["wristwatch", "pendant", "clip"];

// Companion-command codes (mirrors firmware ble_service.publishCheckIn docs).
const CMD_CHECKIN_REQUEST = 0x01; // web → watch: show "How are you feeling?"
const CMD_ANSWER_OKAY = 0x02; // watch → web
const CMD_ANSWER_HELP = 0x03; // watch → web
const CMD_ASSISTANCE = 0x04; // watch → web, byte1: 0 home, 1 family, 2 confused
const CMD_BACK_TO_QUESTION = 0x05; // watch → web
const ASSISTANCE_CHOICES = ["home", "family", "confused"] as const;

// --- Pure payload → event mappers (exported for tests) ---

/** uint8 percent; 0xFF (or anything > 100) means "no battery" — keep last known. */
export function batteryEvent(value: DataView): DeviceEvent | null {
  if (value.byteLength < 1) return null;
  const percent = value.getUint8(0);
  if (percent > 100) return null;
  return { type: "battery", percent };
}

/** uint8 route step 0–6 (simulated GPS progress), clamped defensively. */
export function gpsEvent(value: DataView): DeviceEvent | null {
  if (value.byteLength < 1) return null;
  return { type: "gps", progress: Math.max(0, Math.min(6, value.getUint8(0))) };
}

/**
 * uint8 motion input: 0 unknown, 1 yes, 2 no. The watch only measures motion;
 * the other wear inputs keep whatever was last observed in the store.
 */
export function wearEvent(value: DataView): DeviceEvent | null {
  if (value.byteLength < 1) return null;
  const raw = value.getUint8(0);
  const motion: Observation = raw === 1 ? "yes" : raw === 2 ? "no" : "unknown";
  const inputs: WearInputs = { ...useStore.getState().wearInputs, motion };
  return { type: "wear", inputs };
}

/** ASCII attachment kind; unknown strings are ignored. */
export function attachmentEvent(value: DataView): DeviceEvent | null {
  const text = new TextDecoder().decode(value).trim();
  const attachment = ATTACHMENTS.find((a) => a === text);
  return attachment ? { type: "attachment", attachment } : null;
}

/**
 * Companion-command payload from the watch: byte0 picks the message.
 * 0x02 okay, 0x03 help, 0x04 assistance (byte1), 0x05 back to question.
 */
export function companionEvent(value: DataView): DeviceEvent | null {
  if (value.byteLength < 1) return null;
  switch (value.getUint8(0)) {
    case CMD_ANSWER_OKAY:
      return { type: "checkin_answer", answer: "okay" };
    case CMD_ANSWER_HELP:
      return { type: "checkin_answer", answer: "help" };
    case CMD_ASSISTANCE: {
      if (value.byteLength < 2) return null;
      const choice = ASSISTANCE_CHOICES[value.getUint8(1)];
      return choice ? { type: "assistance", choice } : null;
    }
    case CMD_BACK_TO_QUESTION:
      return { type: "checkin_back" };
    default:
      return null;
  }
}

// --- Adapter ---

export class BleDevice implements DeviceService {
  readonly mode = "ble" as const;
  private listeners = new Set<(e: DeviceEvent) => void>();
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private notifyTargets: BluetoothRemoteGATTCharacteristic[] = [];

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is unavailable — use Chrome or Edge (desktop or Android).",
      );
    }
    // Must be called from a user gesture.
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [WAYHOME_SERVICE_UUID] }],
    });
    device.addEventListener("gattserverdisconnected", () => this.handleDisconnect());
    this.device = device;

    const server = await device.gatt!.connect();
    this.server = server;
    const service = await server.getPrimaryService(WAYHOME_SERVICE_UUID);
    const [battery, sos, gps, wear, attachment, companion] = await Promise.all([
      service.getCharacteristic(BATTERY_UUID),
      service.getCharacteristic(SOS_UUID),
      service.getCharacteristic(GPS_UUID),
      service.getCharacteristic(WEAR_MOTION_UUID),
      service.getCharacteristic(ATTACHMENT_UUID),
      service.getCharacteristic(COMPANION_UUID),
    ]);

    // The watch pushes a snapshot right after connect, so subscribing must
    // complete before we consider ourselves connected — otherwise the
    // snapshot notifications could beat our subscriptions.
    await Promise.all([
      this.subscribeTo(battery, batteryEvent),
      this.subscribeTo(sos, () => ({ type: "sos" })),
      this.subscribeTo(gps, gpsEvent),
      this.subscribeTo(wear, wearEvent),
      this.subscribeTo(attachment, attachmentEvent),
      this.subscribeTo(companion, companionEvent),
    ]);

    // Mirror of the watch's snapshot push: if a check-in is already waiting,
    // re-send it so the freshly connected watch shows the question too.
    const s = useStore.getState();
    if (s.mode === "CHECK_IN" && s.checkIn?.stage === "question") {
      await this.sendCheckInRequest().catch(() => {});
    }

    this.emit({ type: "connection", connected: true });
  }

  disconnect() {
    // Triggers handleDisconnect() via the GATT event; also safe if not connected.
    this.device?.gatt?.disconnect();
    this.handleDisconnect();
  }

  /** Push a route step (0–6) to the watch (used by caregiver-side controls). */
  async writeGpsProgress(step: number) {
    const clamped = Math.max(0, Math.min(6, Math.round(step)));
    const server = this.server;
    if (!server) return;
    const service = await server.getPrimaryService(WAYHOME_SERVICE_UUID);
    const gps = await service.getCharacteristic(GPS_UUID);
    await gps.writeValue(new Uint8Array([clamped]));
  }

  /**
   * Ask the watch to show "How are you feeling?" — fired when the caregiver
   * sends a check-in while a real watch is paired. No-op when unpaired.
   */
  async sendCheckInRequest() {
    const server = this.server;
    if (!server) return;
    const service = await server.getPrimaryService(WAYHOME_SERVICE_UUID);
    const companion = await service.getCharacteristic(COMPANION_UUID);
    await companion.writeValue(new Uint8Array([CMD_CHECKIN_REQUEST]));
  }

  subscribe(listener: (e: DeviceEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get connected() {
    return this.server !== null;
  }

  private async subscribeTo(
    characteristic: BluetoothRemoteGATTCharacteristic,
    mapper: (value: DataView) => DeviceEvent | null,
  ) {
    characteristic.addEventListener("characteristicvaluechanged", (event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (!target.value) return;
      const mapped = mapper(target.value);
      if (mapped) this.emit(mapped);
    });
    this.notifyTargets.push(characteristic);
    await characteristic.startNotifications();
  }

  private handleDisconnect() {
    if (!this.server) return;
    this.server = null;
    this.notifyTargets.forEach((c) => void c.stopNotifications().catch(() => {}));
    this.notifyTargets = [];
    this.emit({ type: "connection", connected: false });
  }

  private emit(e: DeviceEvent) {
    applyDeviceEvent(e);
    this.listeners.forEach((l) => l(e));
  }
}

// One adapter per page: keeps GATT state across mounts. DeviceConnect and the
// caregiver check-in button share this instance.
export const bleDevice = new BleDevice();
