import { beforeEach, expect, test, vi } from "vitest";
import { useStore } from "../src/store";
import { applyDeviceEvent, SimulatedDevice } from "../src/services/device";
import {
  BleDevice,
  attachmentEvent,
  batteryEvent,
  companionEvent,
  gpsEvent,
  wearEvent,
} from "../src/services/ble";

const state = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...useStore.getInitialState(), connected: false });
});

const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

// --- payload mappers ---

test("battery payload maps percent and ignores the no-battery marker", () => {
  expect(batteryEvent(view([86]))).toEqual({ type: "battery", percent: 86 });
  expect(batteryEvent(view([0]))).toEqual({ type: "battery", percent: 0 });
  expect(batteryEvent(view([0xff]))).toBeNull(); // watch: no battery detected
  expect(batteryEvent(view([]))).toBeNull();
});

test("gps payload maps the route step and clamps out-of-range values", () => {
  expect(gpsEvent(view([3]))).toEqual({ type: "gps", progress: 3 });
  expect(gpsEvent(view([9]))).toEqual({ type: "gps", progress: 6 });
  expect(gpsEvent(view([]))).toBeNull();
});

test("wear payload maps motion and preserves the other wear inputs", () => {
  useStore.setState({
    wearInputs: { fastener: "yes", contact: "yes", proximity: "no", motion: "no" },
  });
  expect(wearEvent(view([1]))).toEqual({
    type: "wear",
    inputs: { fastener: "yes", contact: "yes", proximity: "no", motion: "yes" },
  });
  expect(wearEvent(view([2]))).toMatchObject({
    inputs: { motion: "no" },
  });
  expect(wearEvent(view([0]))).toMatchObject({ inputs: { motion: "unknown" } });
});

test("attachment payload accepts the three kinds and rejects junk", () => {
  expect(attachmentEvent(view([...Buffer.from("pendant")]))).toEqual({
    type: "attachment",
    attachment: "pendant",
  });
  expect(attachmentEvent(view([...Buffer.from("clip")]))).toEqual({
    type: "attachment",
    attachment: "clip",
  });
  expect(attachmentEvent(view([...Buffer.from("necklace")]))).toBeNull();
});

test("companion payload maps check-in answers and ignores unknown codes", () => {
  expect(companionEvent(view([0x02]))).toEqual({
    type: "checkin_answer",
    answer: "okay",
  });
  expect(companionEvent(view([0x03]))).toEqual({
    type: "checkin_answer",
    answer: "help",
  });
  expect(companionEvent(view([0x04, 0x00]))).toEqual({
    type: "assistance",
    choice: "home",
  });
  expect(companionEvent(view([0x04, 0x01]))).toEqual({
    type: "assistance",
    choice: "family",
  });
  expect(companionEvent(view([0x04, 0x02]))).toEqual({
    type: "assistance",
    choice: "confused",
  });
  expect(companionEvent(view([0x04, 0x09]))).toBeNull(); // unknown choice
  expect(companionEvent(view([0x05]))).toEqual({ type: "checkin_back" });
  expect(companionEvent(view([0x01]))).toBeNull(); // web→watch direction
  expect(companionEvent(view([0x06]))).toEqual({ type: "go_home" });
  expect(companionEvent(view([0x07, 3]))).toEqual({
    type: "landmark_step",
    step: 3,
  });
  expect(companionEvent(view([0x07, 9]))).toEqual({
    type: "landmark_step",
    step: 6,
  }); // clamped
  expect(companionEvent(view([0x07]))).toBeNull(); // missing step byte
  expect(companionEvent(view([]))).toBeNull();
});

// --- event application (shared by both adapters) ---

test("applyDeviceEvent routes watch telemetry into the store", () => {
  applyDeviceEvent({ type: "battery", percent: 43 });
  expect(state().battery).toBe(43);
  applyDeviceEvent({ type: "battery", percent: 250 });
  expect(state().battery).toBe(100); // clamped, never rejects

  applyDeviceEvent({ type: "gps", progress: 4 });
  expect(state().position).toBe(4);

  applyDeviceEvent({ type: "attachment", attachment: "clip" });
  expect(state().attachment).toBe("clip");

  applyDeviceEvent({ type: "connection", connected: true });
  expect(state().connected).toBe(true);
});

test("an SOS from the watch latches the emergency state like the button does", () => {
  applyDeviceEvent({ type: "sos" });
  expect(state().mode).toBe("EMERGENCY_SIMULATED");
  expect(state().incident?.stage).toBe("active");
});

test("watch check-in answers resolve the same flow as the web wearer screen", () => {
  state().event("CHECK");
  expect(state().mode).toBe("CHECK_IN");

  applyDeviceEvent({ type: "checkin_answer", answer: "okay" });
  expect(state().checkIn?.stage).toBe("answered");
  expect(state().checkIn?.source).toBe("wearer");

  state().event("CHECK");
  applyDeviceEvent({ type: "checkin_answer", answer: "help" });
  expect(state().checkIn?.stage).toBe("help_options");

  // Guidance only advances for a connected, confidently-worn device.
  useStore.setState({
    connected: true,
    wearStatus: "likely_worn",
    signals: { ...state().signals, gpsConfidence: 0.9 },
  });
  applyDeviceEvent({ type: "assistance", choice: "home" });
  expect(state().mode).toBe("GUIDED_RETURN");

  state().event("CHECK");
  applyDeviceEvent({ type: "checkin_answer", answer: "help" });
  applyDeviceEvent({ type: "checkin_back" });
  expect(state().checkIn?.stage).toBe("question");
});

