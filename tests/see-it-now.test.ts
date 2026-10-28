import { beforeEach, describe, expect, it } from "vitest";
import { useStore, initialLandmarks } from "../src/store";
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  useStore.setState({ landmarks: initialLandmarks });
});
describe("I don't see it → I see it now", () => {
  it("resumes the walk at the same landmark and counts it as seen", () => {
    const s = useStore.getState();
    s.chooseAssistance("home");
    s.nextLandmark();
    expect(useStore.getState().guideIndex).toBe(1);
    const pos = useStore.getState().position;
    useStore.getState().chooseAssistance("unrecognized");
    let st = useStore.getState();
    expect(st.mode).toBe("REORIENTATION");
    expect(st.missedLandmark).toMatchObject({ index: 1, position: pos });
    st.seeItNow();
    st = useStore.getState();
    expect(st.mode).toBe("GUIDED_RETURN");
    expect(st.guideIndex).toBe(2);
    expect(st.missedLandmark).toBeNull();
    expect(st.alerts[0].title).toMatch(/wearer confirmed recognition/);
  });
  it("finishes the walk when the missed landmark was home", () => {
    const s = useStore.getState();
    s.chooseAssistance("home");
    const total = initialLandmarks.filter((l) => l.approved).length;
    for (let i = 0; i < total - 1; i++) useStore.getState().nextLandmark();
    useStore.getState().chooseAssistance("unrecognized");
    useStore.getState().seeItNow();
    expect(useStore.getState().mode).toBe("NORMAL");
    expect(useStore.getState().position).toBe(6);
  });
  it("is not offered after asking family for help or outside a guided walk", () => {
    const s = useStore.getState();
    s.chooseAssistance("confused");
    expect(useStore.getState().missedLandmark).toBeNull();
    s.chooseAssistance("home");
    useStore.getState().chooseAssistance("unrecognized");
    useStore.getState().chooseAssistance("family");
    expect(useStore.getState().missedLandmark).toBeNull();
    useStore.getState().seeItNow();
    expect(useStore.getState().mode).not.toBe("GUIDED_RETURN");
  });
});
