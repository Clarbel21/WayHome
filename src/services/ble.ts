import {
  type DeviceEvent,
  type DeviceService,
  applyDeviceEvent,
} from "./device";
import { type Attachment, type Observation, type WearInputs } from "./safety";
import { useStore, navigable } from "../store";
import { planRoute } from "../zone/route";
import { useZone } from "../zone/store";

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
const WATCH_STATE_UUID = "5a9c1f2e-4a08-4c31-9a48-d1b7f30e6c21";

const ATTACHMENTS: readonly Attachment[] = ["wristwatch", "pendant", "clip"];

// Companion-command codes (mirrors firmware ble_service.publishCheckIn docs).
const CMD_CHECKIN_REQUEST = 0x01; // web → watch: show "How are you feeling?"
const CMD_ANSWER_OKAY = 0x02; // watch → web
const CMD_ANSWER_HELP = 0x03; // watch → web
const CMD_ASSISTANCE = 0x04; // watch → web, byte1: 0 home, 1 family, 2 confused
const CMD_BACK_TO_QUESTION = 0x05; // watch → web
const CMD_GO_HOME = 0x06; // watch → web: "Help me home" pressed
const CMD_LANDMARK_STEP = 0x07; // watch → web, byte1: new step index 0–6
const CMD_LANDMARK_MISSED = 0x08; // watch → web: "Not yet" (landmark not seen)
const CMD_LANDMARK_SEEN_NOW = 0x09; // watch → web: "I see it now"
const CMD_KNOW_MY_WAY = 0x0a; // watch → web: "I know my way" (end guidance)
const CMD_CALL_CONTACT = 0x0b; // watch → web, byte1: family contact index
const ASSISTANCE_CHOICES = ["home", "family", "confused"] as const;

// Built-in landmark photos compiled into the ESP32, in initialLandmarks order.
// Must match WH_LANDMARK_COUNT in firmware/wayhome-watch/landmark_images.h.
export const WATCH_LANDMARK_COUNT = 4;

/**
 * Map the web watch's current state to the physical watch's mirror screen
 * (byte0 of the watch_state characteristic; firmware watch_ui.cpp applies it):
 * 0 home, 1 check-in question, 2 help options, 3 guided route, 4 emergency,
 * 5 acknowledged, 6 anything else (generic "check the app" screen),
 * 7 "Not yet" during guidance, 8 watch taken off.
 */
export function watchScreenCode(s: {
  mode: string;
  checkIn?: { stage?: string } | null;
  incident?: { stage: string } | null;
  missedLandmark?: unknown;
  connected?: boolean;
  wearStatus?: string;
  familyRequest?: { status: string; missedAt?: number } | null;
}): number {
  if (
    s.mode === "EMERGENCY_SIMULATED" ||
    (s.incident && s.incident.stage !== "resolved")
  )
    return 4;
  if (s.mode === "CHECK_IN") {
    if (s.checkIn?.stage === "help_options") return 2;
    if (s.checkIn?.stage === "question") return 1;
  }
  if (s.connected && s.wearStatus === "not_worn") return 8;
  if (s.mode === "CHECK_IN") return 5;
  if (s.mode === "GUIDED_RETURN") return 3;
  if (s.mode === "REORIENTATION" && s.missedLandmark) return 7;
  // Call lane C2: 17 ringing, 18 answered, 19 no answer (codes 9–16 are
  // reserved for the paused demo steps 10 and 11).
  if (s.mode === "CAREGIVER_HANDOVER" && s.familyRequest) {
    if (s.familyRequest.status === "responded") return 18;
    if (s.familyRequest.missedAt) return 19;
    return 17;
  }
  if (s.mode === "NORMAL") return 0;
  return 6;
}

/**
 * "Wearer|Companion" first names for the watch greeting ("Hi Amy! I'm Momo."),
 * ASCII only and at most 17 bytes so the whole payload fits one 20-byte write.
 */
export function watchNames(wearer: string, companion: string) {
  const ascii = (t: string) =>
    t.replace(/[^\x20-\x7e]/g, "").replace(/\|/g, "");
  const first = ascii(wearer.trim().split(/\s+/)[0] ?? "").slice(0, 9);
  const comp = ascii(companion.trim()).slice(0, 16 - first.length);
  return comp ? `${first}|${comp}` : first;
}

/**
 * byte0 screen code, byte1 route position, byte2 = landmark stop (bits 0–3)
 * + turn (bits 4–5: 0 straight, 1 left, 2 right) + contact being called
 * (bits 6–7: 0 none, 1 Jamie, 2 Sam, 3 Mei), bytes 3+ the names.
 * Three header bytes + 17 name bytes = 20 total.
 */
