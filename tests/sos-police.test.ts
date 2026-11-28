import { expect, test } from "vitest";
import { applyDeviceEvent } from "../src/services/device";
import { useStore } from "../src/store";
import { nearestDemoPoliceStation } from "../src/zone/demoPolice";

test("a device SOS preserves the route point used to find the demo station", () => {
  useStore.setState({ ...useStore.getInitialState(), position: 3 });
  applyDeviceEvent({ type: "sos" });
  applyDeviceEvent({ type: "gps", progress: 6 });

  const state = useStore.getState();
  const alarm = state.alerts.find((alert) => alert.emergency?.kind === "sos");
  expect(state.mode).toBe("EMERGENCY_SIMULATED");
  expect(state.position).toBe(6);
  expect(alarm?.emergency?.routePosition).toBe(3);
  expect(nearestDemoPoliceStation(alarm!.emergency!.routePosition!).name).toBe(
    "Library District Police Station",
  );
});
