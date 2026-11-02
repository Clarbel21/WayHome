import { beforeEach, describe, expect, it } from "vitest";
import { useCaregiverPopups } from "../src/services/caregiverPopup";

beforeEach(() => {
  useCaregiverPopups.getState().clear();
  localStorage.removeItem("wayhome-caregiver-popup-v1");
});

describe("caregiver phone popups", () => {
  it("shows a new wearer action and mirrors it for another tab", () => {
    useCaregiverPopups
      .getState()
      .notify("Alex used the watch", "Changed watch to Focus mode");

    const popup = useCaregiverPopups.getState().popups[0];
    expect(popup.title).toBe("Alex used the watch");
    expect(popup.detail).toBe("Changed watch to Focus mode");
    expect(popup.level).toBe("awareness");
    expect(popup.urgent).toBe(false);
    expect(
      JSON.parse(localStorage.getItem("wayhome-caregiver-popup-v1") ?? "{}").id,
    ).toBe(popup.id);
  });

  it("marks urgent actions and lets the caregiver dismiss them", () => {
    useCaregiverPopups
      .getState()
      .notify("SOS sent from the watch", "Urgent help requested", true);
    const popup = useCaregiverPopups.getState().popups[0];
    expect(popup.level).toBe("urgent");
    expect(popup.urgent).toBe(true);

    useCaregiverPopups.getState().dismiss(popup.id);
    expect(useCaregiverPopups.getState().popups).toHaveLength(0);
  });

  it("supports quiet routine updates without marking them urgent", () => {
    useCaregiverPopups
      .getState()
      .notify("Alex used the watch", "Opened memories", "routine");

    const popup = useCaregiverPopups.getState().popups[0];
    expect(popup.level).toBe("routine");
    expect(popup.urgent).toBe(false);
  });

  it("keeps only the three newest popups", () => {
    for (let index = 0; index < 5; index += 1)
      useCaregiverPopups.getState().notify("Action", `Action ${index}`);
    expect(useCaregiverPopups.getState().popups).toHaveLength(3);
    expect(useCaregiverPopups.getState().popups[0].detail).toBe("Action 4");
  });
});
