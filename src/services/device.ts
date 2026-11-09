import { type WearInputs, type Attachment } from "./safety";
import { useStore } from "../store";
export type DeviceEvent =
  | { type: "gps"; progress: number }
  | { type: "sos" }
  | { type: "battery"; percent: number }
  | { type: "wear"; inputs: WearInputs }
  | { type: "attachment"; attachment: Attachment }
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
