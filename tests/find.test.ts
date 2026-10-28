import { beforeEach, describe, expect, it } from "vitest";
import { useFind } from "../src/services/find";

beforeEach(() => {
  useFind.setState({ ringing: null });
  localStorage.removeItem("wayhome-find-v1");
});

describe("find my band", () => {
  it("rings from a caregiver request and stops from the wearable", () => {
    useFind.getState().start("Jamie Chen");
    const ringing = useFind.getState().ringing;
    expect(ringing?.by).toBe("Jamie Chen");
    expect(ringing?.requestedAt).toBeTypeOf("number");
    // The request is mirrored to localStorage so other same-origin tabs ring too.
    expect(JSON.parse(localStorage.getItem("wayhome-find-v1") ?? "{}").by).toBe(
      "Jamie Chen",
    );
    useFind.getState().stop();
    expect(useFind.getState().ringing).toBeNull();
    expect(localStorage.getItem("wayhome-find-v1")).toBeNull();
  });

  it("replaces an in-flight ring with the newest request", () => {
    useFind.getState().start("Jamie Chen");
    const first = useFind.getState().ringing?.id;
    useFind.getState().start("Morgan Chen");
    const second = useFind.getState().ringing;
    expect(second?.by).toBe("Morgan Chen");
    expect(second?.id).not.toBe(first);
  });

  it("can be stopped from the caregiver phone while it is ringing", () => {
    useFind.getState().start("Jamie Chen");
    expect(useFind.getState().ringing).not.toBeNull();
    useFind.getState().stop();
    expect(useFind.getState().ringing).toBeNull();
  });
});
