import { test, expect, type Page } from "@playwright/test";

const modes = ["Normal", "Focus", "Dialogue"] as const;
async function selectMode(page: Page, mode: string) {
  await page
    .locator(".phone-mode-dock")
    .getByRole("button", { name: new RegExp(`^${mode}:`) })
    .click();
  await expect(page.locator(".watch-area")).toHaveClass(
    new RegExp(`experience-${mode.toLowerCase()}`),
  );
}
async function fresh(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

for (const width of [1440, 390, 320]) {
  test(`three distinct modes fit the fixed watch at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fresh(page);
    const watch = page.locator(".watch");
    const size = await watch.boundingBox();
    for (const mode of modes) {
      await selectMode(page, mode);
      const home = watch.locator(`.mode-home-${mode.toLowerCase()}`);
      await expect(home).toBeVisible();
      await expect(
        home.getByRole("img", { name: /Sprout looks/ }),
      ).toBeVisible();
      const buttons = home.locator(
        ".watch-picture-card, .watch-focus-primary, .watch-more-button",
      );
      await expect(buttons).toHaveCount(2);
      if (mode === "Focus")
        await expect(
          home.getByRole("button", { name: "Help me home", exact: true }),
        ).toBeVisible();
      if (mode === "Dialogue")
        await expect(home.locator(".watch-dialogue-bubble")).toHaveText(
          "What would you like to do?",
        );
      if (mode === "Normal")
        await expect(home.getByRole("heading")).toHaveText("Hello, Alex.");
      await watch.scrollIntoViewIfNeeded();
      expect(
        await watch
          .locator(".wos-body")
          .evaluate((el) => el.scrollHeight - el.clientHeight),
      ).toBeLessThanOrEqual(2);
      const body = (await watch.locator(".wos-body").boundingBox())!;
      const mascot = (await home.locator(".mascot-touch").boundingBox())!;
      expect(mascot.y).toBeGreaterThanOrEqual(body.y);
      const footer = (await watch.locator(".wos-footer").boundingBox())!;
      for (const button of await buttons.all()) {
        const bounds = (await button.boundingBox())!;
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(footer.y + 1);
      }
      expect((await watch.boundingBox())!.height).toBe(size!.height);
      expect((await watch.boundingBox())!.width).toBe(size!.width);
      await page.locator(".watch-area").screenshot({
        path: test.info().outputPath(`${mode}-${width}.png`),
        animations: "disabled",
      });
    }
    await page.reload();
    await expect(watch.locator(".mode-home-dialogue")).toBeVisible();
  });
}

test("mode changes preserve requests, observations and SOS priority", async ({
  page,
}) => {
  await fresh(page);
  const watch = page.locator(".watch");
  await page
    .locator(".care-phone")
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  for (const mode of modes) {
    await selectMode(page, mode);
    await expect(
      watch.getByRole("button", { name: "I'm okay", exact: true }),
    ).toBeVisible();
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
    );
    expect(after.checkIn).toEqual(before.checkIn);
    expect(after.connected).toBe(before.connected);
    expect(after.wearStatus).toBe(before.wearStatus);
  }
  await watch
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .click();
  for (const mode of modes) {
    // The phone prioritizes SOS over its mode dock. Exercise a saved profile change.
    await page.evaluate(async (mode) => {
      const path = "/src/store.ts";
      const { useStore } = await import(path);
      useStore.getState().setExperienceMode(mode.toLowerCase(), "caregiver");
    }, mode);
    await expect(
      watch.getByText("Help request sent — simulation", { exact: true }),
    ).toBeVisible();
    await expect(watch.locator(".watch-status .sprout-css")).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.mode,
      ),
    ).toBe("EMERGENCY_SIMULATED");
  }
});

test("focus and dialogue actions work and switching returns to the selected start layout", async ({
  page,
}) => {
  await fresh(page);
  const watch = page.locator(".watch");
  await selectMode(page, "Focus");
  await watch
    .getByRole("button", { name: "More choices", exact: true })
    .click();
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  await expect(watch.locator(".wos-memories")).toBeVisible();
  await selectMode(page, "Dialogue");
  await expect(watch.locator(".mode-home-dialogue")).toBeVisible();
  await watch
    .getByRole("button", { name: "I'd like some help", exact: true })
    .click();
  await expect(watch.locator(".watch-help-home .sprout-css")).toBeVisible();
  await watch.getByRole("button", { name: "Call Jamie", exact: true }).click();
  await selectMode(page, "Focus");
  await expect(watch.locator(".wos-handover")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("wayhome-v1")!).state.familyRequest
          .status,
    ),
  ).toBe("waiting");
});

test("offline acknowledgment and review keep full-sized actions reachable", async ({
  page,
}) => {
  await fresh(page);
  await page.evaluate(async () => {
    const path = "/src/store.ts";
    const { useStore } = await import(path);
    useStore.getState().event("DISCONNECT");
    useStore.getState().answerCheckIn("okay");
  });
  const watch = page.locator(".watch");
  await expect(watch.locator(".watch-thanks")).toBeVisible();
  const action = watch.locator(".watch-thanks .watch-action");
  await action.scrollIntoViewIfNeeded();
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page.locator(".watch-area").screenshot({
    path: test.info().outputPath("acknowledgment.png"),
    animations: "disabled",
  });
  await watch
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await expect(
    watch.getByText("Your caregiver needs to check the watch.", {
      exact: true,
    }),
  ).toBeVisible();
  await selectMode(page, "Dialogue");
  await expect(watch.locator(".watch-thanks")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.connected,
    ),
  ).toBe(false);
});
