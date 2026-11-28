import { beforeEach, expect, test } from "vitest";
import { useStore, requestContact, initialFamily } from "../src/store";

const state = () => useStore.getState();
beforeEach(() => {
  useStore.setState({ ...useStore.getInitialState(), connected: true });
});

test("Call → pick a face asks that person", () => {
  state().callContact("sam");
  expect(state().mode).toBe("CAREGIVER_HANDOVER");
  expect(state().familyRequest?.contactId).toBe("sam");
  expect(requestContact(state())?.name).toBe("Sam");
});

test("unknown contact does nothing", () => {
  state().callContact("nobody");
  expect(state().familyRequest).toBeNull();
  expect(state().mode).toBe("NORMAL");
});

test("the default family list matches the ESP32 order", () => {
  expect(initialFamily.map((c) => c.name)).toEqual(["Jamie", "Sam", "Mei"]);
});
