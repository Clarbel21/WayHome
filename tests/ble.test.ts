import { beforeEach, expect, test, vi } from "vitest";
import { initialLandmarks, useStore } from "../src/store";
import { applyDeviceEvent, SimulatedDevice } from "../src/services/device";
import {
  BleDevice,
  attachmentEvent,
  batteryEvent,
  companionEvent,
  gpsEvent,
  watchNames,
  watchScreenCode,
  watchStatePayload,
  wearEvent,
} from "../src/services/ble";

const state = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...useStore.getInitialState(), connected: false });
});

const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

test("taking the watch off mirrors a wear prompt without opening a family request", () => {
  useStore.setState({ connected: true });
  state().event("REMOVE");
  expect(state().mode).toBe("NORMAL");
  expect(state().familyRequest).toBeNull();
  expect(watchScreenCode(state())).toBe(8);
  state().event("SOS");
  expect(watchScreenCode(state())).toBe(4);
});

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
    wearInputs: {
      fastener: "yes",
      contact: "yes",
      proximity: "no",
      motion: "no",
    },
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

test("watchScreenCode maps every mirrored watch state", () => {
  const code = () => watchScreenCode(state());
  expect(code()).toBe(0); // NORMAL → home

  // An offline watch cannot receive a check-in (the request waits instead),
  // so the watch is connected here to mirror the question/answer screens.
  useStore.setState({ connected: true });
  state().event("CHECK");
  expect(code()).toBe(1); // question

  state().answerCheckIn("help");
  expect(code()).toBe(2); // help options

  // Keep a non-connection verification blocker so "okay" lands on the
  // acknowledged screen instead of clearing straight back to NORMAL.
  useStore.setState({ wearStatus: "unknown" });
  state().event("CHECK");
  state().answerCheckIn("okay");
  expect(code()).toBe(5); // answered/acknowledged

  useStore.setState({
    connected: true,
    wearStatus: "likely_worn",
    signals: { ...state().signals, gpsConfidence: 0.9 },
  });
  state().event("GUIDE");
  expect(code()).toBe(3); // guided route

  applyDeviceEvent({ type: "sos" });
  expect(code()).toBe(4); // emergency

  useStore.setState(useStore.getInitialState());
  state().event("LOST");
  expect(code()).toBe(6); // screens the watch has no buttons for
});

test("the paired watch receives mirror broadcasts on state changes", async () => {
  useStore.setState({ guideIndex: 2 });
  const { chars } = installFakeBluetooth();
  const ble = new BleDevice();
  await ble.connect();
  chars.watchState.writeValue.mockClear();

  applyDeviceEvent({ type: "sos" });
  await new Promise((r) => setTimeout(r, 0));
  expect(chars.watchState.writeValue).toHaveBeenCalled();
  const lastCall =
    chars.watchState.writeValue.mock.calls[
      chars.watchState.writeValue.mock.calls.length - 1
    ];
  // [screen code, route position, stop | turn << 4, ...name bytes]
  const bytes = Array.from(lastCall[0]) as number[];
  expect(bytes[0]).toBe(4);
  expect(bytes[2] & 0x0f).toBe(2); // landmark stop 2
  expect(bytes[2] >> 4).toBe(1); // stop 2 is a left turn on the shared route
  expect(lastCall[0].length).toBeGreaterThan(3);
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
    watchState: new FakeCharacteristic(),
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
          "5a9c1f2e-4a08-4c31-9a48-d1b7f30e6c21": chars.watchState,
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

test("watch 'Not yet' and 'I see it now' drive the same walk as the web watch", () => {
  expect(companionEvent(view([0x08]))).toEqual({ type: "landmark_missed" });
  expect(companionEvent(view([0x09]))).toEqual({ type: "landmark_seen_now" });
  useStore.setState({ landmarks: initialLandmarks, connected: true });
  state().chooseAssistance("home");
  expect(state().mode).toBe("GUIDED_RETURN");
  state().nextLandmark();
  const index = state().guideIndex;
  applyDeviceEvent({ type: "landmark_missed" });
  expect(state().mode).toBe("REORIENTATION");
  expect(watchScreenCode(state())).toBe(7);
  applyDeviceEvent({ type: "landmark_seen_now" });
  expect(state().mode).toBe("GUIDED_RETURN");
  expect(state().guideIndex).toBe(index + 1);
  expect(watchScreenCode(state())).toBe(3);
});

test("watch greeting names and landmark stop fit one 20-byte write", () => {
  expect(watchNames("Amy Tan", "Momo")).toBe("Amy|Momo");
  expect(watchNames("Alex", "")).toBe("Alex");
  const long = watchNames("Maximiliano Rodriguez", "Sproutington the Great");
  expect(long.length).toBeLessThanOrEqual(17);
  expect(long.startsWith("Maximilia|")).toBe(true);
  const payload = watchStatePayload(3, 2, 1, long);
  expect(payload.length).toBeLessThanOrEqual(20);
  expect([payload[0], payload[1], payload[2]]).toEqual([3, 2, 1]);
  expect(new TextDecoder().decode(payload.slice(3))).toBe(long);
  expect(watchNames("Zoë", "Momo|x")).toBe("Zo|Momox");
  // Turn rides in bits 4–5 of byte2: left = 1, right = 2.
  expect(watchStatePayload(3, 2, 1, "A", 1)[2]).toBe(0x11);
  expect(watchStatePayload(3, 2, 3, "A", 2)[2]).toBe(0x23);
});

test("two quick store updates both reach the watch (Not yet → missed screen)", async () => {
  const { chars } = installFakeBluetooth();
  const ble = new BleDevice();
  await ble.connect();
  useStore.setState({ ...useStore.getInitialState(), connected: true });
  applyDeviceEvent({ type: "go_home" });
  expect(state().mode).toBe("GUIDED_RETURN");
  await new Promise((r) => setTimeout(r, 0));
  chars.watchState.writeValue.mockClear();
  // "Not yet" changes the mode, then sets the missed landmark right after.
  applyDeviceEvent({ type: "landmark_missed" });
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  const calls = chars.watchState.writeValue.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  expect((calls[calls.length - 1][0] as Uint8Array)[0]).toBe(7);
});

test("I know my way (0x0a) ends guidance from the physical watch", () => {
  useStore.setState({ ...useStore.getInitialState(), connected: true });
  applyDeviceEvent({ type: "go_home" });
  expect(state().mode).toBe("GUIDED_RETURN");
  const ev = companionEvent(view([0x0a]));
  expect(ev).toEqual({ type: "know_my_way" });
  applyDeviceEvent(ev!);
  expect(state().mode).toBe("NORMAL");
});
