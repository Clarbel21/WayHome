import { test, expect, type Page } from "@playwright/test";
import { showWatch, showCaregiver } from "./watch-helpers";
async function newStory(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Choose a demo story" })
    .getByRole("button", { name, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Start a new demo?",
    exact: true,
  });
  if (await dialog.isVisible())
    await dialog
      .getByRole("button", { name: "Start new demo", exact: true })
      .click();
}
for (const width of [1440, 390, 320]) {
  test(`walk, check-in and family stories finish through real controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/together");
    const watch = page.locator(".watch"),
      phone = page.locator(".care-phone");
    await expect(
      page.getByRole("heading", { name: "Help Alex get home", exact: true }),
    ).toBeVisible();
    const home = watch.getByRole("button", {
      name: "Help me home",
      exact: true,
    });
    await expect(home).toBeVisible();
    await home.click();
    for (let i = 0; i < 4; i++)
      await watch
        .getByRole("button", { name: "I see it", exact: true })
        .click();
    await expect(page.locator(".demo-instruction")).toContainText(
      "The demo journey is complete",
    );
    await newStory(page, "Check-in");
    await phone
      .getByRole("button", { name: "Send a check-in", exact: true })
      .click();
    if (width < 880) {
      await expect(
        page.getByRole("tab", { name: /^Caregiver/ }),
      ).toHaveAttribute("aria-selected", "true");
      await page
        .getByRole("button", { name: "Answer on the watch", exact: true })
        .click();
    }
    await watch.getByRole("button", { name: "I'm okay", exact: true }).click();
    await expect(page.locator(".demo-instruction")).toContainText(
      "The caregiver can see the recorded answer.",
    );
    await newStory(page, "Get help");
    await watch
      .getByRole("button", { name: "More choices", exact: true })
      .click();
    await watch
      .getByRole("button", { name: "Call Jamie", exact: true })
      .click();
    if (width < 880)
      await page
        .getByRole("button", { name: "See Jamie’s app", exact: true })
        .click();
    const card = phone.locator(".care-priority");
    await expect(card).toHaveAttribute("data-priority", "family-new");
    await expect(
      card.getByRole("button", {
        name: "Acknowledge family request",
        exact: true,
      }),
    ).toBeInViewport();
    await card
      .getByRole("button", { name: "Acknowledge family request", exact: true })
      .click();
    await expect(card).toHaveAttribute("data-priority", "family-reply");
    await card
      .getByRole("button", { name: "Simulate caregiver response", exact: true })
      .click();
    if (width < 880)
      await page
        .getByRole("button", { name: "Answer on the watch", exact: true })
        .click();
    await watch
      .getByRole("button", { name: "I'm ready to continue", exact: true })
      .click();
    await expect(page.locator(".demo-instruction")).toContainText(
      "the wearer has continued",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}
test("mobile SOS resumes after refresh and acknowledgment cannot resolve it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/#/together");
  await page
    .locator(".watch")
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "SOS demonstration", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Choose a demo story" })
      .getByRole("button", { name: "Walk home", exact: true }),
  ).toBeDisabled();
  await showCaregiver(page);
  await page
    .locator(".care-priority")
    .getByRole("button", { name: "Acknowledge SOS alert", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.mode,
    ),
  ).toBe("EMERGENCY_SIMULATED");
  await page
    .locator(".care-priority")
    .getByRole("button", { name: "Review and resolve SOS", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep SOS active", exact: true })
    .click();
  await page
    .locator(".care-priority")
    .getByRole("button", { name: "Review and resolve SOS", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Caregiver confirms — resolve SOS",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("wayhome-v1")!).state.incident.stage,
    ),
  ).toBe("resolved");
});
test("new-story confirmation preserves saved places and a newer SOS blocks its reset", async ({
  page,
}) => {
  await page.goto("/#/together");
  await page.evaluate(async () => {
    const url = "/src/store.ts";
    const { useStore } = await import(url);
    useStore.getState().settingsUpdate({ wearer: "Longer Demo Name" });
    useStore.getState().event("CHECK");
  });
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.landmarks,
  );
  await page
    .getByRole("navigation", { name: "Choose a demo story" })
    .getByRole("button", { name: "Get help", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Start a new demo?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.evaluate(async () => {
    const url = "/src/store.ts";
    const { useStore } = await import(url);
    useStore.getState().event("SOS");
  });
  await expect(
    dialog.getByRole("button", { name: "Start new demo", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Keep current demo", exact: true })
    .click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(after.mode).toBe("EMERGENCY_SIMULATED");
  expect(after.settings.wearer).toBe("Longer Demo Name");
  expect(after.landmarks).toEqual(before);
});

test("mobile device tabs support keyboard navigation and the SOS confirmation is localized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/together");
  const watchTab = page.getByRole("tab", { name: /^Watch/ });
  await watchTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /^Caregiver/ })).toBeFocused();
  await expect(page.locator(".caregiver-interface")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(watchTab).toBeFocused();
  await expect(page.locator(".watch")).toBeVisible();
  await page.getByRole("button", { name: "ID", exact: true }).click();
  await page.locator(".watch .sos-hold").click();
  await page.getByRole("tab").nth(1).click();
  await page
    .locator(".care-priority")
    .getByRole("button", { name: "Konfirmasi SOS", exact: true })
    .click();
  await page
    .locator(".care-priority")
    .getByRole("button", { name: "Tinjau dan selesaikan SOS", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Apakah bantuan sudah tiba",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Biarkan SOS aktif", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.mode,
    ),
  ).toBe("EMERGENCY_SIMULATED");
});

test("starting a new story pauses an unfinished memory activity and keeps its progress", async ({
  page,
}) => {
  await page.goto("/#/together");
  const watch = page.locator(".watch");
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  await watch
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-memory-v1")!).state.session,
  );
  await page
    .getByRole("navigation", { name: "Choose a demo story" })
    .getByRole("button", { name: "Check-in", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep current demo", exact: true })
    .click();
  await expect(watch.locator(".wos-memories")).toBeVisible();
  await newStory(page, "Check-in");
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-memory-v1")!).state.session,
  );
  expect(after.id).toBe(before.id);
  expect(after.paused).toBe(true);
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  await expect(
    watch.getByRole("button", { name: "Resume activity", exact: true }),
  ).toBeVisible();
});