export function watchStatePayload(
  code: number,
  position: number,
  landmark: number,
  names: string,
  turn: number = 0,
  /** Call lane C2: 1-based family contact being called (0 = none). */
  contact: number = 0,
  /** Talk: wearer is outside the safe zone (byte0 bit 7). */
  outside = false,
) {
  const text = new TextEncoder().encode(names).slice(0, 17);
  const payload = new Uint8Array(3 + text.length);
  payload[0] = (code & 0x7f) | (outside ? 0x80 : 0);
  payload[1] = position;
  payload[2] =
    (landmark & 0x0f) | ((turn & 0x03) << 4) | ((contact & 0x03) << 6);
  payload.set(text, 3);
  return payload;
}

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
 * 0x02 okay, 0x03 help, 0x04 assistance (byte1), 0x05 back, 0x06 go home,
 * 0x07 landmark step (byte1 = new step index).
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
    case CMD_GO_HOME:
      return { type: "go_home" };
    case CMD_LANDMARK_MISSED:
      return { type: "landmark_missed" };
    case CMD_LANDMARK_SEEN_NOW:
      return { type: "landmark_seen_now" };
    case CMD_KNOW_MY_WAY:
      return { type: "know_my_way" };
    case CMD_CALL_CONTACT: {
      if (value.byteLength < 2) return null;
      return { type: "call_contact", index: value.getUint8(1) };
    }
    case CMD_LANDMARK_STEP: {
      if (value.byteLength < 2) return null;
      const step = value.getUint8(1);
      return { type: "landmark_step", step: Math.max(0, Math.min(6, step)) };
    }
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
  // Screen-mirror bookkeeping (see queueWatchState).
  private unsubscribeStore: (() => void) | null = null;
  private stateWriteQueued = false;
  // A store change that arrived while a write was in flight: send again after.
  private stateDirty = false;
  private lastSentTurn = -1;
  private lastSentContact = -1;
  private lastSentOutside: boolean | null = null;
  private lastSentCode = -1;
  private lastSentPosition = -1;
  private lastSentLandmark = -1;
  private lastSentNames = "";
  // Web Bluetooth allows one GATT operation at a time on many platforms
  // (Chrome on Windows/Android: "GATT operation already in progress"), so
  // every read/write/subscribe goes through this queue, in order.
  private gattQueue: Promise<unknown> = Promise.resolve();
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private gatt<T>(op: () => Promise<T>): Promise<T> {
    const run = this.gattQueue.then(op, op);
    this.gattQueue = run.catch(() => {});
    return run;
  }

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is unavailable — use Chrome or Edge (desktop or Android).",
      );
    }
    // Must be called from a user gesture. Match by service UUID or by the
    // advertised name, so the watch shows up even if a platform drops the
    // 128-bit UUID from the advertisement.
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [WAYHOME_SERVICE_UUID] },
        // `name` is a standard Web Bluetooth filter key; older typings omit it.
        { name: "Sprout Watch" } as BluetoothLEScanFilter,
      ],
      optionalServices: [WAYHOME_SERVICE_UUID],
    });
    device.addEventListener("gattserverdisconnected", () =>
      this.handleDisconnect(),
    );
    this.device = device;

    const server = await device.gatt!.connect();
    this.server = server;
    const service = await server.getPrimaryService(WAYHOME_SERVICE_UUID);
    // One characteristic at a time (see gatt()): parallel discovery and
    // startNotifications fail on several Chrome platforms.
    this.chars.clear();
    for (const uuid of [
      BATTERY_UUID,
      SOS_UUID,
      GPS_UUID,
      WEAR_MOTION_UUID,
      ATTACHMENT_UUID,
      COMPANION_UUID,
      WATCH_STATE_UUID,
    ])
      this.chars.set(uuid, await service.getCharacteristic(uuid));
    const c = (uuid: string) => this.chars.get(uuid)!;

    // The watch pushes a snapshot right after connect, so subscribing must
    // complete before we consider ourselves connected — otherwise the
    // snapshot notifications could beat our subscriptions.
    await this.subscribeTo(c(BATTERY_UUID), batteryEvent);
    await this.subscribeTo(c(SOS_UUID), () => ({ type: "sos" }));
    await this.subscribeTo(c(GPS_UUID), gpsEvent);
    await this.subscribeTo(c(WEAR_MOTION_UUID), wearEvent);
    await this.subscribeTo(c(ATTACHMENT_UUID), attachmentEvent);
    await this.subscribeTo(c(COMPANION_UUID), companionEvent);

    // Mirror of the watch's snapshot push: if a check-in is already waiting,
    // re-send it so the freshly connected watch shows the question too.
    const s = useStore.getState();
    if (s.mode === "CHECK_IN" && s.checkIn?.stage === "question") {
      await this.sendCheckInRequest().catch(() => {});
    }

    // Keep the AMOLED mirroring the web watch: broadcast screen changes.
    this.lastSentCode = -1;
    this.lastSentPosition = -1;
    this.lastSentLandmark = -1;
    this.lastSentTurn = -1;
    this.lastSentContact = -1;
    this.lastSentOutside = null;
    this.lastSentNames = "";
    const unsubMain = useStore.subscribe(() => this.queueWatchState());
    const unsubZone = useZone.subscribe(() => this.queueWatchState());
    this.unsubscribeStore = () => {
      unsubMain();
      unsubZone();
    };
    await this.sendWatchState().catch(() => {});

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
    const gps = this.chars.get(GPS_UUID);
    if (!this.server || !gps) return;
    await this.gatt(() => gps.writeValue(new Uint8Array([clamped])));
  }

  /**
   * Ask the watch to show "How are you feeling?" — fired when the caregiver
   * sends a check-in while a real watch is paired. No-op when unpaired.
   */
  async sendCheckInRequest() {
    if (useStore.getState().wearStatus === "not_worn") return;
    const companion = this.chars.get(COMPANION_UUID);
    if (!this.server || !companion) return;
    await this.gatt(() =>
      companion.writeValue(new Uint8Array([CMD_CHECKIN_REQUEST])),
    );
  }

  /**
   * Push the web watch's current screen, route position and landmark stop to
   * the paired watch, so the AMOLED mirrors the on-screen watch. Collapsed
   * writes: store bursts produce at most one in-flight write.
   */
  private queueWatchState() {
    // Never drop a change: one action often updates the store twice in a row
    // (e.g. "Not yet" sets the mode, then the missed landmark). Dropping the
    // second update left the watch on the wrong screen.
    if (this.stateWriteQueued) {
      this.stateDirty = true;
      return;
    }
    this.stateWriteQueued = true;
    void this.sendWatchState().finally(() => {
      this.stateWriteQueued = false;
      if (this.stateDirty) {
        this.stateDirty = false;
        this.queueWatchState();
      }
    });
  }

  private async sendWatchState() {
    // Let the current burst of store updates finish before reading state.
    await Promise.resolve();
    const watchState = this.chars.get(WATCH_STATE_UUID);
    if (!this.server || !watchState) return;
    const s = useStore.getState();
    const code = watchScreenCode(s);
    const position = Math.max(0, Math.min(6, Math.round(s.position)));
    // The web watch's photo is approved[guideIndex]; the physical watch only
    // carries the four built-in photos, so clamp custom-landmark indices.
    const landmark = Math.max(
      0,
      Math.min(WATCH_LANDMARK_COUNT - 1, Math.round(s.guideIndex)),
    );
    const names = watchNames(s.settings.wearer, s.settings.companionName);
    // Same turn the web watch shows ("Turn left" / "Turn right").
    const legs = s.landmarks.filter(navigable).length;
    const t = planRoute(legs).turns[s.guideIndex] ?? "straight";
    const turn = t === "left" ? 1 : t === "right" ? 2 : 0;
    // Who is being called (1-based, 0 = nobody) so the ESP32 shows the name.
    const contactId = s.familyRequest?.contactId;
    const contact = contactId
      ? Math.max(0, s.familyContacts.findIndex((c) => c.id === contactId) + 1)
      : 0;
    // Talk on the ESP32 asks "Shall I guide you home?" when outside.
    const outside = useZone.getState().active;
    if (
      outside === this.lastSentOutside &&
      contact === this.lastSentContact &&
      turn === this.lastSentTurn &&
      code === this.lastSentCode &&
      position === this.lastSentPosition &&
      landmark === this.lastSentLandmark &&
      names === this.lastSentNames
    )
      return;
    this.lastSentCode = code;
    this.lastSentPosition = position;
    this.lastSentLandmark = landmark;
    this.lastSentTurn = turn;
    this.lastSentContact = contact;
    this.lastSentOutside = outside;
    this.lastSentNames = names;
    await this.gatt(() =>
      watchState.writeValue(
        watchStatePayload(code, position, landmark, names, turn, contact, outside),
      ),
    );
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
    await this.gatt(() => characteristic.startNotifications());
  }

  private handleDisconnect() {
    if (!this.server) return;
    this.server = null;
    this.chars.clear();
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    this.notifyTargets.forEach(
      (c) => void c.stopNotifications().catch(() => {}),
    );
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
