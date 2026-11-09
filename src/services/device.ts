import { type WearInputs, type Attachment } from "./safety";
import { useStore } from "../store";
export type DeviceEvent =
  | { type: "gps"; progress: number }
  | { type: "sos" }
  | { type: "battery"; percent: number }
  | { type: "wear"; inputs: WearInputs }
  | { type: "attachment"; attachment: Attachment }
  | { type: "checkin_answer"; answer: "okay" | "help" }
  | { type: "assistance"; choice: "home" | "family" | "confused" }
  | { type: "checkin_back" }
  | { type: "go_home" }
  | { type: "landmark_step"; step: number }
  | { type: "connection"; connected: boolean };
export interface DeviceService {
  readonly mode: "simulated" | "ble";
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: (event: DeviceEvent) => void): () => void;
}
/**
 * Route a device event into the store. Both the simulated adapter below and
 * the ESP32-S3 BLE adapter (`./ble`) feed through this single mapping, which
 * keeps the persisted store (and the cross-tab companion/caregiver sync)
 * identical no matter where events originate.
 */
export function applyDeviceEvent(e: DeviceEvent) {
  const s = useStore.getState();
  if (e.type === "sos") s.event("SOS");
  if (e.type === "gps")
    useStore.setState({ position: Math.max(0, Math.min(6, e.progress)) });
  if (e.type === "battery")
    useStore.setState({ battery: Math.max(0, Math.min(100, e.percent)) });
  if (e.type === "attachment") s.setAttachment(e.attachment);
  if (e.type === "wear") s.observeWear(e.inputs);
  // Check-in answers from the physical watch resolve the same flow the web
  // wearer screen drives (source "wearer" appears in the caregiver timeline).
  if (e.type === "checkin_answer") s.answerCheckIn(e.answer);
  if (e.type === "assistance") s.chooseAssistance(e.choice);
  if (e.type === "checkin_back") s.returnToCheckIn();
  // "Help me home" on the watch starts guided return through the same
  // path as the web wearer's "Please guide me home" answer.
  if (e.type === "go_home") s.chooseAssistance("home");
  // A walked step advances recognition during guided return (respecting
  // the safety gates); outside guidance it just moves the route marker.
  if (e.type === "landmark_step") {
    if (useStore.getState().mode === "GUIDED_RETURN") s.nextLandmark();
    else s.move();
  }
  if (e.type === "connection") s.setConnection(e.connected);
}
// Default adapter for demos without paired hardware. The watch firmware
// lives in ../../firmware/wayhome-watch; BLE is intentionally opt-in.
export class SimulatedDevice implements DeviceService {
  readonly mode = "simulated" as const;
  private listeners = new Set<(e: DeviceEvent) => void>();
  async connect() {
    this.emit({ type: "connection", connected: true });
  }
  disconnect() {
    this.emit({ type: "connection", connected: false });
  }
  subscribe(listener: (e: DeviceEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit(e: DeviceEvent) {
    applyDeviceEvent(e);
    this.listeners.forEach((l) => l(e));
  }
}
export const device = new SimulatedDevice();