test("the watch's Help me home starts guided return and steps advance it", () => {
  // Guidance only starts for a connected, confidently-worn device.
  useStore.setState({
    connected: true,
    wearStatus: "likely_worn",
    signals: { ...state().signals, gpsConfidence: 0.9 },
  });

  applyDeviceEvent({ type: "go_home" });
  expect(state().mode).toBe("GUIDED_RETURN");
  expect(state().guideIndex).toBe(0);

  applyDeviceEvent({ type: "landmark_step", step: 1 });
  expect(state().guideIndex).toBe(1);
  expect(state().position).toBe(1);
});

test("a walked step outside guidance just moves the route marker", () => {
  useStore.setState({
    connected: true,
    wearStatus: "likely_worn",
    signals: { ...state().signals, gpsConfidence: 0.9 },
    position: 0,
  });

  applyDeviceEvent({ type: "landmark_step", step: 1 });
  expect(state().position).toBe(1);
  expect(state().mode).toBe("NORMAL");
});

// --- BleDevice against a fake Web Bluetooth stack ---

class FakeCharacteristic extends EventTarget {
  value: DataView | null = null;
  startNotifications = vi.fn(async () => this);
  stopNotifications = vi.fn(async () => this);
  writeValue = vi.fn(async () => undefined);
}

function installFakeBluetooth() {
  const chars = {
    battery: new FakeCharacteristic(),
    sos: new FakeCharacteristic(),
    gps: new FakeCharacteristic(),
    wear: new FakeCharacteristic(),
    attachment: new FakeCharacteristic(),
    companion: new FakeCharacteristic(),
  };
  const server = {
    connect: vi.fn(async () => server),
    disconnect: vi.fn(),
    getPrimaryService: vi.fn(async () => ({
      getCharacteristic: vi.fn(async (uuid: string) => {
        const map: Record<string, FakeCharacteristic> = {
          "5a9c1f2e-4a02-4c31-9a48-d1b7f30e6c21": chars.battery,
          "5a9c1f2e-4a03-4c31-9a48-d1b7f30e6c21": chars.sos,
          "5a9c1f2e-4a04-4c31-9a48-d1b7f30e6c21": chars.gps,
          "5a9c1f2e-4a05-4c31-9a48-d1b7f30e6c21": chars.wear,
          "5a9c1f2e-4a06-4c31-9a48-d1b7f30e6c21": chars.attachment,
          "5a9c1f2e-4a07-4c31-9a48-d1b7f30e6c21": chars.companion,
        };
        const found = map[uuid];
        if (!found) throw new Error("unknown characteristic " + uuid);
        return found;
      }),
    })),
  };
  const device = {
    gatt: server,
    addEventListener: vi.fn(),
  };
  const bluetooth = {
    requestDevice: vi.fn(async () => device),
  };
  vi.stubGlobal("navigator", { bluetooth });
  return { chars, server };
}

test("BleDevice connects, applies telemetry and reports disconnection", async () => {
  const { chars, server } = installFakeBluetooth();
  const ble = new BleDevice();
  const seen: string[] = [];
  ble.subscribe((e) => seen.push(e.type));

  expect(ble.mode).toBe("ble");
  await ble.connect();
  expect(state().connected).toBe(true);
  expect(server.connect).toHaveBeenCalled();

  // Watch pushes battery 64% and then a route step.
  chars.battery.value = view([64]);
  chars.battery.dispatchEvent(new Event("characteristicvaluechanged"));
  expect(state().battery).toBe(64);

  chars.gps.value = view([2]);
  chars.gps.dispatchEvent(new Event("characteristicvaluechanged"));
  expect(state().position).toBe(2);

  // SOS notification latches the emergency state.
  chars.sos.value = view([1]);
  chars.sos.dispatchEvent(new Event("characteristicvaluechanged"));
  expect(state().mode).toBe("EMERGENCY_SIMULATED");

  ble.disconnect();
  expect(state().connected).toBe(false);
  expect(seen).toContain("connection");
});

test("BleDevice refuses to connect where Web Bluetooth is missing", async () => {
  vi.stubGlobal("navigator", {});
  const ble = new BleDevice();
  await expect(ble.connect()).rejects.toThrow(/Web Bluetooth/);
});

test("the simulated adapter still emits through the shared mapping", async () => {
  const sim = new SimulatedDevice();
  await sim.connect();
  expect(state().connected).toBe(true);
  sim.emit({ type: "battery", percent: 12 });
  expect(state().battery).toBe(12);
  sim.disconnect();
  expect(state().connected).toBe(false);
});
